import numpy as np

from .ingestion.chunking import Chunk
from .ingestion.embedding import Embedder


class Retriever:
    def __init__(self, embedder: Embedder):
        self.embedder = embedder

    def retrieve(self,query: str,chunks: list[Chunk],embeddings: list[list[float]],top_k: int = 3) -> list[Chunk]:
        # Convert query into an embedding
        query_embedding = self.embedder.embed([query])[0]

        # Convert to numpy arrays
        query_vector = np.array(query_embedding)
        chunk_vectors = np.array(embeddings)

        # Cosine similarity (assuming normalized embeddings)
        similarities = chunk_vectors @ query_vector

        # Get top-k highest scoring indices
        top_indices = np.argsort(similarities)[::-1][:top_k]

        # Return matching chunks
        return [chunks[i] for i in top_indices]