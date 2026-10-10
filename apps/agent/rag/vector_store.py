import os
import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PointStruct,
    VectorParams,
)

class VectorStore:
    def __init__(self, collection:str = "docs",dim:int = 384):
        url = os.getenv("QDRANT_URL")
        if url:
            self.client = QdrantClient(url=url)
        else:
            self.client = QdrantClient(path="qdrant_data")
        self.collection  = collection

        if not self.client.collection_exists(collection):
            self.client.create_collection(
                collection_name = collection,
                vectors_config=VectorParams(size = dim, distance=Distance.COSINE)
            )

    def add( self, chunks, embeddings ) ->None:
        points = [
            PointStruct(
                id = str(uuid.uuid4()),
                vector = emb,
                payload={
                    "content":c.content,
                    "source":c.source,
                    "chunk_index": c.chunk_index,
                },
            )
                for c, emb in zip(chunks,embeddings)
        ]
        self.client.upsert(collection_name=self.collection,points =points)

    def search(self, query_embedding, top_k:int =3 ):
        result = self.client.query_points(
            collection_name = self.collection,
            query = query_embedding,
            limit = top_k
        )
        return [(p.payload or {}, p.score) for p in result.points]


    def delete_source(self, source: str) -> None:
        self.client.delete(
            collection_name=self.collection,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="source", match=MatchValue(value=source))]
                )
            ),
        )


            