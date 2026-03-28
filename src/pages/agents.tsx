import { useEffect, useState, useCallback, type FormEvent } from "react";
import { api, type AgentProfile } from "@/lib/volund-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Bot,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ProfileCard({
  profile,
  onDeleted,
}: {
  profile: AgentProfile;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteAgentProfile(profile.id);
      onDeleted();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <CardTitle className="text-base">{profile.name}</CardTitle>
            </div>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono">
              {profile.model_provider}/{profile.model_id}
            </span>
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            {profile.profile_type}
          </p>
        </CardHeader>
      </button>
      {expanded && (
        <CardContent className="pt-0 space-y-3">
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p>{profile.profile_type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Tokens</p>
              <p>{profile.max_tokens}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p>{profile.temperature}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p>{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          {profile.skills && profile.skills.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.system_prompt && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                System Prompt
              </p>
              <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap max-h-32 overflow-auto">
                {profile.system_prompt}
              </pre>
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={deleting}
              className="text-destructive hover:text-destructive"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              Delete
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function CreateAgentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [profileType, setProfileType] = useState("specialist");
  const [modelProvider, setModelProvider] = useState("anthropic");
  const [modelId, setModelId] = useState("claude-sonnet-4-5");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("8192");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [skills, setSkills] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim() && modelProvider.trim() && modelId.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await api.createAgentProfile({
        name: name.trim(),
        profile_type: profileType,
        model_provider: modelProvider.trim(),
        model_id: modelId.trim(),
        temperature: parseFloat(temperature) || 0.7,
        max_tokens: parseInt(maxTokens) || 8192,
        system_prompt: systemPrompt.trim() || undefined,
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onCreated();
      onOpenChange(false);
      // Reset form
      setName("");
      setProfileType("specialist");
      setSystemPrompt("");
      setSkills("");
    } catch {
      setError("Failed to create agent profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Agent Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              placeholder="my-agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Profile Type
            </label>
            <select
              value={profileType}
              onChange={(e) => setProfileType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="specialist">Specialist</option>
              <option value="orchestrator">Orchestrator</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Provider</label>
              <Input
                placeholder="anthropic"
                value={modelProvider}
                onChange={(e) => setModelProvider(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Model</label>
              <Input
                placeholder="claude-sonnet-4-5"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Temperature
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Max Tokens
              </label>
              <Input
                type="number"
                min="1"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              System Prompt
            </label>
            <Textarea
              placeholder="You are a helpful specialist agent..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Skills (comma-separated)
            </label>
            <Input
              placeholder="web_search, run_code, read_memory"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AgentsPage() {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfiles(await api.listAgentProfiles());
    } catch {
      // API may not be available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="flex-1 flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage agent profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Agent
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold">{profiles.length}</span>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}

          {!loading &&
            profiles.map((p) => (
              <ProfileCard key={p.id} profile={p} onDeleted={load} />
            ))}

          {!loading && profiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bot className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No agent profiles found</p>
              <p className="text-xs mt-1">
                Click "New Agent" to create your first profile
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateAgentDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={load}
      />
    </main>
  );
}
