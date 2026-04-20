import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

// TODO: wire to backend API
const mockUsers = [
    { id: 1, firstName: "Sarah", lastName: "Chen", role: "System Admin", site: "All Sites" },
    { id: 2, firstName: "Marcus", lastName: "Rivera", role: "Clinical Reviewer", site: "Boston General" },
    { id: 3, firstName: "Priya", lastName: "Patel", role: "Site Coordinator", site: "Mass General" },
    { id: 4, firstName: "James", lastName: "O'Brien", role: "Caregiver", site: "Boston General" },
];

// TODO: wire to backend API
const mockSites = [
    { id: 1, name: "Boston General", caregivers: 8, studies: 2, coordinator: "Priya Patel" },
    { id: 2, name: "Mass General", caregivers: 12, studies: 3, coordinator: "Emily Torres" },
    { id: 3, name: "Children's Hospital", caregivers: 5, studies: 1, coordinator: "David Kim" },
];

// TODO: wire to backend API
const mockAuditLogs = [
    { id: 1, actionType: "Create", entityType: "User", user: "Sarah Chen", role: "System Admin", site: "All Sites", dateTime: "2026-04-14 09:23:01" },
    { id: 2, actionType: "Update", entityType: "Video", user: "Marcus Rivera", role: "Clinical Reviewer", site: "Boston General", dateTime: "2026-04-14 11:45:22" },
    { id: 3, actionType: "Delete", entityType: "Site", user: "Sarah Chen", role: "System Admin", site: "Mass General", dateTime: "2026-04-13 16:02:55" },
    { id: 4, actionType: "Login", entityType: "Session", user: "Priya Patel", role: "Site Coordinator", site: "Mass General", dateTime: "2026-04-15 08:10:33" },
];

const USER_ROLES = ["System Admin", "Clinical Reviewer", "Site Coordinator", "Caregiver"] as const;
const AUDIT_ACTION_TYPES = ["Create", "Update", "Delete", "Login"] as const;

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const roleBadgeVariant: Record<string, BadgeVariant> = {
    "System Admin": "default",
    "Clinical Reviewer": "secondary",
    "Site Coordinator": "outline",
    "Caregiver": "outline",
};

const actionBadgeVariant: Record<string, BadgeVariant> = {
    Create: "default",
    Update: "secondary",
    Delete: "destructive",
    Login: "outline",
};

interface AdminTableProps {
    defaultTab?: "users" | "sites" | "audit-logs";
    isLoading?: boolean;
}

/** Renders placeholder skeleton rows while data is loading. */
function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

/** Renders a single full-width row with an empty-state message. */
function EmptyRow({ cols, message = "No results found." }: { cols: number; message?: string }) {
    return (
        <TableRow>
            <TableCell colSpan={cols} className="py-10 text-center text-sm text-muted-foreground">
                {message}
            </TableCell>
        </TableRow>
    );
}

/**
 * Tabbed admin table showing Users, Sites, and Audit Logs.
 * Each tab has its own search/filter controls and a data table.
 * All data is currently mocked and should be replaced with API calls.
 */
export function AdminTable({ defaultTab = "users", isLoading = false }: AdminTableProps) {
    const [userSearch, setUserSearch] = useState("");
    const [userRoleFilter, setUserRoleFilter] = useState("all");

    const [siteSearch, setSiteSearch] = useState("");

    const [auditSearch, setAuditSearch] = useState("");
    const [auditActionFilter, setAuditActionFilter] = useState("all");
    const [auditRoleFilter, setAuditRoleFilter] = useState("all");
    const [auditStartDate, setAuditStartDate] = useState("");
    const [auditEndDate, setAuditEndDate] = useState("");

    const filteredUsers = mockUsers.filter((u) => {
        const matchesSearch =
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase());
        const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
        return matchesSearch && matchesRole;
    });

    const filteredSites = mockSites.filter((s) =>
        s.name.toLowerCase().includes(siteSearch.toLowerCase())
    );

    const filteredAuditLogs = mockAuditLogs.filter((log) => {
        const matchesSearch =
            log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
            log.site.toLowerCase().includes(auditSearch.toLowerCase());
        const matchesAction = auditActionFilter === "all" || log.actionType === auditActionFilter;
        const matchesRole = auditRoleFilter === "all" || log.role === auditRoleFilter;
        const logDate = log.dateTime.slice(0, 10);
        const matchesStart = !auditStartDate || logDate >= auditStartDate;
        const matchesEnd = !auditEndDate || logDate <= auditEndDate;
        return matchesSearch && matchesAction && matchesRole && matchesStart && matchesEnd;
    });

    return (
        <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="sites">Sites</TabsTrigger>
                <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
            </TabsList>

            {/* ── Users ─────────────────────────────── */}
            <TabsContent value="users">
                <div className="mb-3 flex flex-wrap gap-2">
                    <Input
                        placeholder="Search by name…"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="h-8 max-w-xs text-sm"
                    />
                    <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                        <SelectTrigger className="h-8 w-44 text-sm">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {USER_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>First Name</TableHead>
                                <TableHead>Last Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Site</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <SkeletonRows cols={4} />
                            ) : filteredUsers.length === 0 ? (
                                <EmptyRow cols={4} />
                            ) : (
                                filteredUsers.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell>{u.firstName}</TableCell>
                                        <TableCell>{u.lastName}</TableCell>
                                        <TableCell>
                                            <Badge variant={roleBadgeVariant[u.role] ?? "outline"}>
                                                {u.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{u.site}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* ── Sites ─────────────────────────────── */}
            <TabsContent value="sites">
                <div className="mb-3 flex flex-wrap gap-2">
                    <Input
                        placeholder="Search by site name…"
                        value={siteSearch}
                        onChange={(e) => setSiteSearch(e.target.value)}
                        className="h-8 max-w-xs text-sm"
                    />
                </div>

                <div className="rounded-md border bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Site Name</TableHead>
                                <TableHead>Caregivers</TableHead>
                                <TableHead>Studies</TableHead>
                                <TableHead>Site Coordinator</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <SkeletonRows cols={4} rows={3} />
                            ) : filteredSites.length === 0 ? (
                                <EmptyRow cols={4} />
                            ) : (
                                filteredSites.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell>{s.caregivers}</TableCell>
                                        <TableCell>{s.studies}</TableCell>
                                        <TableCell className="text-muted-foreground">{s.coordinator}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* ── Audit Logs ────────────────────────── */}
            <TabsContent value="audit-logs">
                <div className="mb-3 flex flex-wrap gap-2">
                    <Input
                        placeholder="Search by user or site…"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        className="h-8 max-w-xs text-sm"
                    />
                    <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                        <SelectTrigger className="h-8 w-44 text-sm">
                            <SelectValue placeholder="All Actions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {AUDIT_ACTION_TYPES.map((action) => (
                                <SelectItem key={action} value={action}>{action}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={auditRoleFilter} onValueChange={setAuditRoleFilter}>
                        <SelectTrigger className="h-8 w-44 text-sm">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {USER_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="date"
                        value={auditStartDate}
                        onChange={(e) => setAuditStartDate(e.target.value)}
                        className="h-8 w-40 text-sm"
                    />
                    <Input
                        type="date"
                        value={auditEndDate}
                        onChange={(e) => setAuditEndDate(e.target.value)}
                        className="h-8 w-40 text-sm"
                    />
                </div>

                <div className="rounded-md border bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action Type</TableHead>
                                <TableHead>Entity Type</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Site</TableHead>
                                <TableHead>Date &amp; Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <SkeletonRows cols={5} />
                            ) : filteredAuditLogs.length === 0 ? (
                                <EmptyRow cols={5} />
                            ) : (
                                filteredAuditLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <Badge variant={actionBadgeVariant[log.actionType] ?? "outline"}>
                                                {log.actionType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{log.entityType}</TableCell>
                                        <TableCell>{log.user}</TableCell>
                                        <TableCell className="text-muted-foreground">{log.site}</TableCell>
                                        <TableCell className="text-muted-foreground">{log.dateTime}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
        </Tabs>
    );
}
