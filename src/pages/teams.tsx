import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes } from "lucide-react";

export function TeamsPage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create and manage teams of agents that work together
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Boxes className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Agent Teams</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
            Teams let you group agents together for coordinated workflows.
            An orchestrator agent can delegate tasks to specialist agents
            within a team — research, coding, email, and more — all working
            together on your behalf.
          </p>
          <p className="text-xs text-muted-foreground mt-4">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
