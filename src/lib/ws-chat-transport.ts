/**
 * WebSocketChatTransport — AI SDK ChatTransport that bridges our NATS
 * WebSocket event protocol to UIMessageChunk streams.
 *
 * This lets us use useChat() + AI Elements for rich rendering while
 * keeping our existing backend protocol unchanged.
 */

import type { ChatTransport, UIMessage, UIMessageChunk, ChatRequestOptions } from "ai";
import { api } from "./volund-api";

/** Events emitted by the Volund WebSocket (NATS bridge). */
interface NATSEvent {
  type: string;
  content?: string;
  tool_name?: string;
  args?: string;
  result?: string;
  is_error?: boolean;
  message?: string;
  fatal?: boolean;
  agent_id?: string;
  instance_id?: string;
  conv_id?: string;
  profile_type?: string;
  stop_reason?: string;
}

export class WebSocketChatTransport implements ChatTransport<UIMessage> {
  private conversationId: string;

  constructor(conversationId: string) {
    this.conversationId = conversationId;
  }

  async sendMessages(options: {
    trigger: "submit-message" | "regenerate-message";
    chatId: string;
    messageId: string | undefined;
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
  } & ChatRequestOptions): Promise<ReadableStream<UIMessageChunk>> {
    const lastMsg = options.messages[options.messages.length - 1];
    const userText =
      lastMsg?.role === "user"
        ? lastMsg.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("\n")
        : "";

    // Open WebSocket BEFORE sending HTTP to avoid missing events.
    const ws = new WebSocket(api.wsUrl(this.conversationId));
    const textPartId = crypto.randomUUID();
    let toolCounter = 0;

    const stream = new ReadableStream<UIMessageChunk>({
      start(controller) {
        let textOpen = false;
        let stepOpen = false;
        let closed = false;

        const closeStream = () => {
          if (closed) return;
          closed = true;
          // Ensure text and step are properly closed before finishing.
          if (textOpen) {
            controller.enqueue({ type: "text-end", id: textPartId });
            textOpen = false;
          }
          if (stepOpen) {
            controller.enqueue({ type: "finish-step" });
            stepOpen = false;
          }
          controller.enqueue({ type: "finish", finishReason: "stop" });
          controller.close();
        };

        ws.onmessage = (e) => {
          if (closed) return;
          const evt: NATSEvent = JSON.parse(e.data);

          switch (evt.type) {
            case "agent_start":
              controller.enqueue({ type: "start" });
              controller.enqueue({ type: "start-step" });
              stepOpen = true;
              controller.enqueue({ type: "text-start", id: textPartId });
              textOpen = true;
              break;

            case "delta":
              if (evt.content) {
                controller.enqueue({
                  type: "text-delta",
                  id: textPartId,
                  delta: evt.content,
                });
              }
              break;

            case "tool_start": {
              // Close text part before tool, reopen after.
              if (textOpen) {
                controller.enqueue({ type: "text-end", id: textPartId });
                textOpen = false;
              }
              const toolCallId = `tool-${++toolCounter}`;
              controller.enqueue({
                type: "tool-input-start",
                toolCallId,
                toolName: evt.tool_name ?? "unknown",
              });
              if (evt.args) {
                controller.enqueue({
                  type: "tool-input-delta",
                  toolCallId,
                  inputTextDelta: evt.args,
                });
              }
              controller.enqueue({
                type: "tool-input-available",
                toolCallId,
                toolName: evt.tool_name ?? "unknown",
                input: evt.args ? JSON.parse(evt.args) : {},
              });
              break;
            }

            case "tool_end": {
              const toolCallId = `tool-${toolCounter}`;
              if (evt.is_error) {
                controller.enqueue({
                  type: "tool-output-error",
                  toolCallId,
                  errorText: evt.result ?? "Tool error",
                });
              } else {
                controller.enqueue({
                  type: "tool-output-available",
                  toolCallId,
                  output: evt.result ?? "done",
                });
              }
              // Reopen text part for continued content.
              controller.enqueue({ type: "text-start", id: textPartId });
              textOpen = true;
              break;
            }

            case "turn_end":
              // Content is complete — close the stream immediately so the UI
              // stops showing the spinner. The backend's 2s follow-up wait
              // window (before agent_end) is invisible to the user.
              closeStream();
              ws.close();
              break;

            case "agent_end":
              // Normally we've already closed on turn_end, but handle the
              // case where turn_end was missed.
              closeStream();
              ws.close();
              break;

            case "error":
              controller.enqueue({
                type: "error",
                errorText: evt.message ?? "Unknown error",
              });
              if (!closed) {
                closed = true;
                controller.close();
              }
              ws.close();
              break;
          }
        };

        ws.onerror = () => {
          if (!closed) {
            controller.enqueue({
              type: "error",
              errorText: "WebSocket connection failed",
            });
            closed = true;
            controller.close();
          }
        };

        ws.onclose = () => {
          // If agent_end never arrived (e.g. server crash), close cleanly.
          if (!closed) {
            closeStream();
          }
        };

        // Send the HTTP message once WS is connected.
        ws.onopen = async () => {
          try {
            await api.sendMessage(
              options.chatId, // We use chatId as conversationId
              userText
            );
          } catch {
            controller.enqueue({
              type: "error",
              errorText: "Failed to send message",
            });
            controller.close();
            ws.close();
          }
        };
      },
      cancel() {
        ws.close();
      },
    });

    // Handle abort signal.
    if (options.abortSignal) {
      options.abortSignal.addEventListener("abort", () => ws.close(), {
        once: true,
      });
    }

    return stream;
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    // Reconnect to the WebSocket — useful when the connection drops mid-stream.
    const ws = new WebSocket(api.wsUrl(this.conversationId));
    const textPartId = crypto.randomUUID();
    let toolCounter = 0;

    return new Promise((resolve) => {
      const stream = new ReadableStream<UIMessageChunk>({
        start(controller) {
          let textOpen = false;
          let stepOpen = false;
          let closed = false;

          const closeStream = () => {
            if (closed) return;
            closed = true;
            if (textOpen) {
              controller.enqueue({ type: "text-end", id: textPartId });
              textOpen = false;
            }
            if (stepOpen) {
              controller.enqueue({ type: "finish-step" });
              stepOpen = false;
            }
            controller.enqueue({ type: "finish", finishReason: "stop" });
            controller.close();
          };

          ws.onopen = () => resolve(stream);

          ws.onmessage = (e) => {
            if (closed) return;
            const evt: NATSEvent = JSON.parse(e.data);
            switch (evt.type) {
              case "agent_start":
                controller.enqueue({ type: "start" });
                controller.enqueue({ type: "start-step" });
                stepOpen = true;
                controller.enqueue({ type: "text-start", id: textPartId });
                textOpen = true;
                break;
              case "delta":
                if (evt.content) {
                  controller.enqueue({ type: "text-delta", id: textPartId, delta: evt.content });
                }
                break;
              case "tool_start": {
                if (textOpen) {
                  controller.enqueue({ type: "text-end", id: textPartId });
                  textOpen = false;
                }
                const toolCallId = `tool-${++toolCounter}`;
                controller.enqueue({ type: "tool-input-start", toolCallId, toolName: evt.tool_name ?? "unknown" });
                if (evt.args) {
                  controller.enqueue({ type: "tool-input-delta", toolCallId, inputTextDelta: evt.args });
                }
                controller.enqueue({ type: "tool-input-available", toolCallId, toolName: evt.tool_name ?? "unknown", input: evt.args ? JSON.parse(evt.args) : {} });
                break;
              }
              case "tool_end": {
                const toolCallId = `tool-${toolCounter}`;
                if (evt.is_error) {
                  controller.enqueue({ type: "tool-output-error", toolCallId, errorText: evt.result ?? "Tool error" });
                } else {
                  controller.enqueue({ type: "tool-output-available", toolCallId, output: evt.result ?? "done" });
                }
                controller.enqueue({ type: "text-start", id: textPartId });
                textOpen = true;
                break;
              }
              case "turn_end":
                closeStream();
                ws.close();
                break;
              case "agent_end":
                closeStream();
                ws.close();
                break;
              case "error":
                controller.enqueue({ type: "error", errorText: evt.message ?? "Unknown error" });
                if (!closed) { closed = true; controller.close(); }
                ws.close();
                break;
            }
          };

          ws.onerror = () => {
            if (!closed) {
              controller.enqueue({ type: "error", errorText: "WebSocket reconnection failed" });
              closed = true;
              controller.close();
            }
            resolve(null as unknown as ReadableStream<UIMessageChunk>);
          };

          ws.onclose = () => {
            if (!closed) {
              closeStream();
            }
          };
        },
        cancel() {
          ws.close();
        },
      });

      // Timeout after 5s if WebSocket doesn't connect.
      setTimeout(() => resolve(null as unknown as ReadableStream<UIMessageChunk>), 5000);
    });
  }
}
