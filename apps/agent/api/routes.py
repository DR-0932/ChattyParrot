import asyncio
import shutil
import tempfile
import json


from pathlib import Path
from fastapi import APIRouter, HTTPException,Request,UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal
from orchestration.prompts import build_messages
from orchestration.llm import stream
from rag.ingestion.pipeline import ingest_file
from typing import cast

from openai.types.chat import ChatCompletionMessageParam
router = APIRouter()


@router.get("/health")
def health():
    return {"status":"ok"}

@router.post("/ingest")
async def ingest(file:UploadFile,request:Request):
    state = request.app.state
    filename = Path(file.filename or "upload").name

    with tempfile.TemporaryDirectory() as tmpdir:
        path=Path(tmpdir)/filename
        with path.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        try:
            chunks,embeddings= await asyncio.to_thread(
                ingest_file,path,state.embedder
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    await asyncio.to_thread(state.store.delete_source,filename)
    await asyncio.to_thread(state.store.add,chunks,embeddings)
    return {"source":filename,"chunks":len(chunks)}



# File: apps/agent/api/routes.py (add below /ingest)
class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    top_k: int = 3
    history: list[HistoryMessage] = []


def sse(data: dict | str) -> str:
    payload = data if isinstance(data, str) else json.dumps(data)
    return f"data: {payload}\n\n"


@router.post("/chat")
async def chat(body: ChatRequest, request: Request):
    state = request.app.state

    def retrieve():
        query = state.embedder.embed([body.message])[0]
        return state.store.search(query, top_k=body.top_k)

    hits = await asyncio.to_thread(retrieve)

    history = cast(
        list[ChatCompletionMessageParam],
        [{"role": m.role, "content": m.content} for m in body.history],
    )
    messages = build_messages(body.message, hits, history)

    async def event_stream():
        try:
            async for token in stream(messages):
                yield sse({"type": "token", "text": token})
        except Exception as e:
            yield sse({"type": "error", "message": str(e)})
        sources = [
            {
                "source": p["source"],
                "chunk_index": p["chunk_index"],
                "score": round(score, 3),
                "snippet": p["content"][:200],
            }
            for p, score in hits
        ]
        yield sse({"type": "sources", "sources": sources})
        yield sse("[DONE]")

    return StreamingResponse(event_stream(), media_type="text/event-stream")