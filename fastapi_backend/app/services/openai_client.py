from typing import AsyncGenerator, Dict, List, Optional, Union

import asyncio
from openai import AsyncOpenAI

from ..config import get_settings


class OpenAIService:
    """
    Thin wrapper around OpenAI Chat Completions for both full and streaming responses.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not configured")
        self.client = AsyncOpenAI(api_key=self.api_key)

    # PUBLIC_INTERFACE
    async def complete(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> Union[str, AsyncGenerator[str, None]]:
        """
        Create a completion from messages.

        Parameters:
            messages: List of dicts like {"role": "user"|"assistant"|"system", "content": "..."}
            stream: If true, returns async generator of text deltas. Otherwise returns full text string.
            temperature: Sampling temperature.
            max_tokens: Optional max tokens.

        Returns:
            str (non-stream) or async generator yielding string chunks (stream).
        """
        if not stream:
            resp = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False,
            )
            text = resp.choices[0].message.content or ""
            return text

        async def gen() -> AsyncGenerator[str, None]:
            stream_resp = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in stream_resp:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    yield delta

        return gen()
