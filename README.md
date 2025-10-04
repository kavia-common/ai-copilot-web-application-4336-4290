# ai-copilot-web-application-4336-4290

Full-stack AI Copilot: React frontend + FastAPI backend with OpenAI integration.

## Structure

- react_js_frontend: React UI (Soft Mono minimalist theme)
- fastapi_backend: FastAPI service with conversations CRUD and chat with streaming

## Backend Setup

1) Copy environment file:

cp fastapi_backend/.env.example fastapi_backend/.env

Edit fastapi_backend/.env and set:
- OPENAI_API_KEY=your_key
- OPENAI_MODEL=gpt-4o-mini (optional)
- DB_URL=sqlite:///./app.db (or your DB)
- CORS_ORIGINS=http://localhost:3000

2) Install and run backend:

cd fastapi_backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

Open http://localhost:8000/docs to explore the API.

## Frontend Setup

In a separate terminal:

cd react_js_frontend
npm install
# Optional if backend is not same-origin:
# echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env
npm start

App will be at http://localhost:3000.

## How it connects

- Frontend calls the backend under /api:
  - GET /api/conversations
  - POST /api/conversations
  - GET /api/conversations/{id}
  - DELETE /api/conversations/{id}
  - POST /api/conversations/{id}/messages (supports streaming via SSE when `stream=true`)
- The frontend streaming client reads text/event-stream payloads and updates the UI progressively.

## Notes

- Ensure CORS_ORIGINS in backend .env includes the frontend origin (http://localhost:3000 for local dev).
- OPENAI_API_KEY must be set for the message endpoint to work.
