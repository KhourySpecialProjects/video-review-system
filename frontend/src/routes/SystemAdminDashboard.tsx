import { useLocation, Link } from "react-router";
import { LayoutDashboard, Users, Building2, ScrollText } from "lucide-react";
import {
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "Users", icon: Users, path: "/admin/users" },
    { label: "Sites", icon: Building2, path: "/admin/sites" },
    { label: "Audit Logs", icon: ScrollText, path: "/admin/audit-logs" },
] as const;

export default function SystemAdminDashboard() {
    const location = useLocation();

    return (
        <SidebarProvider className="h-screen overflow-hidden">
            <Sidebar collapsible="offcanvas">
                <SidebarHeader>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Admin
                    </p>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarMenu>
                        {navItems.map(({ label, icon: Icon, path }) => (
                            <SidebarMenuItem key={label}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={location.pathname === path}
                                >
                                    <Link to={path}>
                                        <Icon />
                                        <span>{label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>

            <SidebarInset className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border p-2">
                    <SidebarTrigger />
                </div>

                <div className="flex flex-1 items-center justify-center">
                    <p className="text-muted-foreground">
                        Select a section from the sidebar
                    </p>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
