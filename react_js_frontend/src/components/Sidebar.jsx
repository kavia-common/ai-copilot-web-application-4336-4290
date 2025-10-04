import React from "react";

/**
 * PUBLIC_INTERFACE
 * Sidebar lists conversations and allows selection, deletion, and creating new ones.
 */
export default function Sidebar({
  conversations = [],
  activeId,
  onSelect,
  onDelete,
  onNew,
}) {
  /** Renders sidebar conversation list with actions */
  return (
    <aside className="sidebar" aria-label="Conversations">
      <div className="sidebar-header">
        <h2 className="sidebar-title">History</h2>
        <button
          className="btn-primary"
          type="button"
          onClick={() => onNew?.()}
          aria-label="Start new conversation"
        >
          + New
        </button>
      </div>

      <nav className="conversation-list" aria-label="Conversation list">
        {conversations.length === 0 && (
          <div className="empty">
            <p>No conversations yet.</p>
          </div>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`conversation-item ${activeId === c.id ? "active" : ""}`}
          >
            <button
              className="conversation-button"
              type="button"
              onClick={() => onSelect?.(c.id)}
              aria-current={activeId === c.id ? "page" : undefined}
              aria-label={`Open conversation ${c.title || c.id}`}
              title={c.title || c.id}
            >
              <span className="conversation-title">
                {c.title || "Untitled"}
              </span>
            </button>
            <button
              className="btn-icon"
              type="button"
              onClick={() => onDelete?.(c.id)}
              aria-label={`Delete conversation ${c.title || c.id}`}
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}
