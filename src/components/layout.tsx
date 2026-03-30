import { Outlet, useLocation } from "react-router-dom";
import { NavSidebar } from "@/components/nav-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const pageTitles: Record<string, string> = {
  "/chat": "Chat",
  "/tasks": "Tasks",
  "/agents": "Agents",
  "/teams": "Teams",
  "/forge": "The Forge",
  "/schedules": "Schedules",
  "/usage": "Usage",
  "/settings": "Settings",
};

export function Layout() {
  const location = useLocation();
  const title =
    Object.entries(pageTitles).find(([path]) =>
      location.pathname.startsWith(path)
    )?.[1] ?? "Volund";

  return (
    <SidebarProvider defaultOpen={false}>
      <NavSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <h1 className="text-base font-medium">{title}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
