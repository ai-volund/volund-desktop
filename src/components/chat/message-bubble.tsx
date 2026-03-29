import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  User,
  Loader2,
  Wrench,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import type { UIMessage } from "ai";
import { renderToolOutput, toolMeta } from "./tool-renderers";

interface MessageBubbleProps {
  message: UIMessage;
  isStreaming?: boolean;
}

function ToolCallBlock({ part }: { part: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const toolName = (part.toolName ?? part.toolCallId ?? "tool") as string;
  const state = part.state as string | undefined;
  const output = part.output;
  const args = part.args as string | undefined;
  const errorText = part.errorText as string | undefined;

  const isRunning = state === "input-streaming" || state === "call" || state === "partial-call";
  const isDone = state === "result";
  const isFailed = !!errorText;

  const statusColor = isFailed
    ? "border-destructive/30 bg-destructive/5"
    : isDone
      ? "border-green-500/30 bg-green-500/5"
      : isRunning
        ? "border-blue-500/30 bg-blue-500/5"
        : "border-border bg-muted/50";

  const hasDetails = output != null || errorText;
  const { icon: toolIcon, label: toolLabel } = toolMeta(toolName);

  // Try rich rendering for the output.
  const richOutput = isDone && output != null
    ? renderToolOutput(toolName, output, args)
    : null;

  return (
    <div className={cn("rounded-lg border text-sm", statusColor)}>
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 w-full text-left",
          hasDetails && "cursor-pointer hover:bg-muted/30 transition-colors"
        )}
      >
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
        ) : isFailed ? (
          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
        ) : isDone ? (
          <span className="text-green-500 shrink-0">
            {toolIcon ?? <CheckCircle2 className="h-3.5 w-3.5" />}
          </span>
        ) : (
          <span className="text-muted-foreground shrink-0">
            {toolIcon ?? <Wrench className="h-3.5 w-3.5" />}
          </span>
        )}
        <span className="font-medium text-foreground">{toolLabel}</span>
        {isRunning && (
          <span className="text-xs text-blue-500 animate-pulse">Running...</span>
        )}
        {isDone && !isFailed && !isRunning && (
          <span className="text-xs text-green-500/60">Done</span>
        )}
        {hasDetails && (
          <span className="ml-auto">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        )}
      </button>
      {expanded && hasDetails && (
        <div className="border-t px-3 py-2 space-y-1.5">
          {errorText && (
            <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">
              {errorText}
            </pre>
          )}
          {richOutput ?? (
            output != null && (
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-48 overflow-auto">
                {typeof output === "string"
                  ? output
                  : JSON.stringify(output, null, 2)}
              </pre>
            )
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentBlock({ part }: { part: Record<string, unknown> }) {
  const fileName = (part.file_name ?? part.fileName ?? "file") as string;
  const mimeType = (part.mime_type ?? part.mimeType ?? "") as string;
  const url = part.url as string | undefined;
  const size = part.size as number | undefined;
  const isImage = mimeType.startsWith("image/");

  const sizeLabel = size
    ? size >= 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(size / 1024)} KB`
    : "";

  return (
    <div className="rounded-lg border border-border bg-muted/50 overflow-hidden max-w-xs">
      {isImage && url && (
        <img
          src={url}
          alt={fileName}
          className="w-full max-h-48 object-cover"
        />
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        {isImage ? (
          <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          {sizeLabel && (
            <p className="text-xs text-muted-foreground">{sizeLabel}</p>
          )}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 hover:text-primary transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 py-4", isUser && "flex-row-reverse")}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex-1 space-y-2 overflow-hidden",
          isUser && "text-right"
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            if (!part.text) return null;
            return (
              <div
                key={i}
                className={cn(
                  "inline-block rounded-lg px-4 py-2 text-sm leading-relaxed",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{part.text}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-left [&_table]:text-xs [&_pre]:bg-background/50 [&_code]:text-[0.85em] [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
                    <Markdown remarkPlugins={[remarkGfm]}>{part.text}</Markdown>
                    {isStreaming && i === message.parts.length - 1 && (
                      <Loader2 className="inline-block h-3 w-3 animate-spin ml-1" />
                    )}
                  </div>
                )}
              </div>
            );
          }

          // Attachment parts
          if (part.type === "attachment" || part.type === "file") {
            return (
              <AttachmentBlock
                key={i}
                part={part as unknown as Record<string, unknown>}
              />
            );
          }

          // Tool parts — type starts with "tool-"
          if (part.type.startsWith("tool-")) {
            return (
              <ToolCallBlock
                key={i}
                part={part as unknown as Record<string, unknown>}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
