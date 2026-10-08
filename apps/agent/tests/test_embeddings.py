# apps/agent/try_pipeline.py

from apps.agent.rag.ingestion.embedding import Embedder
from rag.pipeline import RAGPipeline

pipeline = RAGPipeline(Embedder())

chunks, embeddings = pipeline.ingest("sample.txt")
print(f"Ingested {len(chunks)} chunks\n")

questions = [
    "What is FastAPI?",
    "How does RAG work?",
    "Which language is used for data science?",
]

for q in questions:
    print(f"Q: {q}")
    results = pipeline.query(q, chunks, embeddings, top_k=2)
    for i, chunk in enumerate(results):
        print(f"  [{i}] {chunk.content[:120]!r}")
    print()