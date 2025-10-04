# ai-copilot-web-application-4336-4290

Full-stack AI Copilot: React frontend + FastAPI backend with OpenAI integration.

## Structure

- react_js_frontend: React UI (Soft Mono minimalist theme)
- fastapi_backend: FastAPI service with conversations CRUD and chat with streaming (SSE)

## Quick Start (Local Dev)

Prereqs:
- Node 16+ and npm
- Python 3.9+
- OpenAI API key

1) Backend setup
- Copy env and set values:
  cp fastapi_backend/.env.example fastapi_backend/.env
  # edit .env to set OPENAI_API_KEY and optionally others

- Install and run:
  cd fastapi_backend
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000

- API docs:
  http://localhost:8000/docs

2) Frontend setup
- Copy env file (optional, only needed if backend is not same-origin):
  cp react_js_frontend/.env.example react_js_frontend/.env
  # In react_js_frontend/.env, set REACT_APP_BACKEND_URL=http://localhost:8000 if backend is on port 8000

- Install and run:
  cd react_js_frontend
  npm install
  npm start

- App URL:
  http://localhost:3000

## Configuration

Backend (.env in fastapi_backend):
- OPENAI_API_KEY (required)
- OPENAI_MODEL (optional; default: gpt-4o-mini)
- DB_URL (optional; default: sqlite:///./app.db)
- CORS_ORIGINS (optional; default: http://localhost:3000)
- PORT (optional; default: 8000)

Frontend (.env in react_js_frontend):
- REACT_APP_BACKEND_URL (optional)
  - Set to backend origin (e.g., http://localhost:8000) if frontend and backend are on different origins.
  - Leave unset to use same-origin.

CORS:
- The backend reads CORS_ORIGINS as a comma-separated list.
- Ensure it includes your frontend origin, e.g.:
  CORS_ORIGINS=http://localhost:3000

## Endpoints and Frontend Integration

Backend routes (mounted under /api):
- GET /api/conversations
- POST /api/conversations
- GET /api/conversations/{id}
- DELETE /api/conversations/{id}
- POST /api/conversations/{id}/messages
  - Request body: { "content": "text", "stream": true|false }
  - If stream=true: Response is text/event-stream with lines like "data: <chunk>" and ends with "data: [DONE]"
  - If stream=false: JSON response { "assistant_reply": "<full text>" }

Frontend client (src/api/client.js) matches these routes:
- Base URL: REACT_APP_BACKEND_URL or window.location.origin
- listConversations -> GET /api/conversations
- createConversation -> POST /api/conversations
- getConversation -> GET /api/conversations/{id}
- deleteConversation -> DELETE /api/conversations/{id}
- sendMessage -> POST /api/conversations/{id}/messages
  - Streaming supported via fetch ReadableStream parsing text/event-stream
  - Fallback to non-stream JSON when streaming is unavailable

## SSE Handling

- The backend emits "data: <token>\n\n" chunks and terminates with "data: [DONE]\n\n".
- The frontend stream parser:
  - Accept: text/event-stream
  - Accumulates chunks, splits by double-newline, reads "data:" lines
  - Calls onToken() per token, and onDone() when [DONE] is received
  - Falls back to non-stream JSON if resp.body is not a stream

## Notes and Assumptions

- OPENAI_API_KEY must be set in backend .env.
- For cross-origin dev (3000 -> 8000), set:
  - fastapi_backend/.env: CORS_ORIGINS=http://localhost:3000
  - react_js_frontend/.env: REACT_APP_BACKEND_URL=http://localhost:8000
- Database defaults to SQLite (app.db) created automatically.

## Troubleshooting

- CORS errors:
  - Ensure backend CORS_ORIGINS includes the exact frontend origin.
- 500 "OPENAI_API_KEY is not configured":
  - Set OPENAI_API_KEY in fastapi_backend/.env and restart backend.
- Streaming not working:
  - Check network tab for text/event-stream response.
  - If your environment (proxy/CDN) buffers SSE, the client will still work with non-stream (set stream=false as a workaround).

