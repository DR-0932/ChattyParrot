# File: apps/agent/test_store.py
from rag.ingestion.embedding import Embedder
from rag.ingestion.pipeline import ingest_file
from rag.vector_store import VectorStore

embedder = Embedder()
store = VectorStore()

chunks, embeddings = ingest_file("sample.pdf", embedder)
store.add(chunks, embeddings)

query = embedder.embed(["What programming languages does he know?"])[0]
for payload, score in store.search(query, top_k=3):
    print(f"{score:.2f}  {payload['content'][:100]}")