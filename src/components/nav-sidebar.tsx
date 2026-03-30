import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  ListTodo,
  Box,
  Boxes,
  ToolCase,
  Clock,
  ChartColumn,
  Settings,
} from "lucide-react";

const navItems = [
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/tasks", icon: ListTodo, label: "Tasks" },
  { to: "/agents", icon: Box, label: "Agents" },
  { to: "/teams", icon: Boxes, label: "Teams" },
  { to: "/forge", icon: ToolCase, label: "Forge" },
  { to: "/schedules", icon: Clock, label: "Schedules" },
  { to: "/usage", icon: ChartColumn, label: "Usage" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function NavSidebar() {
  return (
    <div className="w-14 border-r bg-sidebar flex flex-col items-center py-3 gap-1 shrink-0">
      <div className="text-xs font-bold tracking-tight text-sidebar-foreground mb-3 select-none">
        V
      </div>
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
              "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              isActive && "bg-sidebar-accent text-sidebar-foreground"
            )
          }
        >
          <Icon className="h-5 w-5" />
        </NavLink>
      ))}
    </div>
  );
}
