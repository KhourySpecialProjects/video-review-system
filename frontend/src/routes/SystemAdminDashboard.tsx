import { useState } from "react";
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

type Section = "dashboard" | "users" | "sites" | "audit-logs";

const navItems: { label: string; icon: React.ElementType; section: Section }[] = [
    { label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
    { label: "Users", icon: Users, section: "users" },
    { label: "Sites", icon: Building2, section: "sites" },
    { label: "Audit Logs", icon: ScrollText, section: "audit-logs" },
];

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

const sectionLabels: Record<Section, string> = {
    dashboard: "Dashboard",
    users: "Users",
    sites: "Sites",
    "audit-logs": "Audit Logs",
};

const sectionDescriptions: Record<Section, string> = {
    dashboard: "Overview of system activity and key metrics.",
    users: "Manage user accounts, roles, and permissions.",
    sites: "Configure and monitor registered sites.",
    "audit-logs": "Review a full history of administrative actions.",
};

export default function SystemAdminDashboard() {
    const [activeSection, setActiveSection] = useState<Section>("dashboard");

    return (
        <SidebarProvider className="h-screen overflow-hidden">
            <Sidebar collapsible="offcanvas">
                <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-3">
                    <Shield className="size-5 text-primary" />
                    <span className="text-sm font-semibold">Admin Panel</span>
                </SidebarHeader>

                <SidebarContent className="px-2 py-2">
                    <SidebarMenu>
                        {navItems.map(({ label, icon: Icon, section }) => (
                            <SidebarMenuItem key={section}>
                                <SidebarMenuButton
                                    isActive={activeSection === section}
                                    onClick={() => setActiveSection(section)}
                                    className="flex items-center gap-2"
                                >
                                    <Icon className="size-4 shrink-0" />
                                    <span>{label}</span>
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
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {sectionLabels[activeSection]}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {sectionDescriptions[activeSection]}
                        </p>
                    </div>

                    {activeSection === "dashboard" && (
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

                    {activeSection === "users" && <AdminTable defaultTab="users" />}

                    {activeSection === "sites" && <AdminTable defaultTab="sites" />}

                    {activeSection === "audit-logs" && <AdminTable defaultTab="audit-logs" />}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
