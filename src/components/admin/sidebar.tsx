import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Scissors,
  Users,
  CalendarCheck,
  CalendarClock,
  Footprints,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ScrollText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const groups = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { title: "Bookings", url: "/admin/bookings", icon: CalendarCheck },
      { title: "Walk-ins", url: "/admin/walk-ins", icon: Footprints },
      { title: "Barbers", url: "/admin/barbers", icon: Users },
      { title: "Schedules", url: "/admin/schedules", icon: CalendarClock },
      { title: "Services", url: "/admin/services", icon: Scissors },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Reports", url: "/admin/reports", icon: BarChart3 },
      { title: "Notifications", url: "/admin/notifications", icon: Bell },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: ScrollText },
    ],
  },
  {
    label: "System",
    items: [{ title: "Settings", url: "/admin/settings", icon: Settings }],
  },
];

export function AdminSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(path + "/");
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="h-5 w-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">Southside Barbers</p>
            <p className="truncate text-xs text-muted-foreground">Admin Console</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          active &&
                            "bg-sky-500/10 font-medium text-sky-600 hover:bg-sky-500/15 hover:text-sky-600 data-[active=true]:bg-sky-500/10 data-[active=true]:text-sky-600",
                        )}
                      >
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
