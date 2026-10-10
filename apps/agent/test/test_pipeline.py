from rag.ingestion.embedding import Embedder
from rag.ingestion.pipeline import ingest_file

chunks,embeddings = ingest_file("sample.pdf",Embedder())
print(len(chunks),len(embeddings))
print(chunks[0].content[:1000])