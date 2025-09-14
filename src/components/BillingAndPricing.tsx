"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Receipt,
  BanknoteArrowUp,
  BanknoteX,
  ChartGantt,
  DatabaseZap,
  ParkingMeter,
  SquareTerminal,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

type PaymentStatus = "paid" | "unpaid" | "partial";
type PaymentMethod = "card" | "cash" | "terminal" | "invoice";
type Zone = "A" | "B" | "C" | "VIP";

interface TariffRule {
  id: string;
  zone: Zone;
  period: "peak" | "off-peak" | "overnight";
  ratePerHour: number; // in currency units
  graceMinutes: number;
  active: boolean;
}

interface Invoice {
  id: string;
  zone: Zone;
  vehicle: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
  durationMinutes: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  createdAt: string; // ISO
}

interface BillingAndPricingProps {
  className?: string;
  style?: React.CSSProperties;
  defaultCurrency?: string; // e.g., "USD"
}

const ZONES: Zone[] = ["A", "B", "C", "VIP"];
const PERIODS: Array<TariffRule["period"]> = ["peak", "off-peak", "overnight"];
const METHODS: PaymentMethod[] = ["card", "cash", "terminal", "invoice"];

function fmtCurrency(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function minutesBetween(startISO: string, endISO: string): number {
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) / 60000);
}

function calcFee(mins: number, ratePerHour: number, graceMinutes: number) {
  const billable = Math.max(0, mins - graceMinutes);
  const hours = billable / 60;
  return Math.max(0, round2(hours * ratePerHour));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const initialRules: TariffRule[] = [
  { id: uid("rule"), zone: "A", period: "peak", ratePerHour: 4.5, graceMinutes: 10, active: true },
  { id: uid("rule"), zone: "A", period: "off-peak", ratePerHour: 3.2, graceMinutes: 15, active: true },
  { id: uid("rule"), zone: "B", period: "peak", ratePerHour: 3.8, graceMinutes: 10, active: true },
  { id: uid("rule"), zone: "C", period: "off-peak", ratePerHour: 2.5, graceMinutes: 20, active: true },
  { id: uid("rule"), zone: "VIP", period: "peak", ratePerHour: 8.0, graceMinutes: 5, active: true },
  { id: uid("rule"), zone: "VIP", period: "overnight", ratePerHour: 5.0, graceMinutes: 10, active: true },
];

const initialInvoices: Invoice[] = [
  {
    id: "INV-10241",
    zone: "A",
    vehicle: "ABC-1293",
    startedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    durationMinutes: 60,
    amount: 4.5,
    currency: "USD",
    status: "paid",
    method: "card",
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "INV-10242",
    zone: "VIP",
    vehicle: "VIP-8842",
    startedAt: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    durationMinutes: 120,
    amount: 16.0,
    currency: "USD",
    status: "partial",
    method: "invoice",
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: "INV-10243",
    zone: "C",
    vehicle: "C-5518",
    startedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    durationMinutes: 120,
    amount: 5.0,
    currency: "USD",
    status: "unpaid",
    method: "cash",
    createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
  },
];

export default function BillingAndPricing({
  className,
  style,
  defaultCurrency = "USD",
}: BillingAndPricingProps) {
  const [rules, setRules] = React.useState<TariffRule[]>(initialRules);
  const [invoices, setInvoices] = React.useState<Invoice[]>(initialInvoices);

  // Filters
  const [filterStatus, setFilterStatus] = React.useState<PaymentStatus | "all">("all");
  const [filterZone, setFilterZone] = React.useState<Zone | "all">("all");
  const [filterMethod, setFilterMethod] = React.useState<PaymentMethod | "all">("all");
  const [filterFrom, setFilterFrom] = React.useState<string>("");
  const [filterTo, setFilterTo] = React.useState<string>("");

  const [selectedRows, setSelectedRows] = React.useState<Record<string, boolean>>({});

  // Automation / grace config
  const [globalGrace, setGlobalGrace] = React.useState<number>(0);
  const [autoOvernightCap, setAutoOvernightCap] = React.useState<boolean>(true);
  const [overnightCapAmount, setOvernightCapAmount] = React.useState<number>(12);

  // Calculator
  const [calcZone, setCalcZone] = React.useState<Zone>("A");
  const [calcPeriod, setCalcPeriod] = React.useState<TariffRule["period"]>("peak");
  const [calcStart, setCalcStart] = React.useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() - 1);
    return toLocalDateTimeValue(d);
  });
  const [calcEnd, setCalcEnd] = React.useState<string>(() => toLocalDateTimeValue(new Date()));
  const [calcVehicle, setCalcVehicle] = React.useState<string>("");

  const activeRule = React.useMemo(() => {
    const r = rules.find((r) => r.zone === calcZone && r.period === calcPeriod && r.active);
    return r ?? null;
  }, [rules, calcZone, calcPeriod]);

  const calcMins = React.useMemo(() => {
    return minutesBetween(new Date(calcStart).toISOString(), new Date(calcEnd).toISOString());
  }, [calcStart, calcEnd]);

  const previewFee = React.useMemo(() => {
    if (!activeRule) return 0;
    let fee = calcFee(calcMins, activeRule.ratePerHour, activeRule.graceMinutes + globalGrace);
    if (autoOvernightCap && calcPeriod === "overnight") {
      fee = Math.min(fee, overnightCapAmount);
    }
    return round2(fee);
  }, [activeRule, calcMins, globalGrace, autoOvernightCap, overnightCapAmount, calcPeriod]);

  // Derived data for reports
  const revenueByZone = React.useMemo(() => {
    const map = new Map<Zone, number>();
    ZONES.forEach((z) => map.set(z, 0));
    invoices.forEach((inv) => {
      if (inv.status !== "unpaid") {
        map.set(inv.zone, (map.get(inv.zone) || 0) + inv.amount);
      }
    });
    return ZONES.map((z) => ({ zone: z, amount: round2(map.get(z) || 0) }));
  }, [invoices]);

  const totalRevenue = React.useMemo(
    () => round2(invoices.filter((i) => i.status !== "unpaid").reduce((a, b) => a + b.amount, 0)),
    [invoices]
  );
  const unpaidTotal = React.useMemo(
    () => round2(invoices.filter((i) => i.status === "unpaid").reduce((a, b) => a + b.amount, 0)),
    [invoices]
  );

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (filterZone !== "all" && inv.zone !== filterZone) return false;
      if (filterMethod !== "all" && inv.method !== filterMethod) return false;
      if (filterFrom && new Date(inv.createdAt) < new Date(filterFrom)) return false;
      if (filterTo && new Date(inv.createdAt) > new Date(filterTo)) return false;
      return true;
    });
  }, [invoices, filterStatus, filterZone, filterMethod, filterFrom, filterTo]);

  function resetCalcTimes() {
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60000);
    setCalcStart(toLocalDateTimeValue(start));
    setCalcEnd(toLocalDateTimeValue(now));
  }

  function addRule(rule: Omit<TariffRule, "id">) {
    setRules((prev) => [{ id: uid("rule"), ...rule }, ...prev]);
    toast.success("Tariff rule added");
  }

  function updateRuleActive(id: string, active: boolean) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.message("Rule removed");
  }

  function generateInvoiceFromPreview(method: PaymentMethod, status: PaymentStatus) {
    if (!activeRule) {
      toast.error("Please configure a tariff rule for the selected zone and period.");
      return;
    }
    if (!calcVehicle) {
      toast.error("Enter a vehicle plate or ID.");
      return;
    }
    const startedISO = new Date(calcStart).toISOString();
    const endedISO = new Date(calcEnd).toISOString();
    const invoice: Invoice = {
      id: "INV-" + Math.floor(Math.random() * 90000 + 10000),
      zone: calcZone,
      vehicle: calcVehicle,
      startedAt: startedISO,
      endedAt: endedISO,
      durationMinutes: calcMins,
      amount: previewFee,
      currency: defaultCurrency,
      status,
      method,
      createdAt: new Date().toISOString(),
    };
    setInvoices((prev) => [invoice, ...prev]);
    toast.success("Invoice generated");
  }

  function bulkMarkPaid() {
    const ids = Object.entries(selectedRows)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) {
      toast.info("No rows selected");
      return;
    }
    setInvoices((prev) =>
      prev.map((inv) =>
        ids.includes(inv.id) ? { ...inv, status: "paid", method: inv.method || "card" } : inv
      )
    );
    setSelectedRows({});
    toast.success(`Marked ${ids.length} invoice(s) as paid`);
  }

  function bulkDelete() {
    const ids = Object.entries(selectedRows)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) {
      toast.info("No rows selected");
      return;
    }
    setInvoices((prev) => prev.filter((inv) => !ids.includes(inv.id)));
    setSelectedRows({});
    toast.message("Deleted selected invoices");
  }

  function exportCSV() {
    const headers = [
      "id",
      "zone",
      "vehicle",
      "startedAt",
      "endedAt",
      "durationMinutes",
      "amount",
      "currency",
      "status",
      "method",
      "createdAt",
    ];
    const rows = filteredInvoices.map((i) => [
      i.id,
      i.zone,
      i.vehicle,
      i.startedAt,
      i.endedAt,
      i.durationMinutes.toString(),
      i.amount.toFixed(2),
      i.currency,
      i.status,
      i.method,
      i.createdAt,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `billing-records-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  function csvEscape(s: string) {
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const [newRule, setNewRule] = React.useState<Omit<TariffRule, "id">>({
    zone: "A",
    period: "peak",
    ratePerHour: 3.0,
    graceMinutes: 15,
    active: true,
  });

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={cn(
          "bg-card text-card-foreground border border-border rounded-lg w-full max-w-full",
          className
        )}
        style={style}
      >
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <ParkingMeter className="size-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-lg md:text-xl">Billing & Pricing</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Manage tariffs, calculate fees, generate invoices, and track payments with real-time
            insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="rates" className="w-full">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <TabsList className="bg-secondary/60">
                <TabsTrigger value="rates" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ChartGantt className="mr-2 size-4" aria-hidden="true" /> Rates
                </TabsTrigger>
                <TabsTrigger value="calculator" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Ticket className="mr-2 size-4" aria-hidden="true" /> Calculator
                </TabsTrigger>
                <TabsTrigger value="checkout" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CreditCard className="mr-2 size-4" aria-hidden="true" /> Checkout
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Receipt className="mr-2 size-4" aria-hidden="true" /> History
                </TabsTrigger>
                <TabsTrigger value="automation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <DatabaseZap className="mr-2 size-4" aria-hidden="true" /> Automation
                </TabsTrigger>
                <TabsTrigger value="reports" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BanknoteArrowUp className="mr-2 size-4" aria-hidden="true" /> Reports
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="bg-secondary hover:bg-secondary/80"
                  onClick={() => {
                    resetCalcTimes();
                    toast.message("Reset time range to last 1 hour");
                  }}
                >
                  Quick Reset
                </Button>
              </div>
            </div>

            <Separator className="my-4 bg-border" />

            <TabsContent value="rates" className="space-y-6">
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">Tariff Management</CardTitle>
                      <CardDescription>Define rates by zone and time period.</CardDescription>
                    </div>
                    <Badge className="bg-primary/15 text-primary">Live</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="rule-zone">Zone</Label>
                      <Select
                        value={newRule.zone}
                        onValueChange={(v: Zone) => setNewRule((r) => ({ ...r, zone: v }))}
                      >
                        <SelectTrigger id="rule-zone" className="bg-muted border-border">
                          <SelectValue placeholder="Select zone" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {ZONES.map((z) => (
                            <SelectItem key={z} value={z}>
                              {z}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rule-period">Period</Label>
                      <Select
                        value={newRule.period}
                        onValueChange={(v: TariffRule["period"]) =>
                          setNewRule((r) => ({ ...r, period: v }))
                        }
                      >
                        <SelectTrigger id="rule-period" className="bg-muted border-border">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {PERIODS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {labelPeriod(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rule-rate">Rate/hr</Label>
                      <Input
                        id="rule-rate"
                        inputMode="decimal"
                        type="number"
                        step="0.1"
                        min={0}
                        value={newRule.ratePerHour}
                        onChange={(e) =>
                          setNewRule((r) => ({ ...r, ratePerHour: Number(e.target.value || 0) }))
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rule-grace">Grace (min)</Label>
                      <Input
                        id="rule-grace"
                        type="number"
                        min={0}
                        value={newRule.graceMinutes}
                        onChange={(e) =>
                          setNewRule((r) => ({ ...r, graceMinutes: Number(e.target.value || 0) }))
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => addRule(newRule)}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Add Rule
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Zone</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Rate/hr</TableHead>
                          <TableHead>Grace</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right pr-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rules.map((r) => (
                          <TableRow key={r.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{r.zone}</TableCell>
                            <TableCell>{labelPeriod(r.period)}</TableCell>
                            <TableCell>{fmtCurrency(r.ratePerHour, defaultCurrency)}</TableCell>
                            <TableCell>{r.graceMinutes} min</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  aria-label={`Toggle rule ${r.id}`}
                                  checked={r.active}
                                  onCheckedChange={(v) => updateRuleActive(r.id, !!v)}
                                />
                                {r.active ? (
                                  <Badge className="bg-green-500/15 text-green-400">Active</Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => removeRule(r.id)}
                                  >
                                    Remove
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-popover border-border">
                                  Remove rule
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                        {rules.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No rules yet. Add your first tariff rule.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calculator" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="md:col-span-3 bg-secondary border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Fee Calculation</CardTitle>
                    <CardDescription>Real-time preview based on configured rates.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Zone</Label>
                      <Select value={calcZone} onValueChange={(v: Zone) => setCalcZone(v)}>
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="Select zone" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {ZONES.map((z) => (
                            <SelectItem key={z} value={z}>
                              {z}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Period</Label>
                      <Select
                        value={calcPeriod}
                        onValueChange={(v: TariffRule["period"]) => setCalcPeriod(v)}
                      >
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {PERIODS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {labelPeriod(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calc-start">Start</Label>
                      <Input
                        id="calc-start"
                        type="datetime-local"
                        value={calcStart}
                        onChange={(e) => setCalcStart(e.target.value)}
                        className="bg-muted border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calc-end">End</Label>
                      <Input
                        id="calc-end"
                        type="datetime-local"
                        value={calcEnd}
                        onChange={(e) => setCalcEnd(e.target.value)}
                        className="bg-muted border-border"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="calc-vehicle">Vehicle</Label>
                      <Input
                        id="calc-vehicle"
                        placeholder="e.g., ABC-1293"
                        value={calcVehicle}
                        onChange={(e) => setCalcVehicle(e.target.value)}
                        className="bg-muted border-border"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Duration:{" "}
                      <span className="text-foreground font-semibold">
                        {calcMins} min ({(calcMins / 60).toFixed(2)} h)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="bg-secondary hover:bg-secondary/80"
                        onClick={resetCalcTimes}
                      >
                        Reset
                      </Button>
                    </div>
                  </CardFooter>
                </Card>

                <Card className="md:col-span-2 bg-secondary border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Preview</CardTitle>
                    <CardDescription>Live fee breakdown and invoice actions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted/40 p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Rate/hr</div>
                          <div className="text-foreground font-semibold">
                            {activeRule
                              ? fmtCurrency(activeRule.ratePerHour, defaultCurrency)
                              : "No rule"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Grace total</div>
                          <div className="text-foreground font-semibold">
                            {activeRule ? activeRule.graceMinutes + globalGrace : 0} min
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="text-sm text-muted-foreground">Est. Total</div>
                          <div className="text-xl font-bold text-primary">
                            {fmtCurrency(previewFee, defaultCurrency)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => generateInvoiceFromPreview("card", "paid")}
                      >
                        <CreditCard className="mr-2 size-4" /> Charge Card
                      </Button>
                      <Button
                        variant="secondary"
                        className="bg-secondary hover:bg-secondary/80"
                        onClick={() => generateInvoiceFromPreview("cash", "paid")}
                      >
                        <Ticket className="mr-2 size-4" /> Cash
                      </Button>
                      <Button
                        variant="secondary"
                        className="bg-secondary hover:bg-secondary/80"
                        onClick={() => generateInvoiceFromPreview("terminal", "paid")}
                      >
                        <SquareTerminal className="mr-2 size-4" /> Terminal
                      </Button>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full border-border bg-card hover:bg-muted/30">
                          <Receipt className="mr-2 size-4" /> Generate Invoice (Unpaid)
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-popover border-border">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Receipt className="size-5 text-primary" /> Invoice Preview
                          </DialogTitle>
                          <DialogDescription>
                            Review details before creating an unpaid invoice.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Vehicle</span>
                            <span className="font-medium">{calcVehicle || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Zone / Period</span>
                            <span className="font-medium">
                              {calcZone} / {labelPeriod(calcPeriod)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time</span>
                            <span className="font-medium break-words text-right">
                              {formatDate(calcStart)} → {formatDate(calcEnd)}
                            </span>
                          </div>
                          <Separator className="my-2 bg-border" />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-bold text-primary">
                              {fmtCurrency(previewFee, defaultCurrency)}
                            </span>
                          </div>
                        </div>
                        <DialogFooter className="gap-2">
                          <Button
                            variant="secondary"
                            className="bg-secondary hover:bg-secondary/80"
                            onClick={() => generateInvoiceFromPreview("invoice", "unpaid")}
                          >
                            Create Unpaid Invoice
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="checkout" className="space-y-6">
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle className="text-base">Checkout</CardTitle>
                  <CardDescription>Collect payment with a clear fee breakdown.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-3 space-y-4">
                    <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">
                          {fmtCurrency(previewFee, defaultCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Taxes (10%)</span>
                        <span className="font-medium">
                          {fmtCurrency(round2(previewFee * 0.1), defaultCurrency)}
                        </span>
                      </div>
                      <Separator className="bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="text-primary font-bold">
                          {fmtCurrency(round2(previewFee * 1.1), defaultCurrency)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <PayButton
                        icon={<CreditCard className="mr-2 size-4" />}
                        label="Pay by Card"
                        onClick={() => generateInvoiceFromPreview("card", "paid")}
                      />
                      <PayButton
                        icon={<SquareTerminal className="mr-2 size-4" />}
                        label="Pay at Terminal"
                        onClick={() => generateInvoiceFromPreview("terminal", "paid")}
                      />
                      <PayButton
                        icon={<Ticket className="mr-2 size-4" />}
                        label="Record Cash"
                        onClick={() => generateInvoiceFromPreview("cash", "paid")}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select defaultValue="card">
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="terminal">Terminal</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input className="bg-muted border-border" placeholder="Optional note" />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-border bg-card hover:bg-muted/30"
                      onClick={() => generateInvoiceFromPreview("invoice", "partial")}
                    >
                      <Receipt className="mr-2 size-4" /> Create Partial Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle className="text-base">Billing History</CardTitle>
                  <CardDescription>Filter and manage previous invoices.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Zone</Label>
                      <Select value={filterZone} onValueChange={(v: any) => setFilterZone(v)}>
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="All zones" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="all">All</SelectItem>
                          {ZONES.map((z) => (
                            <SelectItem key={z} value={z}>
                              {z}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Select value={filterMethod} onValueChange={(v: any) => setFilterMethod(v)}>
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="All methods" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="all">All</SelectItem>
                          {METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {labelMethod(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>From</Label>
                      <Input
                        type="date"
                        className="bg-muted border-border"
                        value={filterFrom}
                        onChange={(e) => setFilterFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To</Label>
                      <Input
                        type="date"
                        className="bg-muted border-border"
                        value={filterTo}
                        onChange={(e) => setFilterTo(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      className="bg-secondary hover:bg-secondary/80"
                      onClick={() => {
                        setFilterStatus("all");
                        setFilterZone("all");
                        setFilterMethod("all");
                        setFilterFrom("");
                        setFilterTo("");
                      }}
                    >
                      Reset Filters
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border bg-card hover:bg-muted/30"
                      onClick={exportCSV}
                    >
                      Export CSV
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="bg-green-600/20 text-green-400 hover:bg-green-600/30"
                        onClick={bulkMarkPaid}
                      >
                        Mark Paid
                      </Button>
                      <Button
                        variant="destructive"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={bulkDelete}
                      >
                        <BanknoteX className="mr-2 size-4" /> Delete
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-8">
                            <Checkbox
                              aria-label="Select all"
                              checked={
                                filteredInvoices.length > 0 &&
                                filteredInvoices.every((i) => selectedRows[i.id])
                              }
                              onCheckedChange={(v) => {
                                const next: Record<string, boolean> = {};
                                filteredInvoices.forEach((i) => (next[i.id] = !!v));
                                setSelectedRows(next);
                              }}
                            />
                          </TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Zone</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((inv) => (
                          <TableRow key={inv.id} className="hover:bg-muted/30">
                            <TableCell>
                              <Checkbox
                                aria-label={`Select ${inv.id}`}
                                checked={!!selectedRows[inv.id]}
                                onCheckedChange={(v) =>
                                  setSelectedRows((prev) => ({ ...prev, [inv.id]: !!v }))
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium min-w-0">{inv.id}</TableCell>
                            <TableCell>{inv.zone}</TableCell>
                            <TableCell className="min-w-0">{inv.vehicle}</TableCell>
                            <TableCell>{fmtCurrency(inv.amount, inv.currency)}</TableCell>
                            <TableCell>{renderStatus(inv.status)}</TableCell>
                            <TableCell>{labelMethod(inv.method)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(inv.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredInvoices.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              No invoices match the current filters.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automation" className="space-y-6">
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle className="text-base">Automated Billing Rules</CardTitle>
                  <CardDescription>
                    Configure grace periods and automated caps for specific periods.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="global-grace">Global Grace Minutes</Label>
                      <Input
                        id="global-grace"
                        type="number"
                        min={0}
                        value={globalGrace}
                        onChange={(e) => setGlobalGrace(Number(e.target.value || 0))}
                        className="bg-muted border-border"
                      />
                      <p className="text-sm text-muted-foreground">
                        Added on top of rule-specific grace minutes.
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
                      <div className="space-y-1">
                        <div className="font-medium">Overnight Cap</div>
                        <div className="text-sm text-muted-foreground">
                          Limit overnight charges to a maximum amount.
                        </div>
                      </div>
                      <Switch
                        checked={autoOvernightCap}
                        onCheckedChange={(v) => setAutoOvernightCap(!!v)}
                        aria-label="Toggle overnight cap"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cap-amount">Cap Amount</Label>
                      <Input
                        id="cap-amount"
                        type="number"
                        min={0}
                        step="0.5"
                        value={overnightCapAmount}
                        onChange={(e) => setOvernightCapAmount(Number(e.target.value || 0))}
                        className="bg-muted border-border"
                        disabled={!autoOvernightCap}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">VIP First 15 Minutes Free</div>
                          <div className="text-sm text-muted-foreground">
                            Automatically apply 15 min grace to VIP zone.
                          </div>
                        </div>
                        <Switch
                          checked={rules.some((r) => r.zone === "VIP" && r.graceMinutes >= 15)}
                          onCheckedChange={(v) => {
                            if (v) {
                              // ensure VIP rules have at least 15 grace
                              setRules((prev) =>
                                prev.map((r) =>
                                  r.zone === "VIP" ? { ...r, graceMinutes: Math.max(r.graceMinutes, 15) } : r
                                )
                              );
                              toast.success("Applied VIP 15-minute grace");
                            } else {
                              setRules((prev) =>
                                prev.map((r) =>
                                  r.zone === "VIP" ? { ...r, graceMinutes: Math.min(r.graceMinutes, 10) } : r
                                )
                              );
                              toast.message("Removed VIP extra grace");
                            }
                          }}
                          aria-label="Toggle VIP 15 min grace"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Adjusts existing VIP rules; new rules will inherit current default grace.
                      </div>
                    </div>

                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => toast.success("Automation rules saved")}
                    >
                      Save Automation Rules
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard
                  title="Total Revenue"
                  value={fmtCurrency(totalRevenue, defaultCurrency)}
                  icon={<BanknoteArrowUp className="size-5 text-primary" aria-hidden="true" />}
                />
                <SummaryCard
                  title="Outstanding"
                  value={fmtCurrency(unpaidTotal, defaultCurrency)}
                  icon={<BanknoteX className="size-5 text-destructive" aria-hidden="true" />}
                />
                <SummaryCard
                  title="Invoices"
                  value={String(invoices.length)}
                  icon={<Receipt className="size-5 text-accent" aria-hidden="true" />}
                />
              </div>

              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Zone</CardTitle>
                  <CardDescription>Distribution of collected payments.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full max-w-full">
                    <BarChart
                      data={revenueByZone.map((d) => ({ label: d.zone, value: d.amount }))}
                      maxBarHeight={180}
                      colorClass="bg-primary"
                      valueFormatter={(v) => fmtCurrency(v, defaultCurrency)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function PayButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      className="w-full bg-primary/15 text-foreground hover:bg-primary/25 border border-border"
      variant="secondary"
    >
      {icon}
      {label}
    </Button>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-muted-foreground font-medium">{title}</CardTitle>
          {icon}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardHeader>
    </Card>
  );
}

function BarChart({
  data,
  maxBarHeight = 160,
  colorClass = "bg-primary",
  valueFormatter = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  maxBarHeight?: number;
  colorClass?: string;
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="w-full max-w-full overflow-x-auto">
      <div className="flex items-end gap-4 h-[220px] p-4">
        {data.map((d) => {
          const h = Math.max(4, Math.round((d.value / max) * maxBarHeight));
          return (
            <div key={d.label} className="flex-1 min-w-[56px]">
              <div
                className={cn("rounded-t-md transition-all duration-300", colorClass)}
                style={{ height: `${h}px` }}
                aria-label={`${d.label} ${valueFormatter(d.value)}`}
              />
              <div className="mt-2 text-xs text-muted-foreground text-center truncate">{d.label}</div>
              <div className="text-xs text-foreground text-center">{valueFormatter(d.value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function labelPeriod(p: TariffRule["period"]) {
  if (p === "peak") return "Peak";
  if (p === "off-peak") return "Off-peak";
  return "Overnight";
}

function labelMethod(m: PaymentMethod) {
  if (m === "card") return "Card";
  if (m === "cash") return "Cash";
  if (m === "terminal") return "Terminal";
  return "Invoice";
}

function renderStatus(s: PaymentStatus) {
  if (s === "paid") {
    return <Badge className="bg-green-600/20 text-green-400">Paid</Badge>;
  }
  if (s === "partial") {
    return <Badge className="bg-amber-500/20 text-amber-400">Partial</Badge>;
  }
  return <Badge className="bg-destructive/20 text-destructive">Unpaid</Badge>;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function toLocalDateTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}