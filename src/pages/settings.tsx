import { useEffect, useState, useCallback } from "react";
import {
  api,
  type ProviderCredential,
  type CredentialAuditEntry,
  type Memory,
  type MemorySearchResult,
} from "@/lib/volund-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  KeyRound,
  Brain,
  Shield,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Credentials Tab ─────────────────────────────────────────────────────────

function CredentialsTab() {
  const [creds, setCreds] = useState<ProviderCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newProvider, setNewProvider] = useState("");
  const [newToken, setNewToken] = useState("");
  const [newScopes, setNewScopes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setCreds(await api.listCredentials()); } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newProvider || !newToken) return;
    try {
      await api.storeCredential(
        newProvider,
        newToken,
        newScopes ? newScopes.split(",").map((s) => s.trim()) : []
      );
      setShowAdd(false);
      setNewProvider("");
      setNewToken("");
      setNewScopes("");
      load();
    } catch { /* */ }
  };

  const handleDelete = async (provider: string) => {
    try {
      await api.deleteCredential(provider);
      setCreds((prev) => prev.filter((c) => c.provider !== provider));
    } catch { /* */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">OAuth tokens and API keys for agent tool access</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Credential
        </Button>
      </div>

      {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}

      {creds.map((c) => (
        <div key={c.provider} className="flex items-center gap-3 border rounded-lg px-4 py-3">
          <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{c.provider}</p>
            <p className="text-xs text-muted-foreground">
              {c.token_type} &middot; {c.scopes.join(", ") || "no scopes"}
              {c.expires_at && <> &middot; Expires {new Date(c.expires_at).toLocaleDateString()}</>}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(c.provider)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      {!loading && creds.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No credentials stored</p>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Provider (e.g. github, openai)" value={newProvider} onChange={(e) => setNewProvider(e.target.value)} />
            <Input placeholder="Token / API Key" type="password" value={newToken} onChange={(e) => setNewToken(e.target.value)} />
            <Input placeholder="Scopes (comma-separated)" value={newScopes} onChange={(e) => setNewScopes(e.target.value)} />
            <Button onClick={handleAdd} className="w-full" disabled={!newProvider || !newToken}>
              Store Credential
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Memory Tab ──────────────────────────────────────────────────────────────

function MemoryTab() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setMemories(await api.listMemories()); } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = async () => {
    if (!searchQuery) { setSearchResults(null); return; }
    try {
      setSearchResults(await api.searchMemories(searchQuery));
    } catch { /* */ }
  };

  const handleAdd = async () => {
    if (!newContent) return;
    try {
      await api.storeMemory(newContent, {});
      setShowAdd(false);
      setNewContent("");
      load();
    } catch { /* */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (searchResults) setSearchResults((prev) => prev?.filter((m) => m.id !== id) ?? null);
    } catch { /* */ }
  };

  const displayList = searchResults ?? memories;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Long-term semantic memory (pgvector)</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Memory
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Semantic search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
        {searchResults && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchResults(null); setSearchQuery(""); }}>
            Clear
          </Button>
        )}
      </div>

      {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}

      {displayList.map((m) => (
        <div key={m.id} className="border rounded-lg px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm flex-1">{m.content}</p>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDelete(m.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{new Date(m.created_at).toLocaleString()}</span>
            {"similarity" in m && (
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                {((m as MemorySearchResult).similarity * 100).toFixed(1)}% match
              </span>
            )}
          </div>
        </div>
      ))}

      {!loading && displayList.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{searchResults ? "No results found" : "No memories stored"}</p>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Memory</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              className="w-full min-h-[100px] bg-transparent border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Enter a memory..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <Button onClick={handleAdd} className="w-full" disabled={!newContent}>
              Store Memory
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Audit Tab ───────────────────────────────────────────────────────────────

function AuditTab() {
  const [entries, setEntries] = useState<CredentialAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await api.listCredentialAudit()); } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const actionColor = (action: string) => {
    if (action.includes("stored") || action.includes("issued")) return "text-green-500";
    if (action.includes("denied") || action.includes("deleted")) return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Credential access and modification audit trail</p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}

      {entries.map((e) => (
        <div key={e.id} className="flex items-center gap-3 border rounded-lg px-4 py-2">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className={cn("font-medium", actionColor(e.action))}>{e.action}</span>
              {" "}&middot; {e.provider}
            </p>
            <p className="text-xs text-muted-foreground truncate">{e.detail}</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(e.created_at).toLocaleString()}
          </span>
        </div>
      ))}

      {!loading && entries.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No audit entries</p>
        </div>
      )}
    </div>
  );
}

// ── Settings Page ───────────────────────────────────────────────────────────

export function SettingsPage() {
  const [tab, setTab] = useState<"credentials" | "memory" | "audit">("credentials");

  const tabs = [
    { key: "credentials" as const, label: "Credentials", icon: KeyRound },
    { key: "memory" as const, label: "Memory", icon: Brain },
    { key: "audit" as const, label: "Audit Log", icon: Shield },
  ];

  return (
    <main className="flex-1 flex flex-col p-6 gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage credentials, memory, and security</p>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm border-b-2 transition-colors",
              tab === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        {tab === "credentials" && <CredentialsTab />}
        {tab === "memory" && <MemoryTab />}
        {tab === "audit" && <AuditTab />}
      </ScrollArea>
    </main>
  );
}
