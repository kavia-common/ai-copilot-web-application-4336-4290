import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listConversations,
  createConversation,
  deleteConversation,
  getConversation,
  sendMessage as apiSendMessage,
} from "../api/client";

/**
 * PUBLIC_INTERFACE
 * useChat hook manages conversations, messages, and streaming state.
 */
export default function useChat() {
  /** Hook state */
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messagesById, setMessagesById] = useState({}); // { [id]: [{role, content}] }
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);

  // Refresh list of conversations
  const refreshConversations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listConversations();
      setConversations(Array.isArray(list) ? list : []);
      // If no active selected, pick most recent
      if (!activeConversationId && list && list.length > 0) {
        setActiveConversationId(list[0].id);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load conversations", e);
    } finally {
      setLoading(false);
    }
  }, [activeConversationId]);

  // Load initial conversations
  useEffect(() => {
    refreshConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when active changes
  useEffect(() => {
    async function loadMessages(id) {
      if (!id) return;
      setLoading(true);
      try {
        const conv = await getConversation(id);
        const msgs = conv?.messages ?? [];
        setMessagesById((prev) => ({ ...prev, [id]: msgs }));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to load conversation", e);
      } finally {
        setLoading(false);
      }
    }
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  const startConversation = useCallback(async (title) => {
    setLoading(true);
    try {
      const conv = await createConversation(title);
      setConversations((prev) => [conv, ...prev]);
      setMessagesById((prev) => ({ ...prev, [conv.id]: [] }));
      setActiveConversationId(conv.id);
      return conv.id;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to create conversation", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectConversation = useCallback((id) => {
    setActiveConversationId(id);
  }, []);

  const removeConversation = useCallback(async (id) => {
    setLoading(true);
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setMessagesById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeConversationId === id) {
        setActiveConversationId((prev) => {
          const remaining = conversations.filter((c) => c.id !== id);
          return remaining[0]?.id || null;
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete conversation", e);
    } finally {
      setLoading(false);
    }
  }, [activeConversationId, conversations]);

  const send = useCallback(
    async (content, { stream = true } = {}) => {
      const id = activeConversationId;
      if (!id) {
        // If no conversation, create one first
        const newId = await startConversation();
        if (!newId) return;
        return send(content, { stream });
      }

      // Add user message optimistically
      setMessagesById((prev) => {
        const msgs = prev[id] || [];
        return { ...prev, [id]: [...msgs, { role: "user", content, id: `user-${Date.now()}` }] };
      });

      if (stream) {
        setStreaming(true);
        let assistantBuffer = "";
        const assistantId = `assistant-${Date.now()}`;

        // Insert placeholder assistant message
        setMessagesById((prev) => {
          const msgs = prev[id] || [];
          return { ...prev, [id]: [...msgs, { role: "assistant", content: "", id: assistantId, streaming: true }] };
        });

        await apiSendMessage({
          id,
          content,
          stream: true,
          onToken: (token) => {
            assistantBuffer += token;
            setMessagesById((prev) => {
              const msgs = prev[id] || [];
              return {
                ...prev,
                [id]: msgs.map((m) => (m.id === assistantId ? { ...m, content: assistantBuffer } : m)),
              };
            });
          },
          onDone: () => {
            setStreaming(false);
            setMessagesById((prev) => {
              const msgs = prev[id] || [];
              return {
                ...prev,
                [id]: msgs.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
              };
            });
          },
          onError: (err) => {
            // eslint-disable-next-line no-console
            console.error("Stream error", err);
            setStreaming(false);
          },
        });
        return;
      }

      // Non-streaming path
      try {
        setLoading(true);
        const result = await apiSendMessage({ id, content, stream: false });
        const assistantText =
          typeof result === "string"
            ? result
            : result?.assistant_reply || result?.content || result?.message || "";
        setMessagesById((prev) => {
          const msgs = prev[id] || [];
          return {
            ...prev,
            [id]: [...msgs, { role: "assistant", content: assistantText, id: `assistant-${Date.now()}` }],
          };
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Send failed", e);
      } finally {
        setLoading(false);
      }
    },
    [activeConversationId, startConversation]
  );

  const value = useMemo(
    () => ({
      conversations,
      activeConversationId,
      messages: messagesById[activeConversationId] || [],
      loading,
      streaming,
      refreshConversations,
      startConversation,
      selectConversation,
      removeConversation,
      send,
    }),
    [
      conversations,
      activeConversationId,
      messagesById,
      loading,
      streaming,
      refreshConversations,
      startConversation,
      selectConversation,
      removeConversation,
      send,
    ]
  );

  return value;
}
