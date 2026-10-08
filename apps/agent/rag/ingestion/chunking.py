from dataclasses import dataclass

from ..ingestion import Document


@dataclass
class Chunk:
    content: str
    source: str
    chunk_index: int


SEPARATORS = ["\n\n", "\n", ". ", " "]


def split_text_recursively(text_to_split: str, remaining_separators: list[str], max_chars: int) -> list[str]:
    if len(text_to_split) <= max_chars:
        return [text_to_split]

    if not remaining_separators:
        return [
            text_to_split[start:start + max_chars]
            for start in range(0, len(text_to_split), max_chars)
        ]

    current_separator = remaining_separators[0]
    next_separators = remaining_separators[1:]

    finished_chunks = []
    current_chunk = ""

    for piece in text_to_split.split(current_separator):
        piece_with_separator = piece + current_separator

        if len(piece_with_separator) > max_chars:
            if current_chunk:
                finished_chunks.append(current_chunk)
                current_chunk = ""
            finished_chunks.extend(
                split_text_recursively(piece_with_separator, next_separators, max_chars)
            )
        elif len(current_chunk) + len(piece_with_separator) <= max_chars:
            current_chunk += piece_with_separator
        else:
            finished_chunks.append(current_chunk)
            current_chunk = piece_with_separator

    if current_chunk:
        finished_chunks.append(current_chunk)

    return finished_chunks


def chunk_document(document: Document,chunk_size: int = 500,overlap: int = 50,) -> list[Chunk]:
    split_limit = chunk_size - overlap - 1
    if split_limit <= 0:
        raise ValueError("overlap must be smaller than chunk_size")

    text_pieces = split_text_recursively(document.content, SEPARATORS, split_limit)
    cleaned_pieces = [piece.strip() for piece in text_pieces if piece.strip()]

    chunks = []
    for index, piece in enumerate(cleaned_pieces):
        if index > 0:
            piece = cleaned_pieces[index - 1][-overlap:] + " " + piece
        chunks.append(
            Chunk(
                content=piece,
                source=document.source,
                chunk_index=index,
            )
        )

    return chunks