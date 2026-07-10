import { useCallback } from "react";
import { motion } from "motion/react";
import { Users, Building2, BookOpen, ScrollText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminTab } from "./admin.types";

const tabs: { value: AdminTab; label: string; icon: React.ElementType }[] = [
  { value: "users", label: "Users", icon: Users },
  { value: "sites", label: "Sites", icon: Building2 },
  { value: "studies", label: "Studies", icon: BookOpen },
  { value: "audits", label: "Audits", icon: ScrollText },
];

/**
 * @description Controlled tab bar built on shadcn Tabs with a
 * motion-animated sliding indicator. A motion.div with layoutId
 * smoothly animates from the previous active tab to the new one,
 * providing a sliding highlight effect.
 *
 * @param activeTab - The currently active tab.
 * @param onTabChange - Callback fired when a tab is clicked.
 */
export function AdminTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}) {
  /** @description Stable change handler for the controlled Tabs. */
  const handleChange = useCallback(
    (value: AdminTab | (string & {})) => onTabChange(value as AdminTab),
    [onTabChange],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleChange}>
      <TabsList>
        {tabs.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="relative data-active:bg-transparent data-active:shadow-none"
          >
            {activeTab === value && (
              <motion.div
                layoutId="admin-tab-indicator"
                className="absolute inset-0 rounded-md bg-background shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="size-4" />
              {label}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
