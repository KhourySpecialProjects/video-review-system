import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Building2,
  BookOpen,
  Video,
  Circle,
  Clock,
  CheckCircle,
  ScrollText,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { AdminStats, AdminTab } from "./admin.types";

type StatCardConfig = {
  title: string;
  value: number;
  icon: React.ElementType;
};

/**
 * @description Derives the 4 stat card configurations from the full stats
 * response and the active tab.
 *
 * @param stats - The admin stats object.
 * @param activeTab - The currently active tab.
 * @returns Array of 4 card configs to render.
 */
function getCardsForTab(stats: AdminStats, activeTab: AdminTab): StatCardConfig[] {
  switch (activeTab) {
    case "users":
      return [
        { title: "Total Users", value: stats.totalUsers, icon: Users },
        { title: "Active Users", value: stats.activeUsers, icon: UserCheck },
        { title: "New This Month", value: stats.newUsersThisMonth, icon: UserPlus },
        { title: "Deactivated", value: stats.deactivatedUsers, icon: UserX },
      ];
    case "sites":
      return [
        { title: "Total Sites", value: stats.totalSites, icon: Building2 },
        { title: "Total Users", value: stats.totalUsers, icon: Users },
        { title: "Total Studies", value: stats.totalStudies, icon: BookOpen },
        { title: "Total Videos", value: stats.totalVideos, icon: Video },
      ];
    case "studies":
      return [
        { title: "Total Studies", value: stats.totalStudies, icon: BookOpen },
        { title: "Not Started", value: stats.studiesNotStarted, icon: Circle },
        { title: "In Progress", value: stats.studiesInProgress, icon: Clock },
        { title: "Finished", value: stats.studiesFinished, icon: CheckCircle },
      ];
    case "audits":
      return [
        { title: "Total Actions", value: stats.totalAuditActions, icon: ScrollText },
        { title: "Creates", value: stats.auditCreates, icon: Plus },
        { title: "Updates", value: stats.auditUpdates, icon: Pencil },
        { title: "Deletes", value: stats.auditDeletes, icon: Trash2 },
      ];
  }
}

/**
 * @description Renders 4 stat cards whose content changes based on
 * the active admin tab. Cards enter with a staggered fade-in and
 * slide-up animation when the tab changes.
 *
 * @param stats - The admin stats object with all counts.
 * @param activeTab - The currently active tab.
 */
export function AdminStatCards({
  stats,
  activeTab,
}: {
  stats: AdminStats;
  activeTab: AdminTab;
}) {
  /** @description The 4 card configs for the active tab. */
  const cards = useMemo(
    () => getCardsForTab(stats, activeTab),
    [stats, activeTab],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <AnimatePresence mode="popLayout">
        {cards.map(({ title, value, icon: Icon }, index) => (
          <motion.div
            key={`${activeTab}-${title}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <Card className="bg-background shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {title}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
