import os
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from functools import lru_cache
from dotenv import load_dotenv

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

load_dotenv()

Messages = Sequence[ChatCompletionMessageParam]



@dataclass(frozen=True)
class LLMSettings:
    api_key: str
    base_url: str = "https://api.deepseek.com"
    model: str = "deepseek-v4-flash"
    timeout: float = 60.0
    max_retries: int = 3

    @classmethod
    def from_env(cls) -> "LLMSettings":
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise RuntimeError("DEEPSEEK_API_KEY is not set")
        return cls(
            api_key=api_key,
            base_url=os.getenv("LLM_BASE_URL", cls.base_url),
            model=os.getenv("LLM_MODEL", cls.model),
        )

@lru_cache
def get_settings() -> LLMSettings:
    return LLMSettings.from_env()


@lru_cache
def get_client() -> AsyncOpenAI:
    s = get_settings()
    return AsyncOpenAI(
        api_key=s.api_key,
        base_url=s.base_url,
        timeout=s.timeout,
        max_retries=s.max_retries,
    )

async def ask( messages:Messages ,*, model:str | None = None)->str:
    response =await get_client().chat.completions.create(
        model = model or get_settings().model,
        messages = messages
    )
    return response.choices[0].message.content or ""

async def stream(
    messages: Messages, *, model: str | None = None
) -> AsyncIterator[str]:
    async with await get_client().chat.completions.create(
        model=model or get_settings().model,
        messages=messages,
        stream=True,
    ) as response:
        async for part in response:
            if part.choices and (text := part.choices[0].delta.content):
                yield text
                

