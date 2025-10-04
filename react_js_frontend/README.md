# AI Copilot Frontend (React)

Minimalist React UI for the AI Copilot app. Uses the Soft Mono theme and vanilla CSS, no extra dependencies.

## Environment

Copy `.env.example` to `.env` and set the backend URL if needed:

- REACT_APP_BACKEND_URL: Base URL of the FastAPI backend. If not set, the app will use the same origin as the frontend (window.location.origin).

Example:
REACT_APP_BACKEND_URL=http://localhost:8000

Notes:
- When frontend and backend run on different ports (e.g., 3000 and 8000), set REACT_APP_BACKEND_URL to the backend and ensure backend CORS allows http://localhost:3000.
- When deployed on the same origin, you can omit REACT_APP_BACKEND_URL.

## Available Scripts

In the project directory, you can run:

### npm start
Runs the app in development mode.
Open http://localhost:3000 to view it in your browser.

### npm test
Launches the test runner.

### npm run build
Builds the app for production to the build folder.

## How it works

- API client: src/api/client.js
  - getBackendUrl() reads REACT_APP_BACKEND_URL or falls back to same-origin.
  - Provides helpers: listConversations, createConversation, deleteConversation, getConversation, sendMessage (supports streaming via fetch when available, otherwise falls back to non-stream).
- Chat state hook: src/hooks/useChat.js
  - Manages conversations, active conversation, messages, and loading/streaming state.
- Components:
  - Header: src/components/Header.jsx
  - Sidebar: src/components/Sidebar.jsx
  - ChatPanel: src/components/ChatPanel.jsx
- App layout: src/App.js
  - Header, sidebar, and chat panel arranged in a responsive grid.

## Streaming (SSE)

- If `stream=true`, the frontend requests `text/event-stream` and progressively renders tokens as they arrive.
- If the environment doesn't support streaming (e.g., the response body isn't a ReadableStream), the client falls back to a single JSON response.

## Accessibility

- Semantic HTML elements and ARIA attributes are used for better screen reader support.
- High-contrast text and minimalistic UI for clarity.

## Theme

Soft Mono palette:
- primary #6B7280
- secondary #9CA3AF
- success #10B981
- error #EF4444
- background #F9FAFB
- surface #FFFFFF
- text #111827

Subtle gradient from-gray-50 to-gray-200 applied in the background.
