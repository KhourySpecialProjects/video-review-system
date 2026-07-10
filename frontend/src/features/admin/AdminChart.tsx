import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { adminChartQuery } from "@/lib/admin.service";
import type { AdminTab } from "./admin.types";

/** @description Chart title displayed in the card header for each tab. */
const chartTitles: Record<AdminTab, string> = {
  users: "User Registrations",
  sites: "Sites Created",
  studies: "Study Activity",
  audits: "Audit Activity",
};

/**
 * @description Builds the recharts ChartConfig for the given tab.
 * Single-series tabs (users, sites) use one area; stacked tabs
 * (studies, audits) use multiple areas with distinct colors.
 *
 * @param tab - The active admin tab.
 * @returns Chart configuration object.
 */
function getChartConfig(tab: AdminTab): ChartConfig {
  switch (tab) {
    case "users":
      return {
        count: { label: "Registrations", color: "var(--chart-1)" },
      };
    case "sites":
      return {
        count: { label: "Sites Created", color: "var(--chart-2)" },
      };
    case "studies":
      return {
        NOT_STARTED: { label: "Not Started", color: "var(--chart-3)" },
        IN_PROGRESS: { label: "In Progress", color: "var(--chart-4)" },
        FINISHED: { label: "Finished", color: "var(--chart-5)" },
      };
    case "audits":
      return {
        CREATE: { label: "Create", color: "var(--chart-1)" },
        UPDATE: { label: "Update", color: "var(--chart-2)" },
        DELETE: { label: "Delete", color: "var(--chart-3)" },
      };
  }
}

/**
 * @description Formats a "YYYY-MM" month key as a short month name
 * for x-axis ticks (e.g. "2026-01" → "Jan").
 *
 * @param month - Month key in "YYYY-MM" format.
 * @returns Short month name.
 */
function formatMonthTick(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1).toLocaleString(undefined, { month: "short" });
}

/**
 * @description Formats a "YYYY-MM" month key as a full month + year
 * label for the tooltip header (e.g. "2026-01" → "January 2026").
 *
 * @param month - Month key in "YYYY-MM" format.
 * @returns Full month name with year.
 */
function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/**
 * @description Renders an area chart for the active admin tab. Uses
 * useSuspenseQuery to read chart data from the loader's prefetch cache.
 * Multi-series tabs get a legend and stacked areas; single-series tabs
 * rely on the card title for identity. The parent wraps this in a
 * Suspense boundary for loading states.
 *
 * @param activeTab - The currently active admin tab.
 */
export function AdminChart({ activeTab }: { activeTab: AdminTab }) {
  const { data } = useSuspenseQuery(adminChartQuery(activeTab, 6));

  /** @description Chart config derived from the active tab. */
  const config = useMemo(() => getChartConfig(activeTab), [activeTab]);

  /** @description Data key names for the area components. */
  const dataKeys = useMemo(() => Object.keys(config), [config]);

  /** @description Whether this tab renders a stacked area chart. */
  const isStacked = dataKeys.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {chartTitles[activeTab]}
        </CardTitle>
        <CardDescription className="text-xs">Last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-62.5 w-full">
          <AreaChart
            data={data.data}
            accessibilityLayer
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              {dataKeys.map((key) => (
                <linearGradient
                  key={key}
                  id={`admin-chart-fill-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatMonthTick}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={36}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    formatMonthLabel(String(payload?.[0]?.payload?.month ?? ""))
                  }
                />
              }
            />
            {dataKeys.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId={isStacked ? "a" : undefined}
                fill={`url(#admin-chart-fill-${key})`}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
              />
            ))}
            {isStacked && <ChartLegend content={<ChartLegendContent />} />}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
