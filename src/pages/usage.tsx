import { useEffect, useState, useCallback } from "react";
import { api, type UsageSummary } from "@/lib/volund-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, BarChart3, ArrowDownLeft, ArrowUpRight, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function UsagePage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateString(d);
  });
  const [to, setTo] = useState(() => toDateString(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUsageSummary(
        new Date(from).toISOString(),
        new Date(to + "T23:59:59Z").toISOString()
      );
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="flex-1 flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
          <p className="text-sm text-muted-foreground">
            Token usage and costs
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw
            className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Summary cards */}
      {loading && (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!loading && summary && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Input Tokens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">
                    {formatTokens(summary.total_input_tokens ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Output Tokens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">
                    {formatTokens(summary.total_output_tokens ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">
                    {summary.total_requests ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-model breakdown */}
          {summary.by_model && summary.by_model.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Usage by Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium">
                    <span>Model</span>
                    <span className="text-right">Input</span>
                    <span className="text-right">Output</span>
                    <span className="text-right">Requests</span>
                  </div>
                  <Separator />
                  {summary.by_model.map((m) => (
                    <div
                      key={`${m.provider}/${m.model}`}
                      className="grid grid-cols-4 text-sm"
                    >
                      <span className="font-mono text-xs truncate">
                        {m.provider}/{m.model}
                      </span>
                      <span className="text-right">
                        {formatTokens(m.input_tokens)}
                      </span>
                      <span className="text-right">
                        {formatTokens(m.output_tokens)}
                      </span>
                      <span className="text-right">{m.requests}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !summary && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No usage data available</p>
          <p className="text-xs mt-1">
            Usage is recorded when agents make LLM calls
          </p>
        </div>
      )}
    </main>
  );
}
