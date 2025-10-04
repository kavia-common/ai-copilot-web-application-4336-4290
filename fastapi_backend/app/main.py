from typing import List

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings, openapi_tags
from .db import init_db
from . import models  # ensure models are imported for table creation
from .routers.chat import router as chat_router


def create_app() -> FastAPI:
    """
    Factory to create and configure the FastAPI application.
    - Loads settings from environment (.env supported via python-dotenv in db.py and config.py).
    - Initializes the database.
    - Registers middleware and routers.
    """
    settings: Settings = get_settings()

    app = FastAPI(
        title="AI Copilot Backend",
        description="FastAPI backend for the AI Copilot app with OpenAI integration.",
        version="0.1.0",
        openapi_tags=openapi_tags,
    )

    # CORS
    origins: List[str] = [o.strip() for o in (settings.CORS_ORIGINS or "").split(",") if o.strip()]
    # default include localhost frontend if not set
    if not origins:
        origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize DB (create tables if not exist)
    init_db(models)

    # Health endpoint
    @app.get("/health", tags=["System"], summary="Health check", description="Returns service health status.")
    def health() -> dict:
        """
        Health probe endpoint.

        Returns:
            JSON object with {"status": "ok"} when service is healthy.
        """
        return {"status": "ok"}

    # Mount API routers under /api
    app.include_router(chat_router, prefix="/api")

    return app


app = create_app()
