import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { WebSocketChatTransport } from "@/lib/ws-chat-transport";
import { api } from "@/lib/volund-api";
import { Loader2 } from "lucide-react";

interface ChatViewProps {
  conversationId: string;
  onTitleGenerated?: (conversationId: string, title: string) => void;
}

export function ChatView({ conversationId, onTitleGenerated }: ChatViewProps) {
  const transport = useMemo(
    () => new WebSocketChatTransport(conversationId),
    [conversationId]
  );

  const { messages, status, error, sendMessage, setMessages } = useChat({
    id: conversationId,
    transport,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const titleGenerated = useRef(false);

  // Track whether the user has scrolled away from the bottom.
  const handleScroll = useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-slot='scroll-area-viewport']"
    ) as HTMLElement | null;
    if (!viewport) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    // Consider "near bottom" if within 120px of the end.
    userScrolledUp.current = scrollHeight - scrollTop - clientHeight > 120;
  }, []);

  // Auto-generate title from first user message after first assistant response.
  useEffect(() => {
    if (titleGenerated.current) return;
    if (status !== "ready") return;

    const userMsg = messages.find((m) => m.role === "user");
    const assistantMsg = messages.find((m) => m.role === "assistant");
    if (!userMsg || !assistantMsg) return;

    titleGenerated.current = true;
    const firstText = userMsg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .trim();

    if (!firstText) return;

    // Truncate to a clean title: first sentence or first 60 chars.
    const periodIdx = firstText.indexOf(".");
    const questionIdx = firstText.indexOf("?");
    const cutoff = [periodIdx, questionIdx].filter((i) => i > 0 && i < 60);
    const maxLen = cutoff.length > 0 ? Math.min(...cutoff) + 1 : Math.min(firstText.length, 60);
    let title = firstText.slice(0, maxLen).trim();
    if (title.length < firstText.length && !title.endsWith(".") && !title.endsWith("?")) {
      title += "...";
    }

    api.updateConversation(conversationId, title).then(() => {
      onTitleGenerated?.(conversationId, title);
    }).catch(() => { /* ignore */ });
  }, [status, messages, conversationId, onTitleGenerated]);

  // Reset title generation flag when conversation changes.
  useEffect(() => {
    titleGenerated.current = false;
  }, [conversationId]);

  // Load existing messages from the REST API on mount.
  useEffect(() => {
    setHistoryLoading(true);
    api
      .getConversation(conversationId)
      .then((convo) => {
        // If the conversation already has a custom title, skip auto-generation.
        if (convo.title && convo.title !== "New conversation") {
          titleGenerated.current = true;
        }
        if (convo.messages && convo.messages.length > 0) {
          setMessages(
            convo.messages.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              parts: extractParts(m.content),
              createdAt: new Date(m.created_at),
            }))
          );
        }
      })
      .catch(() => {
        // Ignore.
      })
      .finally(() => setHistoryLoading(false));
  }, [conversationId, setMessages]);

  const isStreaming = status === "streaming" || status === "submitted";

  // Attach scroll listener to the viewport.
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-slot='scroll-area-viewport']"
    ) as HTMLElement | null;
    if (!viewport) return;
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll: instant during streaming (no jank), smooth on new messages.
  useEffect(() => {
    if (userScrolledUp.current) return;
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-slot='scroll-area-viewport']"
    ) as HTMLElement | null;
    if (!viewport) return;

    if (isStreaming) {
      // Instant scroll during streaming — prevents the "jumping" effect.
      viewport.scrollTop = viewport.scrollHeight;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  const handleSend = async (text: string, files?: File[]) => {
    // Upload files first, then send message with attachment references.
    if (files && files.length > 0) {
      try {
        const attachments = await Promise.all(
          files.map((f) => api.uploadAttachment(conversationId, f))
        );
        // Build content blocks: text + attachment references.
        await api.sendMessage(conversationId, text, attachments);
        // Also send via WebSocket transport for streaming response.
        await sendMessage({ text });
      } catch {
        // Fall back to text-only if upload fails.
        if (text) await sendMessage({ text });
      }
    } else {
      await sendMessage({ text });
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollAreaRef} className="flex-1 min-h-0">
      <ScrollArea className="h-full px-4">
        {historyLoading && messages.length === 0 && (
          <div className="space-y-6 py-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!historyLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground py-20">
            <p>Send a message to start the conversation.</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming && msg.id === messages[messages.length - 1]?.id && msg.role === "assistant"} />
        ))}

        {isStreaming &&
          !messages.some((m) => m.role === "assistant" && m.id === messages[messages.length - 1]?.id) && (
            <div className="flex items-center gap-2 text-muted-foreground py-4 px-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Agent is thinking...</span>
            </div>
          )}

        {error && (
          <div className="text-sm text-destructive px-3 py-2">
            {error.message}
          </div>
        )}
        <div ref={bottomRef} />
      </ScrollArea>
      </div>

      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        placeholder={
          isStreaming ? "Agent is responding..." : "Send a message..."
        }
      />
    </div>
  );
}

function extractParts(
  content: Array<Record<string, unknown>> | string
): Array<{ type: "text"; text: string } | { type: string; [key: string]: unknown }> {
  if (typeof content === "string") {
    return [{ type: "text" as const, text: content }];
  }
  if (!Array.isArray(content)) {
    return [{ type: "text" as const, text: String(content) }];
  }

  const parts: Array<{ type: "text"; text: string } | { type: string; [key: string]: unknown }> = [];

  for (const block of content) {
    if (block.type === "attachment") {
      parts.push({
        type: "attachment",
        file_name: block.file_name,
        mime_type: block.mime_type,
        url: block.url,
        size: block.size,
        attachment_id: block.attachment_id,
      });
    } else if (block.type === "text") {
      const text = (block.text ?? "") as string;
      if (text) parts.push({ type: "text" as const, text });
    } else {
      // Unknown block type — render as text fallback.
      const text = (block.text ?? "") as string;
      if (text) parts.push({ type: "text" as const, text });
    }
  }

  if (parts.length === 0) {
    parts.push({ type: "text" as const, text: "" });
  }
  return parts;
}
