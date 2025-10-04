# AI Copilot Backend (FastAPI)

FastAPI backend for the AI Copilot app. Provides conversations CRUD and an OpenAI-powered chat endpoint with optional streaming via Server-Sent Events (SSE).

## Requirements

- Python 3.9+
- OpenAI API key

## Setup

1) Create and configure environment:

- Copy `.env.example` to `.env` and set values:
  - OPENAI_API_KEY (required for message endpoint)
  - OPENAI_MODEL (optional; default: gpt-4o-mini)
  - DB_URL (optional; default: sqlite:///./app.db)
  - CORS_ORIGINS (comma-separated; include your frontend origin(s), e.g., http://localhost:3000 and any hosted preview origin like https://<your-preview-host>:3000)
  - PORT (optional; default: 8000)

2) Install dependencies:

pip install -r requirements.txt

3) Run development server:

uvicorn app.main:app --reload --port ${PORT:-8000}

OpenAPI docs: http://localhost:8000/docs

## Endpoints

- GET /health
- GET /api/conversations
- POST /api/conversations { "title": "Optional title" }
- GET /api/conversations/{id}
- DELETE /api/conversations/{id}
- POST /api/conversations/{id}/messages
  - Body: { "content": "text", "stream": true|false }
  - If stream=true, response is `text/event-stream` yielding `data: <chunk>` lines and final `data: [DONE]`.
  - If stream=false, response is JSON: { "assistant_reply": "<full text>" }

## Notes

- Database is managed via SQLAlchemy; defaults to a local SQLite file app.db.
- Tables are auto-created on startup.
- Conversation title auto-populates from the first user prompt if not provided.
- CORS_ORIGINS must include your frontend origin when running on different hosts/ports.
- SSE requires clients/proxies that do not buffer streaming responses; otherwise use non-stream (stream=false).
