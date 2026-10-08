from  .ingestion import load_document
from .ingestion.chunking import chunk_document
from .ingestion.embedding import Embedder
from .retrieval import Retriever


class RAGPipeline:
    def __init__(self, embedder: Embedder):
        self.embedder = embedder
        self.retriever = Retriever(embedder)

    def ingest(self, path: str):
        document = load_document(path)

        chunks = chunk_document(document)

        embeddings = self.embedder.embed(
            [chunk.content for chunk in chunks]
        )

        return chunks, embeddings

    def query(self,query: str,chunks,embeddings,top_k: int = 3):
        return self.retriever.retrieve(
            query=query,
            chunks=chunks,
            embeddings=embeddings,
            top_k=top_k,
        )