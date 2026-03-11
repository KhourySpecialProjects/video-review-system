import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "motion/react";

export type TabValue = "recent" | "all";

interface TabBarProps {
    activeTab: TabValue;
    onTabChange: (value: TabValue) => void;
    totalVideos: number;
}

export function TabBar({ activeTab, onTabChange, totalVideos }: TabBarProps) {
    return (
        <Tabs
            value={activeTab}
            onValueChange={(v) => onTabChange(v as TabValue)}
            className="w-full"
        >
            <TabsList className="w-full min-h-16 rounded-xl border-2 border-border bg-bg-dark p-2 relative">
                <TabsTrigger
                    value="recent"
                    className="relative h-full flex-1 rounded-lg text-base font-semibold data-[active]:text-text text-text-muted transition-colors outline-none"
                >
                    <span className="relative z-10">Recent Uploads</span>
                    {activeTab === "recent" && (
                        <motion.div
                            layoutId="tabBarActive"
                            className="absolute inset-0 bg-bg-light rounded-lg shadow-m"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                    )}
                </TabsTrigger>
                <TabsTrigger
                    value="all"
                    className="relative h-full flex-1 rounded-lg text-base font-semibold data-[active]:text-text text-text-muted transition-colors outline-none"
                >
                    <span className="relative z-10">All Videos ({totalVideos})</span>
                    {activeTab === "all" && (
                        <motion.div
                            layoutId="tabBarActive"
                            className="absolute inset-0 bg-bg-light rounded-lg shadow-m"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                    )}
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
