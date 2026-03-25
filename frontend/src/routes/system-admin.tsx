import { Outlet } from "react-router";
import Sidebar from "@/components/system-admin/sidebar";

export default function SystemAdminLayout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
