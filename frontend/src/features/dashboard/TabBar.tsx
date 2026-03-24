import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
            <TabsList className="w-full min-h-16 rounded-xl border-2 border-border bg-bg-dark p-2">
                <TabsTrigger
                    value="recent"
                    className="h-full flex-1 rounded-lg text-base font-semibold data-[active]:bg-bg-light data-[active]:text-text data-[active]:shadow-m!"
                >
                    Recent Uploads
                </TabsTrigger>
                <TabsTrigger
                    value="all"
                    className="h-full flex-1 rounded-lg text-base font-semibold data-[active]:bg-bg-light data-[active]:text-text data-[active]:shadow-m!"
                >
                    All Videos ({totalVideos})
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
