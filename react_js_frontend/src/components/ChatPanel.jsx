import React, { useState } from "react";

/**
 * PUBLIC_INTERFACE
 * ChatPanel displays messages and input area to send prompts, with streaming indicator.
 */
export default function ChatPanel({ messages = [], onSend, streaming, loading }) {
  /** Renders chat view and input form */
  const [value, setValue] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const content = value.trim();
    if (!content) return;
    setValue("");
    await onSend?.(content, { stream: true });
  };

  return (
    <section className="chat-panel" aria-label="Chat panel">
      <div className="messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty">
            <p>Start by asking a question. The AI will respond here.</p>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={m.id || idx}
              className={`message ${m.role === "user" ? "user" : "assistant"}`}
            >
              <div className="avatar" aria-hidden="true">
                {m.role === "user" ? "🧑" : "🤖"}
              </div>
              <div className="bubble">
                <p>{m.content}</p>
                {m.streaming && (
                  <span className="streaming" aria-label="Streaming in progress">
                    ▋
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        {(loading || streaming) && (
          <div className="status-row" role="status" aria-live="polite">
            {streaming ? "Generating..." : "Loading..."}
          </div>
        )}
      </div>

      <form className="input-row" onSubmit={submit} aria-label="Send message">
        <label htmlFor="chat-input" className="sr-only">
          Message input
        </label>
        <textarea
          id="chat-input"
          className="text-input"
          placeholder="Type your message..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          aria-label="Type your message"
        />
        <div className="input-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={streaming || loading}
            aria-disabled={streaming || loading}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
