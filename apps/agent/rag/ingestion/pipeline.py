from pathlib import Path

from ..models import Document
from .chunking import Chunk,chunk_document
from .docx_loader import load_docx
from .pdfLoader import load_pdf
from .image_loader import load_image


LOADERS = {
    ".pdf":load_pdf,
    ".docx":load_docx,
    ".png":load_image,
    ".jpg":load_image,
    ".jpeg":load_image,
    ".webp":load_image
}

def load_file(path:str | Path)-> Document:
    suffix = Path(path).suffix.lower()
    loader = LOADERS.get(suffix)

    if loader is None:
        raise ValueError(f"Unsupported file type:{suffix}")
    return loader(path)


def ingest_file(path:str | Path, embedder)-> tuple[list[Chunk],list[list[float]]]:
    document = load_file(path)
    
    chunks = chunk_document(document)
    
    embeddings = embedder.embed([c.content for c in chunks])
    
    return chunks,embeddings