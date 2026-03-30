import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { Login } from "@/components/login";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChatPage } from "@/pages/chat";
import { TasksPage } from "@/pages/tasks";
import { AgentsPage } from "@/pages/agents";
import { ForgePage } from "@/pages/forge";
import { UsagePage } from "@/pages/usage";
import { SettingsPage } from "@/pages/settings";

export default function App() {
  const { data: session, isPending } = useSession();

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

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/forge" element={<ForgePage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
