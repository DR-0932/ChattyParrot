# File: apps/agent/main.py
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from api.routes import router
from rag.ingestion.embedding import Embedder
from rag.vector_store import VectorStore

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.embedder = Embedder()
    app.state.store = VectorStore()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(router)  
