/**
 * Tool-specific rich renderers for agent tool call results.
 * Each renderer handles a specific tool type and produces structured UI
 * instead of raw JSON output.
 */

import { cn } from "@/lib/utils";
import {
  Code,
  Globe,
  Mail,
  Search,
  ExternalLink,
  Terminal,
  BookOpen,
  Brain,
  Clock,
} from "lucide-react";

// ── Code execution result ──────────────────────────────────────────────────

function CodeResultRenderer({ output, args }: { output: string; args?: string }) {
  let language = "text";
  if (args) {
    try {
      const parsed = JSON.parse(args);
      language = parsed.language ?? parsed.lang ?? "text";
    } catch {
      // ignore
    }
  }

  const lines = output.split("\n");
  const hasError = output.toLowerCase().includes("error") || output.toLowerCase().includes("traceback");

  return (
    <div className="space-y-2">
      {args && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Terminal className="h-3 w-3" />
          <span>{language}</span>
        </div>
      )}
      <pre
        className={cn(
          "text-xs whitespace-pre-wrap font-mono rounded-md px-3 py-2 max-h-64 overflow-auto",
          hasError
            ? "bg-destructive/10 text-destructive"
            : "bg-zinc-950 text-zinc-100 dark:bg-zinc-900"
        )}
      >
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="select-none text-zinc-600 w-8 text-right pr-3 shrink-0">
              {i + 1}
            </span>
            <span>{line}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

// ── Web search results ─────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

function WebSearchRenderer({ output }: { output: string }) {
  let results: SearchResult[] = [];
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      results = parsed;
    } else if (parsed.results && Array.isArray(parsed.results)) {
      results = parsed.results;
    }
  } catch {
    // Not structured — fall through to default
    return null;
  }

  if (results.length === 0) return null;

  return (
    <div className="space-y-2">
      {results.slice(0, 5).map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 rounded-md border border-border px-3 py-2 hover:bg-muted/50 transition-colors group"
        >
          <Globe className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {r.title}
            </p>
            {r.snippet && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {r.snippet}
              </p>
            )}
            <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
              {r.url}
            </p>
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5" />
        </a>
      ))}
    </div>
  );
}

// ── Memory retrieval ───────────────────────────────────────────────────────

function MemoryRenderer({ output }: { output: string }) {
  let memories: Array<{ content: string; similarity?: number }> = [];
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      memories = parsed;
    } else if (parsed.memories && Array.isArray(parsed.memories)) {
      memories = parsed.memories;
    }
  } catch {
    return null;
  }

  if (memories.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {memories.map((m, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-md bg-purple-500/5 border border-purple-500/20 px-3 py-2"
        >
          <Brain className="h-3.5 w-3.5 mt-0.5 text-purple-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground">{m.content}</p>
            {m.similarity != null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Relevance: {Math.round(m.similarity * 100)}%
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Task delegation ────────────────────────────────────────────────────────

function TaskDelegationRenderer({ output, args }: { output: string; args?: string }) {
  let taskInfo: { task_id?: string; status?: string; result?: string } = {};
  try {
    taskInfo = JSON.parse(output);
  } catch {
    return null;
  }

  const statusColor = taskInfo.status === "completed"
    ? "text-green-500"
    : taskInfo.status === "failed"
      ? "text-destructive"
      : "text-blue-500";

  return (
    <div className="rounded-md border border-border px-3 py-2 space-y-1">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">Delegated Task</span>
        {taskInfo.status && (
          <span className={cn("text-xs", statusColor)}>{taskInfo.status}</span>
        )}
      </div>
      {taskInfo.result && (
        <p className="text-xs text-muted-foreground mt-1">{taskInfo.result}</p>
      )}
    </div>
  );
}

// ── Web read result ───────────────────────────────────────────────────────

function WebReadRenderer({ output }: { output: string }) {
  // Handle plain-text error strings (not JSON).
  let data: { title?: string; url?: string; content?: string } = {};
  try {
    data = JSON.parse(output);
  } catch {
    // Non-JSON output — show as plain text (likely an error message from Jina).
    if (output && output.trim()) {
      return (
        <div className="space-y-2">
          <pre className="text-xs whitespace-pre-wrap font-mono rounded-md bg-muted px-3 py-2 max-h-64 overflow-auto text-muted-foreground">
            {output.length > 600 ? output.slice(0, 600) + "…" : output}
          </pre>
        </div>
      );
    }
    return null;
  }

  // Show title + URL even when content is empty.
  const hasContent = data.content && data.content.trim().length > 0;
  const preview = hasContent
    ? data.content!.length > 600
      ? data.content!.slice(0, 600) + "…"
      : data.content!
    : null;

  return (
    <div className="space-y-2">
      {data.title && (
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{data.title}</span>
        </div>
      )}
      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground/60 hover:text-primary truncate block"
        >
          {data.url}
        </a>
      )}
      {preview ? (
        <pre className="text-xs whitespace-pre-wrap font-mono rounded-md bg-zinc-950 text-zinc-100 dark:bg-zinc-900 px-3 py-2 max-h-64 overflow-auto">
          {preview}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground italic">No readable content extracted from this page.</p>
      )}
    </div>
  );
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Try to render a tool result using a specialized renderer.
 * Returns null if no specialized renderer matches — caller should fall back
 * to the default raw output display.
 */
export function renderToolOutput(
  toolName: string,
  output: unknown,
  args?: string
): React.ReactNode | null {
  if (output == null) return null;
  const outputStr = typeof output === "string" ? output : JSON.stringify(output, null, 2);

  // Match tool names to renderers.
  const name = toolName.toLowerCase();

  if (name.includes("run_code") || name.includes("execute") || name.includes("shell")) {
    return <CodeResultRenderer output={outputStr} args={args} />;
  }

  if (name.includes("web_search") || name === "search") {
    const rendered = <WebSearchRenderer output={outputStr} />;
    if (rendered) return rendered;
  }

  if (name === "web_read") {
    const rendered = <WebReadRenderer output={outputStr} />;
    if (rendered) return rendered;
  }

  if (name.includes("memory") || name.includes("retrieve") || name.includes("recall")) {
    const rendered = <MemoryRenderer output={outputStr} />;
    if (rendered) return rendered;
  }

  if (name.includes("create_task") || name.includes("get_task_result") || name.includes("delegate")) {
    const rendered = <TaskDelegationRenderer output={outputStr} args={args} />;
    if (rendered) return rendered;
  }

  // No specialized renderer matched.
  return null;
}

/**
 * Returns a display-friendly icon and label for a tool.
 */
export function toolMeta(toolName: string): { icon: React.ReactNode; label: string } {
  const name = toolName.toLowerCase();

  if (name.includes("run_code") || name.includes("execute") || name.includes("shell")) {
    return { icon: <Code className="h-3.5 w-3.5" />, label: "Code Execution" };
  }
  if (name.includes("email")) {
    const action = name.replace("email_", "");
    const label = "Email " + action.charAt(0).toUpperCase() + action.slice(1);
    return { icon: <Mail className="h-3.5 w-3.5" />, label };
  }
  if (name.includes("web_search") || name === "search") {
    return { icon: <Search className="h-3.5 w-3.5" />, label: "Web Search" };
  }
  if (name.includes("memory") || name.includes("retrieve") || name.includes("recall")) {
    return { icon: <Brain className="h-3.5 w-3.5" />, label: "Memory" };
  }
  if (name === "web_read") {
    return { icon: <Globe className="h-3.5 w-3.5" />, label: "Web Read" };
  }
  if (name.includes("read") || name.includes("file")) {
    return { icon: <BookOpen className="h-3.5 w-3.5" />, label: "File Read" };
  }
  if (name.includes("create_task") || name.includes("delegate")) {
    return { icon: <Clock className="h-3.5 w-3.5" />, label: "Task Delegation" };
  }

  return { icon: null, label: toolName };
}
