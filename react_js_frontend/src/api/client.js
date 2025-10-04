//
// Lightweight API client using fetch with optional streaming support for text/event-stream
//

/**
 * Get the backend base URL from env or fallback to same-origin.
 * PUBLIC_INTERFACE
 */
export function getBackendUrl() {
  /** Returns backend base URL for API calls. Reads REACT_APP_BACKEND_URL and falls back to window.location.origin. */
  const envUrl = process.env.REACT_APP_BACKEND_URL;
  if (envUrl && envUrl.trim().length > 0) return envUrl.trim().replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "";
}

/**
 * Basic JSON fetch helper with error handling
 */
async function jsonFetch(path, options = {}) {
  const base = getBackendUrl();
  const url = `${base}${path}`;
  const resp = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!resp.ok) {
    let message = `Request failed (${resp.status})`;
    try {
      const data = await resp.json();
      message = data?.message || data?.detail || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

/**
 * Attempt streaming via fetch ReadableStream for text/event-stream
 */
async function streamFetch(path, { method = "POST", body, headers = {}, onToken, onDone, onError }) {
  const base = getBackendUrl();
  const url = `${base}${path}`;

  try {
    const resp = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(text || `Stream request failed (${resp.status})`);
    }

    // If body is not readable stream, fallback to non-stream
    if (!resp.body || !resp.body.getReader) {
      const data = await resp.json().catch(() => null);
      if (data && onToken) {
        // If backend returns final message in one go
        const finalText = typeof data === "string" ? data : data?.content || data?.message || "";
        if (finalText) onToken(finalText);
      }
      if (onDone) onDone();
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    // Read stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse Server-Sent Events style lines
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        // Expect lines: event: message\n data: ...
        const lines = part.split("\n").map((l) => l.trim());
        const dataLines = lines.filter((l) => l.startsWith("data:")).map((l) => l.replace(/^data:\s?/, ""));
        for (const dl of dataLines) {
          if (dl === "[DONE]") {
            if (onDone) onDone();
            return;
          }
          try {
            // Try JSON first
            const obj = JSON.parse(dl);
            const token = obj?.delta ?? obj?.content ?? obj?.message ?? "";
            if (token && onToken) onToken(String(token));
          } catch {
            // Fallback to plain text token
            if (onToken) onToken(dl);
          }
        }
      }
    }

    // Flush remaining buffer if any
    if (buffer && onToken) {
      // Try JSON parse last buffer
      try {
        const obj = JSON.parse(buffer);
        const token = obj?.delta ?? obj?.content ?? obj?.message ?? "";
        if (token) onToken(String(token));
      } catch {
        onToken(buffer);
      }
    }
    if (onDone) onDone();
  } catch (err) {
    if (onError) onError(err);
    else throw err;
  }
}

/**
 * PUBLIC_INTERFACE
 * List conversations from backend.
 */
export async function listConversations() {
  /** Returns array of conversations: [{id, title, created_at}] */
  return jsonFetch("/api/conversations", { method: "GET" });
}

/**
 * PUBLIC_INTERFACE
 * Create conversation
 */
export async function createConversation(title) {
  /** Creates a new conversation with optional title and returns the created object. */
  return jsonFetch("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

/**
 * PUBLIC_INTERFACE
 * Delete a conversation by id
 */
export async function deleteConversation(id) {
  /** Deletes conversation by id. Returns null or status. */
  return jsonFetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * PUBLIC_INTERFACE
 * Get a single conversation including messages
 */
export async function getConversation(id) {
  /** Returns conversation object with messages: {id,title,messages:[{id,role,content,created_at}],...} */
  return jsonFetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}

/**
 * PUBLIC_INTERFACE
 * Send a message to a conversation.
 * If stream is true, uses streaming when supported, invoking onToken for partial output.
 */
export async function sendMessage({ id, content, stream = false, onToken, onDone, onError }) {
  /**
   * Sends a user message. For non-stream: returns {message, assistant_reply}
   * For stream: returns nothing; uses callbacks onToken/onDone to deliver partial tokens and completion.
   */
  const path = `/api/conversations/${encodeURIComponent(id)}/messages`;
  if (stream) {
    // Try streaming via fetch
    return streamFetch(path, {
      method: "POST",
      body: { content, stream: true },
      onToken,
      onDone,
      onError,
    });
  }
  // Fallback non-stream JSON request
  return jsonFetch(path, {
    method: "POST",
    body: JSON.stringify({ content, stream: false }),
  });
}
