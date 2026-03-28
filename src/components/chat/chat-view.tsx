import { useEffect, useRef, useState, useMemo } from "react";
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
}

export function ChatView({ conversationId }: ChatViewProps) {
  const transport = useMemo(
    () => new WebSocketChatTransport(conversationId),
    [conversationId]
  );

  const { messages, status, error, sendMessage, setMessages } = useChat({
    id: conversationId,
    transport,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load existing messages from the REST API on mount.
  useEffect(() => {
    setHistoryLoading(true);
    api
      .getConversation(conversationId)
      .then((convo) => {
        if (convo.messages && convo.messages.length > 0) {
          setMessages(
            convo.messages.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              parts: [
                {
                  type: "text" as const,
                  text: extractText(m.content),
                },
              ],
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

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    await sendMessage({ text });
  };

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ScrollArea className="flex-1 px-4">
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
