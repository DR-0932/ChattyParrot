# apps/agent/main.py

from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.routes.chat import chat_router
from api.routes.health import health_router
from api.routes.ingest import ingest_router
from apps.agent.rag.ingestion.embedding import Embedder
from rag.pipeline import RAGPipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.embedder = Embedder()
    app.state.pipeline = RAGPipeline(app.state.embedder)
    app.state.chunks = []
    app.state.embeddings = []
    yield
    del app.state.embedder


app = FastAPI(lifespan=lifespan)

app.include_router(chat_router)
app.include_router(health_router)
app.include_router(ingest_router)