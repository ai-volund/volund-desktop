import { useEffect, useState, useCallback } from "react";
import { api, type Task } from "@/lib/volund-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Ban,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: "Pending" },
  running: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10", label: "Running", spin: true },
  completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Completed" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Failed" },
  cancelled: { icon: Ban, color: "text-muted-foreground", bg: "bg-muted", label: "Cancelled" },
} as const;

function StatusBadge({ status }: { status: Task["status"] }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
      <Icon className={cn("h-3 w-3", "spin" in cfg && cfg.spin && "animate-spin")} />
      {cfg.label}
    </span>
  );
}

function TaskRow({ task, onCancel }: { task: Task; onCancel: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {task.agent_id ? `Agent ${task.agent_id.slice(0, 8)}` : "Unassigned"} &middot; {new Date(task.created_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Task ID:</span>{" "}
              <span className="font-mono">{task.id.slice(0, 8)}</span>
            </div>
            {task.conversation_id && (
              <div>
                <span className="text-muted-foreground">Conversation:</span>{" "}
                <span className="font-mono">{task.conversation_id.slice(0, 8)}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Updated:</span>{" "}
              {new Date(task.updated_at).toLocaleString()}
            </div>
            {task.completed_at && (
              <div>
                <span className="text-muted-foreground">Completed:</span>{" "}
                {new Date(task.completed_at).toLocaleString()}
              </div>
            )}
          </div>
          {task.result != null && (
            <div className="text-sm bg-muted rounded p-2">
              <p className="text-xs text-muted-foreground mb-1">Result</p>
              <p className="whitespace-pre-wrap">{typeof task.result === "string" ? task.result : JSON.stringify(task.result, null, 2)}</p>
            </div>
          )}
          {task.error && (
            <div className="text-sm bg-destructive/10 text-destructive rounded p-2">
              <p className="text-xs mb-1">Error</p>
              <p className="whitespace-pre-wrap">{task.error}</p>
            </div>
          )}
          {(task.status === "pending" || task.status === "running") && (
            <Button variant="outline" size="sm" onClick={() => onCancel(task.id)}>
              <Ban className="h-3.5 w-3.5 mr-1.5" /> Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Task["status"] | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await api.listTasks());
    } catch {
      // Ignore — API may not have tasks endpoint yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    try {
      await api.cancelTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "cancelled" as const } : t)));
    } catch {
      // Ignore
    }
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const counts = {
    all: tasks.length,
    running: tasks.filter((t) => t.status === "running").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };

  return (
    <main className="flex-1 flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Monitor agent tasks and async jobs</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {(["running", "pending", "completed", "failed"] as const).map((s) => {
          const cfg = statusConfig[s];
          const Icon = cfg.icon;
          return (
            <Card key={s} className="cursor-pointer hover:ring-1 hover:ring-ring transition-shadow" onClick={() => setFilter(s)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {cfg.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", cfg.color, "spin" in cfg && cfg.spin && counts[s] > 0 && "animate-spin")} />
                  <span className="text-2xl font-bold">{counts[s]}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {(["all", "running", "pending", "completed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 text-sm capitalize border-b-2 transition-colors",
              filter === f
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {f} {f !== "all" && `(${counts[f as keyof typeof counts] ?? 0})`}
            {f === "all" && `(${counts.all})`}
          </button>
        ))}
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {loading && tasks.length === 0 && (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          )}

          {filtered.map((task) => (
            <TaskRow key={task.id} task={task} onCancel={handleCancel} />
          ))}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ListTodo className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No tasks found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}

// Re-export the icon so the empty state works
import { ListTodo } from "lucide-react";
