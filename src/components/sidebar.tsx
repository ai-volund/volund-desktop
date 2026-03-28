import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, type Conversation } from "@/lib/volund-api";
import { Plus, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
}

export function Sidebar({ activeId, onSelect, onTitleChange }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const convos = await api.listConversations();
      setConversations(convos);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createNew = async () => {
    try {
      const convo = await api.createConversation("New conversation");
      setConversations((prev) => [convo, ...prev]);
      onSelect(convo.id);
    } catch {
      // Ignore
    }
  };

  const startRename = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const commitRename = async () => {
    if (!editingId || !editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await api.updateConversation(editingId, editTitle.trim());
      setConversations((prev) =>
        prev.map((c) =>
          c.id === editingId ? { ...c, title: editTitle.trim() } : c
        )
      );
      onTitleChange?.(editingId, editTitle.trim());
    } catch {
      // Ignore
    }
    setEditingId(null);
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        onSelect("");
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Conversations</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={createNew}
          title="New conversation"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading &&
            conversations.length === 0 &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
              </div>
            ))}

          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-1 rounded-md transition-colors hover:bg-sidebar-accent",
                activeId === c.id &&
                  "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              {editingId === c.id ? (
                <input
                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none border border-ring rounded-md"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <button
                    onClick={() => onSelect(c.id)}
                    className="flex-1 text-left px-3 py-2 text-sm flex items-center gap-2 min-w-0"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md hover:bg-sidebar-accent"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => startRename(c)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteConversation(c.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          ))}

          {!loading && conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4">
              No conversations yet.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
