import asyncio
from orchestration.llm import ask
from orchestration.prompts import build_messages
from rag.ingestion.embedding import Embedder
from rag.vector_store import VectorStore

async def main():
    embedder = Embedder()
    store = VectorStore()

    question = "What is the captial of france"
    query = embedder.embed([question])[0]
    hits = store.search(query,top_k=3)

    answer = await ask(build_messages(question,hits))
    print(answer)

asyncio.run(main())