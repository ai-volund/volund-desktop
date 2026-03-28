import { useEffect, useState, useCallback } from "react";
import { api, type ForgeSkill } from "@/lib/volund-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Store,
  Download,
  Tag,
  FileText,
  Terminal,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcon = {
  prompt: FileText,
  mcp: Plug,
  cli: Terminal,
} as const;

const typeColor = {
  prompt: "bg-blue-500/10 text-blue-500",
  mcp: "bg-purple-500/10 text-purple-500",
  cli: "bg-orange-500/10 text-orange-500",
} as const;

function SkillCard({ skill, onClick }: { skill: ForgeSkill; onClick: () => void }) {
  const Icon = typeIcon[skill.type] ?? FileText;
  const color = typeColor[skill.type] ?? typeColor.prompt;

  return (
    <Card className="cursor-pointer hover:ring-1 hover:ring-ring transition-shadow" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{skill.name}</CardTitle>
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", color)}>
            <Icon className="h-3 w-3" />
            {skill.type}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          v{skill.version} by {skill.author}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-wrap gap-1">
            {skill.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
            {skill.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{skill.tags.length - 3}</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Download className="h-3 w-3" />
            {skill.downloads.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SkillDetail({ skill, onClose }: { skill: ForgeSkill; onClose: () => void }) {
  const Icon = typeIcon[skill.type] ?? FileText;
  const color = typeColor[skill.type] ?? typeColor.prompt;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{skill.name}</DialogTitle>
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", color)}>
              <Icon className="h-3 w-3" />
              {skill.type}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            v{skill.version} by {skill.author}
          </p>
        </DialogHeader>
        <Separator />
        <div className="space-y-4">
          <p className="text-sm">{skill.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Downloads</p>
              <p className="flex items-center gap-1">
                <Download className="h-3.5 w-3.5" />
                {skill.downloads.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Published</p>
              <p>{new Date(skill.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {skill.tags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {skill.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                    <Tag className="h-3 w-3" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {skill.readme && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">README</p>
              <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                {skill.readme}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ForgePage() {
  const [skills, setSkills] = useState<ForgeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ForgeSkill | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: { q?: string; type?: string; limit: number } = { limit: 50 };
      if (query) params.q = query;
      if (typeFilter !== "all") params.type = typeFilter;
      setSkills(await api.searchForgeSkills(params));
    } catch {
      // Forge may not be available
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSelectSkill = async (skill: ForgeSkill) => {
    try {
      const full = await api.getForgeSkill(skill.name);
      setSelected(full);
    } catch {
      setSelected(skill);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-6 gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">The Forge</h1>
        <p className="text-sm text-muted-foreground">Browse and discover agent skills</p>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["all", "prompt", "mcp", "cli"].map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
              className="capitalize"
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* Skills grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && skills.length === 0 && (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))
          )}

          {skills.map((skill) => (
            <SkillCard key={skill.name} skill={skill} onClick={() => handleSelectSkill(skill)} />
          ))}
        </div>

        {!loading && skills.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Store className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No skills found</p>
            <p className="text-xs mt-1">Try adjusting your search or publish a skill with <code className="bg-muted px-1 rounded">volund-forge publish</code></p>
          </div>
        )}
      </ScrollArea>

      {selected && <SkillDetail skill={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
