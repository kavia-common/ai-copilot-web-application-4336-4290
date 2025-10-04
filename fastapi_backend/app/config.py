import os
from functools import lru_cache
from typing import List, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load environment variables from .env if present
load_dotenv()


class Settings(BaseModel):
    """
    Application settings loaded from environment variables.
    """
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API Key")
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", description="OpenAI model to use")
    DB_URL: Optional[str] = Field(default=os.getenv("DB_URL"), description="Database URL")
    CORS_ORIGINS: Optional[str] = Field(default=os.getenv("CORS_ORIGINS", "http://localhost:3000"), description="Comma-separated list of CORS origins")
    PORT: Optional[int] = Field(default=int(os.getenv("PORT", "8000")), description="Port for local run (uvicorn)")

    class Config:
        extra = "ignore"


openapi_tags = [
    {"name": "System", "description": "System and health endpoints"},
    {"name": "Conversations", "description": "Manage conversations and messages"},
]


# PUBLIC_INTERFACE
@lru_cache
def get_settings() -> Settings:
    """Return application settings loaded from environment with caching."""
    return Settings(
        OPENAI_API_KEY=os.getenv("OPENAI_API_KEY"),
        OPENAI_MODEL=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        DB_URL=os.getenv("DB_URL"),
        CORS_ORIGINS=os.getenv("CORS_ORIGINS", "http://localhost:3000"),
        PORT=int(os.getenv("PORT", "8000")),
    )
