import React from "react";

/**
 * PUBLIC_INTERFACE
 * Header component: app title and subtle theme toggle placeholder
 */
export default function Header({ onToggleTheme, currentTheme = "light" }) {
  /** Renders top header with app title and an optional theme toggle button */
  return (
    <header
      className="app-header"
      role="banner"
      aria-label="Application header"
    >
      <div className="header-inner">
        <h1 className="brand">AI Copilot</h1>
        <div className="header-actions">
          <button
            type="button"
            className="btn-ghost"
            aria-label={`Switch to ${currentTheme === "light" ? "dark" : "light"} theme`}
            title="Theme toggle (placeholder)"
            onClick={onToggleTheme}
          >
            {currentTheme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </div>
    </header>
  );
}
