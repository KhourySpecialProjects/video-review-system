import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const metrics = [
  { label: "Total Users", value: 142 },
  { label: "Total Sites", value: 8 },
  { label: "Videos Uploaded", value: 1034 },
  { label: "Pending Reviews", value: 27 },
];

const sites = [
  {
    name: "Boston Children's Hospital",
    coordinator: "Dr. Sarah Lin",
    caregivers: 34,
    reviewers: 5,
    uploaded: 214,
    pending: 6,
  },
  {
    name: "CHOP Philadelphia",
    coordinator: "Dr. Marcus Webb",
    caregivers: 28,
    reviewers: 4,
    uploaded: 189,
    pending: 3,
  },
  {
    name: "UCLA Health",
    coordinator: "Dr. Priya Nair",
    caregivers: 22,
    reviewers: 3,
    uploaded: 156,
    pending: 9,
  },
  {
    name: "Mayo Clinic",
    coordinator: "Dr. James Okafor",
    caregivers: 19,
    reviewers: 3,
    uploaded: 243,
    pending: 5,
  },
  {
    name: "Duke University Hospital",
    coordinator: "Dr. Emily Chen",
    caregivers: 15,
    reviewers: 2,
    uploaded: 98,
    pending: 4,
  },
];

export default function SystemAdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">System Admin Dashboard</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Overview of platform activity across all sites and users.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {metrics.map(({ label, value }) => (
          <Card key={label} className="bg-slate-800 border-slate-700 ring-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-slate-400 text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-white">{value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Site Overview Table */}
      <div>
        <h2 className="text-lg font-medium text-white mb-4">Site Overview</h2>
        <Card className="bg-slate-800 border-slate-700 ring-0 shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400 pl-6">Site Name</TableHead>
                  <TableHead className="text-slate-400">Coordinator</TableHead>
                  <TableHead className="text-slate-400 text-right">Caregivers</TableHead>
                  <TableHead className="text-slate-400 text-right">Clinical Reviewers</TableHead>
                  <TableHead className="text-slate-400 text-right">Uploaded Videos</TableHead>
                  <TableHead className="text-slate-400 text-right pr-6">Pending Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.name} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white font-medium pl-6">{site.name}</TableCell>
                    <TableCell className="text-slate-300">{site.coordinator}</TableCell>
                    <TableCell className="text-slate-300 text-right">{site.caregivers}</TableCell>
                    <TableCell className="text-slate-300 text-right">{site.reviewers}</TableCell>
                    <TableCell className="text-slate-300 text-right">{site.uploaded}</TableCell>
                    <TableCell className="text-right pr-6">
                      <span
                        className={
                          site.pending > 5
                            ? "text-amber-400 font-medium"
                            : "text-slate-300"
                        }
                      >
                        {site.pending}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
