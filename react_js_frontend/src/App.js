import React, { useEffect, useState } from "react";
import "./App.css";
import "./index.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import useChat from "./hooks/useChat";

// PUBLIC_INTERFACE
function App() {
  /** Main app: header, sidebar, chat panel with minimalist Soft Mono theme */
  const [theme, setTheme] = useState("light");
  const chat = useChat();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  return (
    <div className="app-root">
      <Header onToggleTheme={toggleTheme} currentTheme={theme} />
      <main className="layout" role="main">
        <Sidebar
          conversations={chat.conversations}
          activeId={chat.activeConversationId}
          onSelect={chat.selectConversation}
          onDelete={chat.removeConversation}
          onNew={() => chat.startConversation("New Conversation")}
        />
        <ChatPanel
          messages={chat.messages}
          onSend={chat.send}
          streaming={chat.streaming}
          loading={chat.loading}
        />
      </main>
    </div>
  );
}

export default App;
