/**
 * useVolundChat — React hook for streaming agent chat over WebSocket.
 *
 * This is a lightweight alternative to useChat that speaks our NATS event
 * protocol directly. We can migrate to AI SDK's ChatTransport later once
 * we need tool-call rendering and message parts.
 */

import { useState, useCallback, useRef } from "react";
import { api } from "./volund-api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

type Status = "idle" | "streaming" | "error";

interface StreamEvent {
  type: string;
  turn_id?: string;
  agent_id?: string;
  instance_id?: string;
  conv_id?: string;
  profile_type?: string;
  content?: string;
  tool_name?: string;
  args?: string;
  result?: string;
  is_error?: boolean;
  stop_reason?: string;
  message?: string;
  fatal?: boolean;
}

export function useVolundChat(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamBuf = useRef("");

  // Load existing messages from the API.
  const loadHistory = useCallback(async () => {
    if (!conversationId) return;
    try {
      const convo = await api.getConversation(conversationId);
      if (convo.messages) {
        setMessages(
          convo.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: extractText(m.content),
            createdAt: m.created_at,
          }))
        );
      }
    } catch {
      // Ignore — conversation may not have messages yet.
    }
  }, [conversationId]);

  // Send a message and stream the response.
  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !text.trim()) return;

      // Optimistically add the user message.
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Open WebSocket BEFORE sending the HTTP message so we don't miss events.
      const ws = new WebSocket(api.wsUrl(conversationId));
      wsRef.current = ws;
      streamBuf.current = "";
      setStatus("streaming");
      setError(null);

      // Placeholder for the assistant message.
      const assistantId = crypto.randomUUID();

      ws.onmessage = (e) => {
        const evt: StreamEvent = JSON.parse(e.data);

        switch (evt.type) {
          case "agent_start":
            // Add empty assistant message.
            setMessages((prev) => [
              ...prev,
              {
                id: assistantId,
                role: "assistant",
                content: "",
                isStreaming: true,
              },
            ]);
            break;

          case "delta":
            streamBuf.current += evt.content ?? "";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: streamBuf.current }
                  : m
              )
            );
            break;

          case "tool_start":
            streamBuf.current += `\n\n> **Tool:** ${evt.tool_name}\n`;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: streamBuf.current }
                  : m
              )
            );
            break;

          case "tool_end":
            streamBuf.current += `> **Result:** ${evt.result?.slice(0, 200) ?? "done"}\n\n`;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: streamBuf.current }
                  : m
              )
            );
            break;

          case "turn_end":
          case "agent_end":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isStreaming: false } : m
              )
            );
            if (evt.type === "agent_end") {
              setStatus("idle");
            }
            break;

          case "error":
            setError(evt.message ?? "Unknown error");
            setStatus("error");
            break;
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection failed");
        setStatus("error");
      };

      ws.onclose = () => {
        setStatus((prev) => (prev === "streaming" ? "idle" : prev));
        wsRef.current = null;
      };

      // Wait for WebSocket to connect, then send the HTTP message.
      ws.onopen = async () => {
        try {
          await api.sendMessage(conversationId, text);
        } catch {
          setError("Failed to send message");
          setStatus("error");
          ws.close();
        }
      };
    },
    [conversationId]
  );

  // Send a steering correction mid-stream.
  const steer = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "steer", content }));
    }
  }, []);

  return {
    messages,
    status,
    error,
    sendMessage,
    steer,
    loadHistory,
    setMessages,
  };
}

function extractText(
  content: Array<{ type?: string; text?: string }> | string
): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n");
  }
  return String(content);
}
