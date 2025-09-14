"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  ChartPie,
  ChartBarIncreasing,
  SquareActivity,
  Goal,
  TrendingUpDown,
  ChartBarDecreasing,
  ChartArea,
  ChartColumnDecreasing,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type MetricChanges = {
  occupancyChange: number;
  revenueChange: number;
  reservationsChange: number;
  violationsChange: number;
};

type DashboardMetrics = {
  occupied: number;
  capacity: number;
  revenue: number;
  reservations: number;
  violations: number;
} & MetricChanges;

type Zone = {
  id: string;
  name: string;
  utilization: number; // 0..1
};

type ActivityType = "check-in" | "check-out" | "violation";

type ActivityItem = {
  id: string;
  visitor: string;
  action: ActivityType;
  time: string; // ISO or formatted
  zone?: string;
};

export interface DashboardProps {
  className?: string;
  metrics?: DashboardMetrics;
  zones?: Zone[];
  activities?: ActivityItem[];
  loading?: boolean;
  live?: boolean;
  onNewReservation?: () => void;
  onMarkViolation?: () => void;
  onExport?: () => void;
}

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString()}`;
  }
}

function trendColor(change: number) {
  if (change > 0) return "text-[var(--color-success)]";
  if (change < 0) return "text-[var(--color-destructive)]";
  return "text-[var(--color-on-surface)]";
}

function trendIcon(change: number) {
  if (change > 0) return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
  if (change < 0)
    return <TrendingDown className="h-4 w-4" aria-hidden="true" />;
  return <TrendingUpDown className="h-4 w-4" aria-hidden="true" />;
}

function utilizationColor(u: number) {
  // 0..1 scale mapped to green -> orange -> red via inline HSL
  // Keep good contrast by darkening slightly
  // 120 (green) -> 0 (red)
  const hue = Math.max(0, Math.min(120, 120 - u * 120));
  return `hsl(${hue} 70% 45%)`;
}

function mergeZonesWithLive(zones: Zone[], tick: number): Zone[] {
  // Subtle pulse to indicate "real-time" changes without wild jumps
  return zones.map((z, i) => {
    const variance =
      (Math.sin(tick / 1000 + i) + Math.cos(tick / 1400 + i * 1.7)) * 0.01;
    const next = Math.max(0, Math.min(1, z.utilization + variance));
    return { ...z, utilization: next };
  });
}

export default function Dashboard({
  className,
  metrics,
  zones,
  activities,
  loading,
  live = false,
  onNewReservation,
  onMarkViolation,
  onExport,
}: DashboardProps) {
  const [now, setNow] = React.useState<number>(Date.now());
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1500);
    return () => clearInterval(id);
  }, [live]);

  const defaultMetrics: DashboardMetrics = React.useMemo(
    () => ({
      occupied: 184,
      capacity: 220,
      revenue: 48230,
      reservations: 37,
      violations: 5,
      occupancyChange: 3.2,
      revenueChange: 5.8,
      reservationsChange: -1.2,
      violationsChange: -0.8,
    }),
    []
  );

  const defaultZones: Zone[] = React.useMemo(
    () => [
      { id: "A", name: "Zone A", utilization: 0.82 },
      { id: "B", name: "Zone B", utilization: 0.64 },
      { id: "C", name: "Zone C", utilization: 0.47 },
      { id: "D", name: "Zone D", utilization: 0.91 },
      { id: "E", name: "Zone E", utilization: 0.33 },
      { id: "F", name: "Zone F", utilization: 0.58 },
      { id: "G", name: "Zone G", utilization: 0.73 },
      { id: "H", name: "Zone H", utilization: 0.26 },
    ],
    []
  );

  const defaultActivities: ActivityItem[] = React.useMemo(
    () => [
      {
        id: "1",
        visitor: "R. Patel",
        action: "check-in",
        time: "10:21",
        zone: "B",
      },
      {
        id: "2",
        visitor: "M. Chen",
        action: "check-out",
        time: "10:15",
        zone: "A",
      },
      {
        id: "3",
        visitor: "G. Alvarez",
        action: "violation",
        time: "10:12",
        zone: "D",
      },
      {
        id: "4",
        visitor: "S. Johnson",
        action: "check-in",
        time: "10:05",
        zone: "C",
      },
      {
        id: "5",
        visitor: "K. Lee",
        action: "check-in",
        time: "09:58",
        zone: "H",
      },
    ],
    []
  );

  const mergedMetrics = metrics ?? defaultMetrics;
  const baseZones = zones ?? defaultZones;
  const mergedZones = live ? mergeZonesWithLive(baseZones, now) : baseZones;
  const mergedActivities = activities ?? defaultActivities;

  const isLoading = !!loading;

  const occupancyRate =
    mergedMetrics.capacity > 0
      ? Math.min(
          100,
          Math.max(0, (mergedMetrics.occupied / mergedMetrics.capacity) * 100)
        )
      : 0;

  const available = Math.max(0, mergedMetrics.capacity - mergedMetrics.occupied);

  function handleNewReservation() {
    if (onNewReservation) return onNewReservation();
    toast.success("New reservation flow started");
  }
  function handleMarkViolation() {
    if (onMarkViolation) return onMarkViolation();
    toast.message("Violation marked", {
      description: "Vehicle flagged and notification sent.",
    });
  }
  function handleExport() {
    if (onExport) return onExport();
    toast.info("Export started", { description: "Generating CSV report..." });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <section
        className={cn(
          "w-full max-w-full bg-background text-foreground",
          className
        )}
        aria-label="Dashboard overview"
      >
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Occupancy"
            value={
              isLoading ? (
                <Skeleton className="h-7 w-24 rounded-md bg-muted" />
              ) : (
                `${Math.round(occupancyRate)}%`
              )
            }
            subtitle={
              isLoading ? (
                <Skeleton className="h-4 w-28 rounded bg-muted" />
              ) : (
                `${mergedMetrics.occupied}/${mergedMetrics.capacity} spots`
              )
            }
            change={isLoading ? undefined : mergedMetrics.occupancyChange}
            icon={
              <Gauge
                className="h-5 w-5 text-[var(--color-on-surface)]"
                aria-hidden="true"
              />
            }
          >
            {/* Inline progress */}
            {isLoading ? (
              <Skeleton className="h-2 w-full rounded bg-muted" />
            ) : (
              <div
                className="h-2 w-full rounded bg-[var(--color-secondary)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(occupancyRate)}
                aria-label="Occupancy rate"
              >
                <div
                  className="h-2 rounded"
                  style={{
                    width: `${occupancyRate}%`,
                    backgroundColor: utilizationColor(occupancyRate / 100),
                    transition: "width 300ms ease, background-color 300ms ease",
                  }}
                />
              </div>
            )}
          </MetricCard>

          <MetricCard
            title="Revenue"
            value={
              isLoading ? (
                <Skeleton className="h-7 w-28 rounded-md bg-muted" />
              ) : (
                formatCurrency(mergedMetrics.revenue)
              )
            }
            subtitle={isLoading ? <Skeleton className="h-4 w-16 rounded bg-muted" /> : "Today"}
            change={isLoading ? undefined : mergedMetrics.revenueChange}
            icon={
              <ChartBarIncreasing
                className="h-5 w-5 text-[var(--color-on-surface)]"
                aria-hidden="true"
              />
            }
          />

          <MetricCard
            title="Active Reservations"
            value={
              isLoading ? (
                <Skeleton className="h-7 w-10 rounded-md bg-muted" />
              ) : (
                mergedMetrics.reservations.toString()
              )
            }
            subtitle={
              isLoading ? (
                <Skeleton className="h-4 w-20 rounded bg-muted" />
              ) : (
                "Live"
              )
            }
            change={isLoading ? undefined : mergedMetrics.reservationsChange}
            icon={
              <ChartPie
                className="h-5 w-5 text-[var(--color-on-surface)]"
                aria-hidden="true"
              />
            }
          />

          <MetricCard
            title="Violations"
            value={
              isLoading ? (
                <Skeleton className="h-7 w-8 rounded-md bg-muted" />
              ) : (
                mergedMetrics.violations.toString()
              )
            }
            subtitle={
              isLoading ? (
                <Skeleton className="h-4 w-24 rounded bg-muted" />
              ) : (
                "Last 1h"
              )
            }
            change={isLoading ? undefined : mergedMetrics.violationsChange}
            icon={
              <ChartColumnDecreasing
                className="h-5 w-5 text-[var(--color-on-surface)]"
                aria-hidden="true"
              />
            }
          />
        </div>

        {/* Middle: Heatmap + Activity + Actions */}
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Occupancy Heatmap */}
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">Occupancy Heatmap</CardTitle>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Zone utilization in real time
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: utilizationColor(0.25) }} />
                  <span>Low</span>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: utilizationColor(0.55) }} />
                  <span>Med</span>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: utilizationColor(0.9) }} />
                  <span>High</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-md bg-muted" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {mergedZones.map((z) => {
                    const u = Math.round(z.utilization * 100);
                    return (
                      <Tooltip key={z.id}>
                        <TooltipTrigger asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label={`${z.name} utilization ${u}%`}
                            className="group relative min-w-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 outline-none transition-colors hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Goal className="h-4 w-4 text-[var(--color-on-surface)]" aria-hidden="true" />
                                  <span className="truncate text-sm font-semibold">{z.name}</span>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">{u}% utilized</div>
                              </div>
                              <div
                                className="h-8 w-8 shrink-0 rounded-md transition-transform duration-200 group-hover:scale-105"
                                aria-hidden="true"
                                style={{ backgroundColor: utilizationColor(z.utilization) }}
                              />
                            </div>
                            <div className="mt-3 h-1.5 w-full rounded bg-[var(--color-secondary)]">
                              <div
                                className="h-1.5 rounded transition-[width] duration-300"
                                style={{
                                  width: `${u}%`,
                                  backgroundColor: utilizationColor(z.utilization),
                                }}
                              />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-popover text-popover-foreground">
                          <p className="text-xs">
                            {z.name}: {u}% occupied
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-card xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Visitor check-ins, check-outs, and violations
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-md bg-muted" />
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-4 w-40 rounded bg-muted" />
                        <Skeleton className="mt-2 h-3 w-24 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-3">
                  {mergedActivities.slice(0, 8).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3"
                    >
                      <ActivityIcon type={a.action} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {a.visitor}
                          </p>
                          <span className="text-xs text-muted-foreground">{a.time}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="min-w-0 truncate">
                            {labelForAction(a.action)}
                            {a.zone ? ` • Zone ${a.zone}` : ""}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions + Summary */}
          <Card className="bg-card xl:row-span-1 xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Common tasks for faster operations
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                  onClick={handleNewReservation}
                >
                  <ChartArea className="mr-2 h-4 w-4" aria-hidden="true" />
                  New reservation
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[color:var(--color-surface-2)]"
                  onClick={handleMarkViolation}
                >
                  <ChartBarDecreasing className="mr-2 h-4 w-4" aria-hidden="true" />
                  Mark violation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[var(--color-border)] bg-[var(--color-card)] text-foreground hover:bg-[var(--color-muted)]"
                  onClick={handleExport}
                >
                  <SquareActivity className="mr-2 h-4 w-4" aria-hidden="true" />
                  Export data
                </Button>
              </div>

              <Separator className="bg-[var(--color-border)]" />

              <div className="space-y-4">
                <SummaryRow
                  label="Available spots"
                  value={isLoading ? undefined : available.toString()}
                  hint={isLoading ? undefined : "across all zones"}
                />
                <SummaryRow
                  label="Estimated turnover"
                  value={
                    isLoading
                      ? undefined
                      : `${Math.round((mergedMetrics.reservations / mergedMetrics.capacity) * 100)}%`
                  }
                  hint="reservations vs capacity"
                />
                <SummaryRow
                  label="Revenue per occupied"
                  value={
                    isLoading
                      ? undefined
                      : formatCurrency(
                          mergedMetrics.occupied
                            ? mergedMetrics.revenue / mergedMetrics.occupied
                            : 0
                        )
                  }
                  hint="today"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </TooltipProvider>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon,
  children,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  change?: number;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)]">
            {icon}
          </div>
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        {typeof change === "number" ? (
          <div
            className={cn(
              "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
              change > 0
                ? "bg-[color:rgba(34,197,94,0.12)]"
                : change < 0
                ? "bg-[color:rgba(239,68,68,0.12)]"
                : "bg-[var(--color-muted)]"
            )}
            aria-label={`${title} change ${change > 0 ? "+" : ""}${change}%`}
          >
            <span className={cn("mr-1", trendColor(change))}>
              {trendIcon(change)}
            </span>
            <span className={cn(trendColor(change))}>
              {change > 0 ? "+" : ""}
              {change}%
            </span>
          </div>
        ) : (
          <div className="h-6 w-16">
            {!subtitle && <Skeleton className="h-6 w-full rounded bg-muted" />}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl font-bold leading-none sm:text-3xl">
              {value}
            </div>
            {subtitle && (
              <div className="mt-1 text-xs text-muted-foreground">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type }: { type: ActivityType }) {
  const base = "h-8 w-8 rounded-md flex items-center justify-center";
  if (type === "check-in") {
    return (
      <div
        className={cn(base, "bg-[color:rgba(198,224,98,0.15)]")}
        aria-hidden="true"
        title="Check-in"
      >
        <TrendingUp className="h-4 w-4 text-[var(--color-intransit)]" />
      </div>
    );
  }
  if (type === "check-out") {
    return (
      <div
        className={cn(base, "bg-[color:rgba(59,130,246,0.12)]")}
        aria-hidden="true"
        title="Check-out"
      >
        <Goal className="h-4 w-4 text-[var(--color-on-surface)]" />
      </div>
    );
  }
  return (
    <div
      className={cn(base, "bg-[color:rgba(239,68,68,0.12)]")}
      aria-hidden="true"
      title="Violation"
    >
      <TrendingDown className="h-4 w-4 text-[var(--color-destructive)]" />
    </div>
  );
}

function labelForAction(a: ActivityType) {
  if (a === "check-in") return "Checked in";
  if (a === "check-out") return "Checked out";
  return "Violation reported";
}

function SummaryRow({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="min-w-0">
        {typeof value === "string" ? (
          <span className="text-sm font-bold">{value}</span>
        ) : (
          <Skeleton className="h-4 w-20 rounded bg-muted" />
        )}
      </div>
    </div>
  );
}