import { motion } from "motion/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TabValue = "recent" | "all";

export type TabBarProps = {
    activeTab: TabValue;
    onTabChange: (value: TabValue) => void;
    totalVideos: number;
};

/**
 * @description Top-of-home tab bar. A single motion element with a shared
 * `layoutId` sits behind the active tab; when the active tab changes,
 * motion slides that element to the new trigger, giving the indicator a
 * physical "slide" rather than a hard swap.
 *
 * @param activeTab - Currently selected tab value
 * @param onTabChange - Called with the new tab when the user switches
 * @param totalVideos - Total count shown after the "All Videos" label
 */
export function TabBar({ activeTab, onTabChange, totalVideos }: TabBarProps) {
    return (
        <Tabs
            value={activeTab}
            onValueChange={(v) => onTabChange(v as TabValue)}
            className="w-full"
        >
            <TabsList className="relative w-full min-h-16 rounded-xl border-2 border-border bg-bg-dark p-2">
                <AnimatedTab value="recent" activeTab={activeTab}>
                    Recent Uploads
                </AnimatedTab>
                <AnimatedTab value="all" activeTab={activeTab}>
                    All Videos ({totalVideos})
                </AnimatedTab>
            </TabsList>
        </Tabs>
    );
}

type AnimatedTabProps = {
    value: TabValue;
    activeTab: TabValue;
    children: React.ReactNode;
};

/**
 * @description A single tab trigger that renders the shared motion indicator
 * behind its label when it's the active tab. Label text sits above the
 * indicator in its own stacking context so it stays crisp mid-slide.
 *
 * @param value - The tab's value
 * @param activeTab - The currently active tab value
 * @param children - Label content
 */
function AnimatedTab({ value, activeTab, children }: AnimatedTabProps) {
    const isActive = activeTab === value;
    return (
        <TabsTrigger
            value={value}
            className="relative h-full flex-1 rounded-lg text-base font-semibold bg-transparent! text-text-muted data-[active]:text-text"
        >
            {isActive && (
                <motion.span
                    layoutId="tab-indicator-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 -z-0 rounded-lg bg-bg-light shadow-m"
                />
            )}
            <span className="relative z-10">{children}</span>
        </TabsTrigger>
    );
}
