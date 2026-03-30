import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export function SchedulesPage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schedules</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Schedule recurring agent workflows and automated tasks
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Scheduled Workflows</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
            Set up agents to run on a schedule — daily briefings, weekly reports,
            automated monitoring, and more. Define a prompt, pick an agent,
            set a cron schedule, and choose how to receive results
            (conversation, email, webhook).
          </p>
          <p className="text-xs text-muted-foreground mt-4">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
