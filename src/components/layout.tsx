import { Outlet } from "react-router-dom";
import { NavSidebar } from "@/components/nav-sidebar";
import { useTheme } from "@/lib/use-theme";
import { signOut } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor, LogOut } from "lucide-react";

export function Layout() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background text-foreground">
      <NavSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-end px-4 py-2 border-b shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors" title="Toggle theme">
              {theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4 mr-2" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4 mr-2" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="h-4 w-4 mr-2" /> System
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex-1 flex min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
