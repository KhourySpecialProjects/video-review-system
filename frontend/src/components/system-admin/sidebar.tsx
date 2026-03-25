import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  Globe,
  ScrollText,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/system-admin", icon: LayoutDashboard },
  { label: "Users", href: "/system-admin/users", icon: Users },
  { label: "Sites", href: "/system-admin/sites", icon: Globe },
  { label: "Audit Logs", href: "/system-admin/audit-logs", icon: ScrollText },
  { label: "Settings", href: "/system-admin/settings", icon: Settings },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  const isActive = (href: string) =>
    href === "/system-admin"
      ? pathname === "/system-admin"
      : pathname.startsWith(href);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-700">
        <p className="text-white font-semibold text-sm leading-tight">
          Angelman Syndrome
        </p>
        <p className="text-slate-400 text-xs mt-0.5">Research Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive(href)
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700">
        <p className="text-white text-sm font-medium leading-tight">
          System Administrator
        </p>
        <p className="text-slate-400 text-xs mt-0.5">admin@system.io</p>
      </div>
    </aside>
  );
}
