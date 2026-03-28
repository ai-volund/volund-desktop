import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "@/components/login";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChatPage } from "@/pages/chat";
import { TasksPage } from "@/pages/tasks";
import { AgentsPage } from "@/pages/agents";
import { ForgePage } from "@/pages/forge";
import { UsagePage } from "@/pages/usage";
import { SettingsPage } from "@/pages/settings";
import { api } from "@/lib/volund-api";

export default function App() {
  const [authenticated, setAuthenticated] = useState(!!api.getToken());

  const handleLogin = useCallback(() => {
    setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    api.logout();
    setAuthenticated(false);
  }, []);

  if (!authenticated) {
    return (
      <ErrorBoundary>
        <Login onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout onLogout={handleLogout} />}>
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
