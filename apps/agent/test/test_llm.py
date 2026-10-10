# File: apps/agent/test_llm.py
import asyncio

from orchestration.llm import ask, stream


async def main():
    print(await ask([{"role": "user", "content": "Say hello in one short sentence."}]))

    async for token in stream([{"role": "user", "content": "Count from 1 to 5."}]):
        print(token, end="", flush=True)
    print()


asyncio.run(main())