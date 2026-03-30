import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { Login } from "@/components/login";
import { Onboarding } from "@/components/onboarding";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChatPage } from "@/pages/chat";
import { TasksPage } from "@/pages/tasks";
import { AgentsPage } from "@/pages/agents";
import { TeamsPage } from "@/pages/teams";
import { ForgePage } from "@/pages/forge";
import { SchedulesPage } from "@/pages/schedules";
import { UsagePage } from "@/pages/usage";
import { SettingsPage } from "@/pages/settings";

export default function App() {
  const { data: session, isPending } = useSession();
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem("volund_onboarded"));
  const completeOnboarding = useCallback(() => {
    localStorage.setItem("volund_onboarded", "1");
    setOnboarded(true);
  }, []);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <ErrorBoundary>
        <Login />
      </ErrorBoundary>
    );
  }

  if (!onboarded) {
    return (
      <ErrorBoundary>
        <Onboarding onComplete={completeOnboarding} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/forge" element={<ForgePage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
