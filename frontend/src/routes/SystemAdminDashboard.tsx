import { useLocation, Link } from "react-router";
import {
    LayoutDashboard,
    Users,
    Building2,
    ScrollText,
    Shield,
    Video,
    Clock,
} from "lucide-react";
import {
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarFooter,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
} from "@/components/ui/card";
import { AdminTable } from "@/features/admin/AdminTable";

const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "Users", icon: Users, path: "/admin/users" },
    { label: "Sites", icon: Building2, path: "/admin/sites" },
    { label: "Audit Logs", icon: ScrollText, path: "/admin/audit-logs" },
] as const;

// TODO: wire to backend API
const dashboardStats = [
    {
        title: "Total Users",
        value: 24,
        icon: Users,
        trend: "+12% from last month",
        trendPositive: true,
    },
    {
        title: "Active Sites",
        value: 3,
        icon: Building2,
        trend: "+1 new this month",
        trendPositive: true,
    },
    {
        title: "Videos Uploaded",
        value: 147,
        icon: Video,
        trend: "+8% from last month",
        trendPositive: true,
    },
    {
        title: "Pending Reviews",
        value: 12,
        icon: Clock,
        trend: "-20% from last month",
        trendPositive: false,
    },
] as const;

export default function SystemAdminDashboard() {
    const location = useLocation();

    const activeItem = navItems.find((item) => item.path === location.pathname);
    const activeLabel = activeItem?.label ?? "Dashboard";

    const sectionDescriptions: Record<string, string> = {
        Dashboard: "Overview of system activity and key metrics.",
        Users: "Manage user accounts, roles, and permissions.",
        Sites: "Configure and monitor registered sites.",
        "Audit Logs": "Review a full history of administrative actions.",
    };

    return (
        <SidebarProvider className="h-screen overflow-hidden">
            <Sidebar collapsible="offcanvas">
                <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-3">
                    <Shield className="size-5 text-primary" />
                    <span className="text-sm font-semibold">Admin Panel</span>
                </SidebarHeader>

                <SidebarContent className="px-2 py-2">
                    <SidebarMenu>
                        {navItems.map(({ label, icon: Icon, path }) => (
                            <SidebarMenuItem key={label}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={location.pathname === path}
                                >
                                    <Link to={path} className="flex items-center gap-2">
                                        <Icon className="size-4 shrink-0" />
                                        <span>{label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>

                <SidebarFooter className="px-4 py-3">
                    <p className="text-xs text-muted-foreground">System Admin</p>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset className="flex flex-col overflow-hidden bg-muted/30">
                <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2">
                    <SidebarTrigger />
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold tracking-tight">{activeLabel}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {sectionDescriptions[activeLabel]}
                        </p>
                    </div>

                    {location.pathname === "/admin" && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {dashboardStats.map(({ title, value, icon: Icon, trend, trendPositive }) => (
                                <Card key={title} className="bg-background shadow-sm">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            {title}
                                        </CardTitle>
                                        <Icon className="size-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">{value}</p>
                                        <p className={`mt-1 text-xs ${trendPositive ? "text-green-600" : "text-red-500"}`}>
                                            {trend}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {location.pathname === "/admin/users" && (
                        <AdminTable defaultTab="users" />
                    )}

                    {location.pathname === "/admin/sites" && (
                        <AdminTable defaultTab="sites" />
                    )}

                    {location.pathname === "/admin/audit-logs" && (
                        <AdminTable defaultTab="audit-logs" />
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
