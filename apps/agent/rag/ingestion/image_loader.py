import logging
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

import pytesseract
from PIL import Image, ImageOps, ImageSequence, UnidentifiedImageError
from pytesseract import Output, TesseractNotFoundError

from ..models import Document

logger  = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
MAX_FILE_MB = 25
MAX_PIXELS = 100_000_000      # protects against decompression bombs
MAX_FRAMES = 50               # for multi-page TIFF / animated GIF
MIN_SIDE = 1000               # upscale small images, OCR works best around 300 DPI
MAX_SIDE = 4000               # downscale huge images, keeps OCR fast
MIN_WORD_CONFIDENCE = 40      # drop words the OCR is unsure about (0-100)
LOW_CONFIDENCE_WARNING = 60
MIN_TOTAL_CHARS = 10

@lru_cache(maxsize=None)
def _check_tesseract(langugae:str)->None:
    try:
        installed = pytesseract.get_languages(config="")
    
    except TesseractNotFoundError as error:
    
        raise RuntimeError(
            "Tesseract is not installed or not on PATH. "
            "Install it, or set pytesseract.tesseract_cmd"
        ) from error
    
    missing= [lang for lang in langugae.split("+") if lang not in installed]
    
    if missing:
        raise ValueError(f"Terreseract language data missing:{missing}.Installed:{installed}")


def _clean_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\x00", "").replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _prepare_image(image:Image.Image)-> Image.Image:
    image = ImageOps.exif_transpose(image)

    if image.mode in ("RGBA","LA") or (image.mode == "P" and "Transparency" in image.info):
        rgba = image.convert("RGBA")
        background =Image.new("RGBA", rgba.size,(255,255,255,255))
        image = Image.alpha_composite(background,rgba)
   
    image = image.convert("L")
    image = ImageOps.autocontrast(image)

    width,height = image.size
   
    scale = 1.0
   
    if min(width,height) < MIN_SIDE:
        scale = MIN_SIDE/min(width,height)
   
    if max(width,height) * scale > MAX_SIDE:
        scale = MAX_SIDE / max(width, height)
   
    if scale != 1.0:
        image = image.resize((round(width*scale), round(height * scale)), Image.Resampling.LANCZOS)
    return image

def _ocr_image(image: Image.Image, language: str, timeout: int) -> tuple[str, float]:
    data = pytesseract.image_to_data(
        image,
        lang=language,
        config="--oem 3 --psm 3",
        output_type=Output.DICT,
        timeout=timeout,
    )

    lines: dict[tuple[int, int, int], list[str]] = {}
    confidences: list[float] = []

    for index, word in enumerate(data["text"]):
        word = word.strip()
        if not word:
            continue
        try:
            confidence = float(data["conf"][index])
        except (ValueError, TypeError):
            continue
        if confidence < MIN_WORD_CONFIDENCE:
            continue

        key = (data["block_num"][index], data["par_num"][index], data["line_num"][index])
        lines.setdefault(key, []).append(word)
        confidences.append(confidence)

    paragraphs: dict[tuple[int, int], list[str]] = {}
    for (block, paragraph, _line), words in lines.items():
        paragraphs.setdefault((block, paragraph), []).append(" ".join(words))

    text = "\n\n".join(" ".join(paragraph_lines) for paragraph_lines in paragraphs.values())
    average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    return text, average_confidence


def load_image(path: str | Path, language: str = "eng", timeout: int = 60) -> Document:
    path = Path(path)

    if not path.is_file():
        raise FileNotFoundError(f"Image not found: {path}")
    
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported image type {path.suffix!r}. Use one of {sorted(SUPPORTED_EXTENSIONS)}")
    
    if path.stat().st_size > MAX_FILE_MB * 1024 * 1024:
        raise ValueError(f"Image is larger than {MAX_FILE_MB} MB: {path}")

    _check_tesseract(language)

    try:
        with Image.open(path) as image:
            image.verify()
   
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as error:
        raise ValueError(f"Could not read image (corrupt or not an image?): {path}") from error

    page_texts: list[str] = []
    confidences: list[float] = []

    with Image.open(path) as image:
        if image.width * image.height > MAX_PIXELS:
            raise ValueError(f"Image has too many pixels ({image.width}x{image.height}): {path}")

        for frame_number, frame in enumerate(ImageSequence.Iterator(image), start=1):
            if frame_number > MAX_FRAMES:
                logger.warning("Only the first %d frames of %s were read", MAX_FRAMES, path.name)
                break
            
            try:
                prepared = _prepare_image(frame.copy())
                text, confidence = _ocr_image(prepared, language, timeout)
            
            except RuntimeError as error:     
                logger.warning("OCR failed on frame %d of %s: %s", frame_number, path.name, error)
                continue
            
            except Exception as error:        
                logger.warning("Skipping frame %d of %s: %s", frame_number, path.name, error)
                continue

            text = _clean_text(text)
            if text:
                page_texts.append(text)
                confidences.append(confidence)

    content = "\n\n".join(page_texts)

    if len(content) < MIN_TOTAL_CHARS:
        raise ValueError(
            f"No readable text found in {path.name}. It may be a photo or diagram without text."
        )

    average = sum(confidences) / len(confidences)
    if average < LOW_CONFIDENCE_WARNING:
        logger.warning("Low OCR confidence (%.0f/100) for %s, text may contain errors", average, path.name)

    return Document(content=content, source=path.name)