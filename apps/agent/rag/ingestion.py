from dataclasses import dataclass,field
from pathlib import Path


@dataclass
class Document:
    content: str
    source: str
    metadata: dict =  field(default_factory=dict)

def load_document(path: str) -> Document:
    file_path = Path(path)

    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    content = file_path.read_text(encoding="utf-8")

    return Document(
        content=content,
        source=str(file_path),
    )

def load_pdf(path: Path)-> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    return "\n\n".join(page.extract_text()) or  "" for page 