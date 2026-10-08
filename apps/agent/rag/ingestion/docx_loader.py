import logging
import re
import unicodedata
from pathlib import Path
from zipfile import BadZipFile

from docx import Document as DocxDocument
from docx.opc.exceptions import PackageNotFoundError
from docx.oxml.ns import qn
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph

from ..models import Document

logger = logging.getLogger(__name__)

MIN_TOTAL_CHARS = 20


def _clean_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)           # fixes ligatures like ﬁ -> fi
    text = text.replace("\x00", "").replace("\xa0", " ")
    text = re.sub(r"\s*\n\s*", " ", text)                # line break inside a paragraph -> space
    text = re.sub(r"[ \t]+", " ", text)                  # collapse repeated spaces
    return text.strip()


def _iter_elements(container, parent):
    """Yield paragraphs and tables in the same order as in the file."""
    for child in container.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, parent)
        elif child.tag == qn("w:tbl"):
            yield Table(child, parent)
        elif child.tag == qn("w:sdt"):                   # content controls hide text inside
            content = child.find(qn("w:sdtContent"))
            if content is not None:
                yield from _iter_elements(content, parent)


def _style_name(paragraph: Paragraph) -> str:
    style = paragraph.style
    return (style.name or "") if style is not None else ""


def _heading_level(paragraph: Paragraph) -> int:
    name = _style_name(paragraph)
    if name == "Title":
        return 1
    match = re.match(r"Heading (\d)", name)
    return min(int(match.group(1)), 6) if match else 0


def _list_level(paragraph: Paragraph) -> int:
    properties = paragraph._p.pPr
    if properties is not None and properties.numPr is not None:
        level = properties.numPr.ilvl
        return (level.val if level is not None else 0) + 1
    return 1 if _style_name(paragraph).startswith("List") else 0


def _cell_text(cell: _Cell) -> str:
    parts = []
    for block in _iter_elements(cell._tc, cell):
        if isinstance(block, Paragraph):
            text = _clean_text(block.text)
        else:
            text = _table_text(block, row_separator="; ")   # nested table
        if text:
            parts.append(text)
    return " ".join(parts)


def _table_text(table: Table, row_separator: str = "\n") -> str:
    rows = []
    seen_cells = set()                                   # merged cells repeat, keep only once
    for row in table.rows:
        cells = []
        for cell in row.cells:
            if cell._tc in seen_cells:
                continue
            seen_cells.add(cell._tc)
            cells.append(_cell_text(cell))
        if any(cells):
            rows.append(" | ".join(cells))
    return row_separator.join(rows)


def load_docx(path: str | Path) -> Document:
    path = Path(path)

    if not path.is_file():
        raise FileNotFoundError(f"DOCX not found: {path}")
    if path.name.startswith("~$"):
        raise ValueError(f"This is a temporary Word lock file, not a document: {path}")
    if path.suffix.lower() == ".doc":
        raise ValueError(f"Old .doc format is not supported, save it as .docx first: {path}")
    if path.suffix.lower() != ".docx":
        raise ValueError(f"Not a DOCX file: {path}")

    try:
        docx_file = DocxDocument(str(path))
    except (PackageNotFoundError, BadZipFile, KeyError) as error:
        raise ValueError(f"Could not read DOCX (corrupt or password protected?): {path}") from error

    blocks = []  # (text, is_list_item)
    for index, block in enumerate(_iter_elements(docx_file.element.body, docx_file)):
        try:
            if isinstance(block, Paragraph):
                text = _clean_text(block.text)
                if not text:
                    continue
                heading = _heading_level(block)
                if heading:
                    blocks.append(("#" * heading + " " + text, False))
                    continue
                list_level = _list_level(block)
                if list_level:
                    blocks.append(("  " * (list_level - 1) + "- " + text, True))
                else:
                    blocks.append((text, False))
            else:
                text = _table_text(block)
                if text:
                    blocks.append((text, False))
        except Exception as error:   # one bad block should not kill the whole file
            logger.warning("Skipping block %d of %s: %s", index, path.name, error)

    # list items stay together, everything else is separated by a blank line
    parts = []
    for index, (text, is_list_item) in enumerate(blocks):
        if index:
            previous_is_list_item = blocks[index - 1][1]
            parts.append("\n" if is_list_item and previous_is_list_item else "\n\n")
        parts.append(text)
    content = "".join(parts)

    if len(content) < MIN_TOTAL_CHARS:
        raise ValueError(f"No extractable text in {path.name}. It may contain only images.")

    return Document(content=content, source=path.name)