import os # apps/agent/rag/generation.py

import os
from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from .ingestion.chunking import Chunk

MODEL = "deepseek-chat"

SYSTEM_PROMPT = (
    "You answer questions using only the provided context. "
    "If the context does not contain the answer, say you don't know. "
    "Do not use outside knowledge."
)

client = AsyncOpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)


async def stream_answer(question: str, chunks: list[Chunk]) -> AsyncIterator[str]:
    context = "\n\n---\n\n".join(chunk.content for chunk in chunks)

    stream = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system", 
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {question}",
            },
        ],
        stream=True,
    )

    async for event in stream:
        if event.choices and event.choices[0].delta.content:
            yield event.choices[0].delta.content