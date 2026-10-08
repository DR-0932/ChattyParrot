import logging
import re
import unicodedata
from collections import Counter
from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from ..ingestion import Document

logger = logging.getLogger(__name__)

MIN_CHARS_PER_PAGE =20

def _clean_page_text(text:str)->str:
    text = unicodedata.normalize("NFKC", text)        # fixes ligatures like ﬁ -> fi
    text = text.replace("\x00", "").replace("\xa0", " ")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)      # join words split by hyphen at line end
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)      # single newline -> space (keeps paragraphs)
    text = re.sub(r"[ \t]+", " ", text)               # collapse repeated spaces
    text = re.sub(r"\n{3,}", "\n\n", text)            # max one blank line
    return text.strip()


def _line_key(line:str)->str:
    return re.sub(r"\d+","#",line.strip().lower())

def _remove_repeated_lines(pages: list[str], min_ratio:float =0.5)-> list[str]:
    """remove headers/footer that repeat on at least half of the pages"""
    if len(pages)<3:
        return pages

    counts = Counter()
    for page in pages:
        keys = {_line_key(l) for l in page.split("\n") if 0 < len(l.strip())<100}
        counts.update(keys)

    repeated = {key for key, n in counts.items() if n/len(pages) >= min_ratio}

    cleaned_pages = []
    for page in pages:
        kept = [l for l in page.split("\n") if _line_key(l) not in repeated]
        cleaned_pages.append("\n".join(kept))
    return cleaned_pages

def load_pdf(path:str | Path , password:str | None = None)-> Document:
    path = Path(path)

    if not path.is_file():
        raise FileNotFoundError(f"PDF not found:{path}")
    if path.suffix.lower() !=".pdf":
        raise ValueError(f"Not a PDF file: {path}")

    try: 
        reader = PdfReader(path)
    except  PdfReadError as error:
        raise ValueError(f"Could not read PDF (corrupt?):{path}") from error

    if reader.is_encrypted:
        if not reader.decrypt(password or ""):
            raise ValueError(f"PDF is password protected:{path}")

    
    raw_pages = []
    for page_number, page in enumerate(reader.pages,start=1):
        try:
            raw_pages.append(page.extract_text() or "")
        except Exception as error:
            logger.warning("Skipping page %d of %s: %s",page_number,path.name,error)

    raw_pages = _remove_repeated_lines(raw_pages)
    pages = [_clean_page_text(p) for p in raw_pages]

    empty_pages = sum(1 for p in pages if len(p)< MIN_CHARS_PER_PAGE)
    
    if empty_pages == len(pages):
        raise ValueError(f"No extractable text in {path.name}. IT is probably scanned pdf")
    
    if empty_pages:
        logger.warning("%d of %d pages have no text in %s", empty_pages, len(pages),path.name)
    content = "\n\n".join(p for p in pages if p)
    return Document(content =content, source =path.name)