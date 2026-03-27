import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LogStatus = "success" | "failed" | "warning";

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  role: string;
  site: string;
  action: string;
  target: string;
  status: LogStatus;
}

const logs: AuditLog[] = [
  {
    id: 1,
    timestamp: "2025-03-25 09:12:04",
    user: "sarah.lin@chop.edu",
    role: "Site Coordinator",
    site: "CHOP Philadelphia",
    action: "User Created",
    target: "caregiver_jsmith@chop.edu",
    status: "success",
  },
  {
    id: 2,
    timestamp: "2025-03-25 08:44:17",
    user: "c.rodriguez@chop.edu",
    role: "Caregiver",
    site: "CHOP Philadelphia",
    action: "Video Uploaded",
    target: "session_recording_2025_03_25_AM.mp4",
    status: "success",
  },
  {
    id: 3,
    timestamp: "2025-03-24 17:43:10",
    user: "priya.nair@mayo.edu",
    role: "Clinical Reviewer",
    site: "Mayo Clinic",
    action: "Video Reviewed",
    target: "session_recording_2025_03_22.mp4",
    status: "success",
  },
  {
    id: 4,
    timestamp: "2025-03-24 15:02:58",
    user: "admin@system.io",
    role: "System Admin",
    site: "—",
    action: "Site Added",
    target: "Duke University Hospital",
    status: "success",
  },
  {
    id: 5,
    timestamp: "2025-03-24 13:31:09",
    user: "t.nguyen@boston.edu",
    role: "Caregiver",
    site: "Boston Children's Hospital",
    action: "Video Metadata Updated",
    target: "session_recording_2025_03_19.mp4",
    status: "success",
  },
  {
    id: 6,
    timestamp: "2025-03-24 11:30:22",
    user: "james.okafor@duke.edu",
    role: "Site Coordinator",
    site: "Duke University Hospital",
    action: "Permissions Changed",
    target: "caregiver_hwilson@duke.edu",
    status: "success",
  },
  {
    id: 7,
    timestamp: "2025-03-23 22:17:45",
    user: "unknown@external.net",
    role: "—",
    site: "—",
    action: "Login Attempt",
    target: "admin@system.io",
    status: "failed",
  },
  {
    id: 8,
    timestamp: "2025-03-23 16:05:53",
    user: "m.foster@ucla.edu",
    role: "Caregiver",
    site: "UCLA Health",
    action: "Login Attempt",
    target: "m.foster@ucla.edu",
    status: "failed",
  },
  {
    id: 9,
    timestamp: "2025-03-23 14:08:03",
    user: "emily.chen@boston.edu",
    role: "Clinical Reviewer",
    site: "Boston Children's Hospital",
    action: "Video Deleted",
    target: "session_recording_2025_03_10_duplicate.mp4",
    status: "warning",
  },
  {
    id: 10,
    timestamp: "2025-03-22 10:54:19",
    user: "admin@system.io",
    role: "System Admin",
    site: "—",
    action: "Role Updated",
    target: "marcus.webb@ucla.edu → Clinical Reviewer",
    status: "success",
  },
];

const statusStyles: Record<LogStatus, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const SITES = [
  "Boston Children's Hospital",
  "CHOP Philadelphia",
  "UCLA Health",
  "Mayo Clinic",
  "Duke University Hospital",
];

const ACTIONS = [
  "Video Uploaded",
  "Video Metadata Updated",
  "Video Reviewed",
  "Video Deleted",
  "User Created",
  "Role Updated",
  "Permissions Changed",
  "Site Added",
  "Login Attempt",
];

const ROLES = [
  "System Admin",
  "Site Coordinator",
  "Clinical Reviewer",
  "Caregiver",
];

export default function SystemAdminAuditLogs() {
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      q === "" ||
      log.user.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q) ||
      log.site.toLowerCase().includes(q);

    const matchesSite = siteFilter === "all" || log.site === siteFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesRole = roleFilter === "all" || log.role === roleFilter;

    return matchesSearch && matchesSite && matchesAction && matchesRole;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review system activity and user actions across the platform.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
        />
        <Select value={siteFilter} onValueChange={(v) => setSiteFilter(v ?? "all")}>
          <SelectTrigger className={`w-52 border-slate-700 bg-slate-800 ${siteFilter === "all" ? "text-slate-500" : "text-slate-100"}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {SITES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "all")}>
          <SelectTrigger className={`w-48 border-slate-700 bg-slate-800 ${actionFilter === "all" ? "text-slate-500" : "text-slate-100"}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
          <SelectTrigger className={`w-44 border-slate-700 bg-slate-800 ${roleFilter === "all" ? "text-slate-500" : "text-slate-100"}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-700 bg-slate-800 ring-0 shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="whitespace-nowrap pl-6 text-slate-400">Timestamp</TableHead>
                <TableHead className="text-slate-400">User</TableHead>
                <TableHead className="text-slate-400">Role</TableHead>
                <TableHead className="text-slate-400">Site</TableHead>
                <TableHead className="text-slate-400">Action</TableHead>
                <TableHead className="text-slate-400">Target</TableHead>
                <TableHead className="pr-6 text-slate-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                    No logs match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-slate-700 hover:bg-slate-700/50"
                  >
                    <TableCell className="whitespace-nowrap pl-6 font-mono text-xs text-slate-400">
                      {log.timestamp}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-300">
                      {log.user}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-300">
                      {log.role}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-300">
                      {log.site}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium text-white">
                      {log.action}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-slate-400">
                      {log.target}
                    </TableCell>
                    <TableCell className="pr-6">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[log.status]}`}
                      >
                        {log.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
