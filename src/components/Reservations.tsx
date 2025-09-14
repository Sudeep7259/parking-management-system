"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  CalendarPlus,
  CalendarPlus2,
  CalendarCheck2,
  CalendarSearch,
  CalendarX,
  CalendarX2,
  CalendarOff,
  CalendarFold,
  Ticket,
  TicketMinus,
  TicketX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ReservationStatus = "confirmed" | "active" | "completed" | "cancelled";

type Reservation = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehiclePlate: string;
  zone: string;
  spot: string;
  start: string; // ISO string
  end: string; // ISO string
  status: ReservationStatus;
  createdAt: string;
  notes?: string;
};

type ReservationsProps = {
  className?: string;
  style?: React.CSSProperties;
  zones?: string[];
  spotsByZone?: Record<string, string[]>;
  initialReservations?: Reservation[];
  pageSize?: number;
};

const DEFAULT_ZONES = ["A", "B", "C", "VIP"];
const DEFAULT_SPOTS: Record<string, string[]> = {
  A: ["A-01", "A-02", "A-03", "A-04", "A-05"],
  B: ["B-01", "B-02", "B-03", "B-04"],
  C: ["C-01", "C-02", "C-03"],
  VIP: ["V-01", "V-02"],
};

function formatDateTime(dt: string | Date) {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function statusColor(status: ReservationStatus) {
  switch (status) {
    case "confirmed":
      return "bg-chart-4/15 text-chart-4 border border-chart-4/30";
    case "active":
      return "bg-primary/15 text-primary border border-primary/30";
    case "completed":
      return "bg-chart-5/15 text-chart-5 border border-chart-5/30";
    case "cancelled":
      return "bg-destructive/15 text-destructive border border-destructive/30";
  }
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

// Simple pseudo-QR SVG generator for demo (not real QR, but scannable-like)
function PseudoQR({ value, size = 160 }: { value: string; size?: number }) {
  const cells = 21;
  const cell = Math.floor(size / cells);
  const pad = Math.floor((size - cell * cells) / 2);
  const h = hashString(value);
  const bits: number[] = [];
  // generate deterministic bits
  let x = h || 1;
  for (let i = 0; i < cells * cells; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    bits.push(Math.abs(x) % 7 === 0 ? 1 : Math.abs(x) % 3 === 0 ? 1 : 0);
  }
  // add three finder squares
  const finder = (r: number, c: number, w: number) => {
    const rects: JSX.Element[] = [];
    const s = (rr: number, cc: number, ww: number) => (
      <rect
        key={`${rr}-${cc}-${ww}`}
        x={pad + cc * cell}
        y={pad + rr * cell}
        width={ww * cell}
        height={ww * cell}
        fill="none"
        stroke="currentColor"
        strokeWidth={cell}
        rx={cell / 2}
        ry={cell / 2}
      />
    );
    rects.push(s(r, c, w));
    rects.push(s(r + 2, c + 2, w - 4));
    return rects;
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR code"
      className="text-foreground"
    >
      <rect x="0" y="0" width={size} height={size} fill="white" />
      {bits.map((b, i) => {
        if (!b) return null;
        const r = Math.floor(i / cells);
        const c = i % cells;
        // keep corners clear for finder patterns
        if (
          (r < 7 && c < 7) ||
          (r < 7 && c > cells - 8) ||
          (r > cells - 8 && c < 7)
        ) {
          return null;
        }
        return (
          <rect
            key={i}
            x={pad + c * cell}
            y={pad + r * cell}
            width={cell}
            height={cell}
            fill="black"
            rx={1}
            ry={1}
          />
        );
      })}
      {/* finder patterns */}
      <g>{finder(0, 0, 7)}</g>
      <g>{finder(0, cells - 7, 7)}</g>
      <g>{finder(cells - 7, 0, 7)}</g>
    </svg>
  );
}

function downloadCSV(filename: string, rows: Reservation[]) {
  const headers = [
    "id",
    "customerName",
    "customerPhone",
    "customerEmail",
    "vehiclePlate",
    "zone",
    "spot",
    "start",
    "end",
    "status",
    "createdAt",
    "notes",
  ];
  const escape = (v: any) =>
    `"${String(v ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
  const csv =
    headers.join(",") +
    "\n" +
    rows
      .map((r) =>
        [
          r.id,
          r.customerName,
          r.customerPhone,
          r.customerEmail ?? "",
          r.vehiclePlate,
          r.zone,
          r.spot,
          r.start,
          r.end,
          r.status,
          r.createdAt,
          r.notes ?? "",
        ]
          .map(escape)
          .join(",")
      )
      .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Reservations({
  className,
  style,
  zones = DEFAULT_ZONES,
  spotsByZone = DEFAULT_SPOTS,
  initialReservations,
  pageSize = 8,
}: ReservationsProps) {
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    if (initialReservations && initialReservations.length) {
      return initialReservations;
    }
    const now = new Date();
    const sample: Reservation[] = [
      {
        id: "RSV-001",
        customerName: "Alex Johnson",
        customerPhone: "555-123-4567",
        customerEmail: "alex@example.com",
        vehiclePlate: "7ABC123",
        zone: "A",
        spot: "A-01",
        start: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        end: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        status: "confirmed",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        notes: "Preferred near exit",
      },
      {
        id: "RSV-002",
        customerName: "Maria Gomez",
        customerPhone: "555-987-6543",
        customerEmail: "maria@example.com",
        vehiclePlate: "8XYZ789",
        zone: "B",
        spot: "B-02",
        start: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        end: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        status: "active",
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "RSV-003",
        customerName: "Chris Lee",
        customerPhone: "555-444-2211",
        customerEmail: "chris@example.com",
        vehiclePlate: "5KLM456",
        zone: "C",
        spot: "C-01",
        start: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        end: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        status: "completed",
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    return sample;
  });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">(
    "all"
  );
  const [zoneFilter, setZoneFilter] = useState<string | "all">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);

  // Selection for bulk actions
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Modal / dialogs
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = reservations.find((r) => r.id === detailId) || null;
  const [createOpen, setCreateOpen] = useState(false);

  // Creation form state
  const [form, setForm] = useState<Partial<Reservation>>({
    zone: zones[0],
    spot: spotsByZone[zones[0]]?.[0],
    status: "confirmed",
  });
  const [formStart, setFormStart] = useState<string>("");
  const [formEnd, setFormEnd] = useState<string>("");
  const [formConflict, setFormConflict] = useState<string | null>(null);

  // Calendar view
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    // auto status transitions (active/completed)
    const id = setInterval(() => {
      const now = new Date();
      setReservations((prev) =>
        prev.map((r) => {
          if (r.status === "cancelled") return r;
          const s = new Date(r.start);
          const e = new Date(r.end);
          if (now >= s && now < e) {
            if (r.status !== "active") return { ...r, status: "active" };
          } else if (now >= e) {
            if (r.status !== "completed") return { ...r, status: "completed" };
          }
          return r;
        })
      );
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // Conflict detection for creation form
  useEffect(() => {
    if (!form.zone || !form.spot || !formStart || !formEnd) {
      setFormConflict(null);
      return;
    }
    const start = new Date(formStart);
    const end = new Date(formEnd);
    if (isNaN(+start) || isNaN(+end) || start >= end) {
      setFormConflict("Invalid time window.");
      return;
    }
    const conflictWith = reservations.find((r) => {
      if (r.zone !== form.zone || r.spot !== form.spot) return false;
      if (r.status === "cancelled" || r.status === "completed") return false;
      return rangesOverlap(start, end, new Date(r.start), new Date(r.end));
    });
    setFormConflict(conflictWith ? `Conflicts with ${conflictWith.id}` : null);
  }, [form.zone, form.spot, formStart, formEnd, reservations]);

  const filtered = useMemo(() => {
    let rows = reservations.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.vehiclePlate.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (zoneFilter !== "all") {
      rows = rows.filter((r) => r.zone === zoneFilter);
    }
    if (dateFrom) {
      const d = new Date(dateFrom);
      rows = rows.filter((r) => new Date(r.start) >= d);
    }
    if (dateTo) {
      const d = new Date(dateTo);
      rows = rows.filter((r) => new Date(r.end) <= d);
    }
    // sort by start desc
    rows.sort((a, b) => +new Date(b.start) - +new Date(a.start));
    return rows;
  }, [reservations, search, statusFilter, zoneFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  // Handlers
  function resetForm() {
    const z = zones[0];
    setForm({
      zone: z,
      spot: spotsByZone[z]?.[0],
      status: "confirmed",
    });
    setFormStart("");
    setFormEnd("");
    setFormConflict(null);
  }

  function handleCreateReservation() {
    if (
      !form.customerName ||
      !form.customerPhone ||
      !form.vehiclePlate ||
      !form.zone ||
      !form.spot ||
      !formStart ||
      !formEnd
    ) {
      toast.error("Please complete all required fields.");
      return;
    }
    if (formConflict) {
      toast.error("Cannot create reservation due to time conflict.");
      return;
    }
    const id = `RSV-${(reservations.length + 1).toString().padStart(3, "0")}`;
    const newRes: Reservation = {
      id,
      customerName: form.customerName!,
      customerPhone: form.customerPhone!,
      customerEmail: form.customerEmail?.trim() || undefined,
      vehiclePlate: form.vehiclePlate!,
      zone: form.zone!,
      spot: form.spot!,
      start: new Date(formStart).toISOString(),
      end: new Date(formEnd).toISOString(),
      status: (form.status as ReservationStatus) || "confirmed",
      createdAt: new Date().toISOString(),
      notes: form.notes?.trim() || undefined,
    };
    setReservations((prev) => [newRes, ...prev]);
    setCreateOpen(false);
    resetForm();
    toast.success("Reservation created");
  }

  function bulkCancel(ids: string[]) {
    if (!ids.length) return;
    setReservations((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: "cancelled" } : r))
    );
    setSelected({});
    toast.message("Reservations cancelled", { description: `${ids.length} updated` });
  }

  function changeStatus(id: string, status: ReservationStatus) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success("Status updated");
  }

  function extendReservation(id: string, minutes: number) {
    const res = reservations.find((r) => r.id === id);
    if (!res) return;
    const candidateEnd = new Date(new Date(res.end).getTime() + minutes * 60_000);
    const conflict = reservations.find((r) => {
      if (r.id === id) return false;
      if (r.zone !== res.zone || r.spot !== res.spot) return false;
      if (r.status === "cancelled" || r.status === "completed") return false;
      return rangesOverlap(new Date(res.start), candidateEnd, new Date(r.start), new Date(r.end));
    });
    if (conflict) {
      toast.error(`Cannot extend: conflicts with ${conflict.id}`);
      return;
    }
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, end: candidateEnd.toISOString() } : r))
    );
    toast.success(`Extended by ${minutes}m`);
  }

  function isRowConflicted(r: Reservation) {
    return reservations.some((o) => {
      if (o.id === r.id) return false;
      if (o.zone !== r.zone || o.spot !== r.spot) return false;
      if (o.status === "cancelled" || o.status === "completed") return false;
      if (r.status === "cancelled" || r.status === "completed") return false;
      return rangesOverlap(new Date(r.start), new Date(r.end), new Date(o.start), new Date(o.end));
    });
  }

  const allCurrentPageSelected = pageRows.length > 0 && pageRows.every((r) => selected[r.id]);
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  // Calendar helper
  const hours = Array.from({ length: 12 }, (_, i) => 7 + i); // 7:00 - 19:00
  const calendarRows = useMemo(() => {
    const day = new Date(calendarDate);
    if (isNaN(+day)) return [];
    // items that intersect this day
    return reservations.filter((r) => {
      const s = new Date(r.start);
      const e = new Date(r.end);
      return (
        s.toDateString() === day.toDateString() ||
        e.toDateString() === day.toDateString() ||
        (s < new Date(day.setHours(23, 59, 59, 999)) &&
          e > new Date(new Date(calendarDate).setHours(0, 0, 0, 0)))
      );
    });
  }, [reservations, calendarDate]);

  const calendarZones = zones;

  return (
    <section className={cn("w-full max-w-full", className)} style={style} aria-label="Reservations">
      <div className="w-full bg-card rounded-2xl border border-border p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Reservations
            </h2>
            <p className="text-muted-foreground mt-1">
              Create, manage, and schedule parking reservations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
              onClick={() => {
                if (!filtered.length) return toast.message("No reservations to export");
                downloadCSV(
                  `reservations-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered
                );
              }}
            >
              <Ticket className="size-4 mr-2" />
              Export CSV
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
            >
              <CalendarPlus className="size-4 mr-2" />
              New Reservation
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "list" | "calendar")}
          className="mt-6"
        >
          <TabsList className="bg-secondary">
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="col-span-1 sm:col-span-2">
                <Label htmlFor="search" className="sr-only">
                  Search
                </Label>
                <div className="relative">
                  <CalendarSearch className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by ID, name, or plate"
                    className="pl-9 bg-secondary border-input text-foreground placeholder:text-muted-foreground"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status" className="text-sm text-muted-foreground">
                  Status
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="status" className="bg-secondary border-input">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="zone" className="text-sm text-muted-foreground">
                  Zone
                </Label>
                <Select
                  value={zoneFilter}
                  onValueChange={(v) => {
                    setZoneFilter(v as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="zone" className="bg-secondary border-input">
                    <SelectValue placeholder="All zones" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All</SelectItem>
                    {zones.map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label htmlFor="from" className="text-sm text-muted-foreground">
                  From
                </Label>
                <Input
                  id="from"
                  type="datetime-local"
                  className="bg-secondary border-input text-foreground"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="to" className="text-sm text-muted-foreground">
                  To
                </Label>
                <Input
                  id="to"
                  type="datetime-local"
                  className="bg-secondary border-input text-foreground"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-secondary">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allCurrentPageSelected}
                    onCheckedChange={(v) => {
                      const val = Boolean(v);
                      const next = { ...selected };
                      pageRows.forEach((r) => (next[r.id] = val));
                      setSelected(next);
                    }}
                    aria-label="Select all on page"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-card hover:bg-card/80"
                    onClick={() => bulkCancel(selectedIds)}
                    disabled={selectedIds.length === 0}
                  >
                    <TicketX className="size-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-card hover:bg-card/80"
                    onClick={() => {
                      if (!selectedIds.length) {
                        toast.message("No reservations selected");
                        return;
                      }
                      downloadCSV("reservations-selection.csv", reservations.filter((r) => selectedIds.includes(r.id)));
                    }}
                    disabled={selectedIds.length === 0}
                  >
                    <TicketMinus className="size-4 mr-2" />
                    Export Selected
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10"></TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="min-w-0">Vehicle</TableHead>
                      <TableHead>Zone/Spot</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <CalendarOff className="size-10 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">
                              No reservations found with current filters
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((r) => {
                        const conflict = isRowConflicted(r);
                        return (
                          <TableRow
                            key={r.id}
                            className={cn(
                              "hover:bg-card/40 transition-colors",
                              conflict && "outline outline-1 outline-destructive/40"
                            )}
                          >
                            <TableCell className="w-10">
                              <Checkbox
                                checked={!!selected[r.id]}
                                onCheckedChange={(v) =>
                                  setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))
                                }
                                aria-label={`Select ${r.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{r.id}</TableCell>
                            <TableCell className="min-w-0">
                              <div className="flex flex-col">
                                <span className="truncate">{r.customerName}</span>
                                <small className="text-muted-foreground">{r.customerPhone}</small>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-0">
                              <div className="flex flex-col">
                                <span className="truncate">{r.vehiclePlate}</span>
                                {r.customerEmail && (
                                  <small className="text-muted-foreground truncate">{r.customerEmail}</small>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>
                                  Zone {r.zone} • {r.spot}
                                </span>
                                {conflict && (
                                  <small className="text-destructive">Conflict detected</small>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDateTime(r.start)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDateTime(r.end)}
                            </TableCell>
                            <TableCell>
                              <span className={cn("px-2 py-1 rounded-md text-xs font-semibold", statusColor(r.status))}>
                                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-card"
                                  onClick={() => setDetailId(r.id)}
                                  aria-label="View details"
                                >
                                  <CalendarSearch className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-card"
                                  onClick={() => extendReservation(r.id, 30)}
                                  aria-label="Extend 30 minutes"
                                >
                                  <CalendarPlus2 className="size-4" />
                                </Button>
                                {r.status !== "cancelled" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:bg-card text-destructive"
                                    onClick={() => changeStatus(r.id, "cancelled")}
                                    aria-label="Cancel"
                                  >
                                    <CalendarX className="size-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <small className="text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} -{" "}
                  {Math.min(page * pageSize, filtered.length)} of {filtered.length}
                </small>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((p) => Math.max(1, p - 1));
                        }}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <Badge variant="outline" className="bg-card border-input">
                        {page} / {totalPages}
                      </Badge>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((p) => Math.min(totalPages, p + 1));
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 min-w-0">
                <Label htmlFor="calDate" className="text-sm text-muted-foreground">
                  Date
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="calDate"
                    type="date"
                    className="bg-secondary border-input text-foreground w-full sm:max-w-xs"
                    value={calendarDate}
                    onChange={(e) => setCalendarDate(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="bg-secondary"
                    onClick={() => setCalendarDate(new Date().toISOString().slice(0, 10))}
                  >
                    <Calendar className="size-4 mr-2" />
                    Today
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-card border-input">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-primary inline-block" /> Active
                  </span>
                </Badge>
                <Badge variant="outline" className="bg-card border-input">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-chart-4 inline-block" /> Confirmed
                  </span>
                </Badge>
                <Badge variant="outline" className="bg-card border-input">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-chart-5 inline-block" /> Completed
                  </span>
                </Badge>
                <Badge variant="outline" className="bg-card border-input">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-destructive inline-block" /> Cancelled
                  </span>
                </Badge>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-secondary overflow-hidden">
              <div className="grid grid-cols-12">
                <div className="col-span-2 border-r border-border p-3">
                  <div className="space-y-2">
                    {hours.map((h) => (
                      <div key={h} className="h-16 text-xs text-muted-foreground">
                        {String(h).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-10 min-w-0 overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${calendarZones.length}, minmax(0, 1fr))` }}>
                      {calendarZones.map((z) => (
                        <div key={z} className="border-l first:border-l-0 border-border">
                          <div className="px-3 py-2 border-b border-border sticky top-0 bg-secondary/95 backdrop-blur supports-[backdrop-filter]:bg-secondary/70 z-10">
                            <div className="text-sm font-semibold">Zone {z}</div>
                          </div>
                          <div className="relative">
                            {hours.map((h) => (
                              <div key={h} className="h-16 border-b border-border/60" />
                            ))}
                            {/* blocks */}
                            {calendarRows
                              .filter((r) => r.zone === z)
                              .map((r) => {
                                const start = new Date(r.start);
                                const end = new Date(r.end);
                                const day = new Date(calendarDate);
                                const dayStart = new Date(day.setHours(7, 0, 0, 0));
                                const dayEnd = new Date(new Date(calendarDate).setHours(19, 0, 0, 0));
                                const clampedStart = start < dayStart ? dayStart : start;
                                const clampedEnd = end > dayEnd ? dayEnd : end;
                                const totalMinutes = (dayEnd.getTime() - dayStart.getTime()) / 60000;
                                const startOffset = (clampedStart.getTime() - dayStart.getTime()) / 60000;
                                const duration = Math.max(20, (clampedEnd.getTime() - clampedStart.getTime()) / 60000);
                                const top = (startOffset / totalMinutes) * (hours.length * 64);
                                const height = (duration / totalMinutes) * (hours.length * 64);
                                let bg = "bg-card";
                                if (r.status === "active") bg = "bg-primary/30";
                                else if (r.status === "confirmed") bg = "bg-chart-4/30";
                                else if (r.status === "completed") bg = "bg-chart-5/30";
                                else if (r.status === "cancelled") bg = "bg-destructive/30";
                                return (
                                  <button
                                    key={r.id}
                                    className={cn(
                                      "absolute left-3 right-3 rounded-lg border border-border text-left p-3 hover:brightness-110 transition-colors",
                                      bg
                                    )}
                                    style={{ top, height }}
                                    onClick={() => setDetailId(r.id)}
                                    aria-label={`Open ${r.id}`}
                                  >
                                    <div className="text-xs font-semibold flex items-center justify-between gap-2">
                                      <span>{r.spot}</span>
                                      <span className="px-1.5 py-0.5 rounded bg-card/50 border border-border text-[10px]">
                                        {r.status}
                                      </span>
                                    </div>
                                    <div className="text-xs mt-1 line-clamp-2 break-words">
                                      {r.customerName} • {r.vehiclePlate}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-1">
                                      {formatDateTime(r.start)} - {formatDateTime(r.end)}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Reservation Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
            <DialogDescription>Fill out the details to create a reservation</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custName">Customer name</Label>
              <Input
                id="custName"
                placeholder="Full name"
                className="bg-secondary border-input"
                value={form.customerName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custPhone">Phone</Label>
              <Input
                id="custPhone"
                placeholder="Contact number"
                className="bg-secondary border-input"
                value={form.customerPhone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custEmail">Email (optional)</Label>
              <Input
                id="custEmail"
                type="email"
                placeholder="email@domain.com"
                className="bg-secondary border-input"
                value={form.customerEmail ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plate">Vehicle plate</Label>
              <Input
                id="plate"
                placeholder="Plate number"
                className="bg-secondary border-input uppercase"
                value={form.vehiclePlate ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, vehiclePlate: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zoneSel">Zone</Label>
              <Select
                value={form.zone ?? ""}
                onValueChange={(v) => {
                  setForm((f) => ({
                    ...f,
                    zone: v,
                    spot: spotsByZone[v]?.[0],
                  }));
                }}
              >
                <SelectTrigger id="zoneSel" className="bg-secondary border-input">
                  <SelectValue placeholder="Select a zone" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {zones.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spotSel">Spot</Label>
              <Select
                value={form.spot ?? ""}
                onValueChange={(v) => setForm((f) => ({ ...f, spot: v }))}
              >
                <SelectTrigger id="spotSel" className="bg-secondary border-input">
                  <SelectValue placeholder="Select a spot" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {(form.zone ? spotsByZone[form.zone] : [])?.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startAt">Start</Label>
              <Input
                id="startAt"
                type="datetime-local"
                className={cn(
                  "bg-secondary border-input",
                  formConflict && "border-destructive/70"
                )}
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endAt">End</Label>
              <Input
                id="endAt"
                type="datetime-local"
                className={cn(
                  "bg-secondary border-input",
                  formConflict && "border-destructive/70"
                )}
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Any preferences or special instructions"
                className="bg-secondary border-input"
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="statusSel">Status</Label>
              <Select
                value={(form.status as string) ?? "confirmed"}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as ReservationStatus }))}
              >
                <SelectTrigger id="statusSel" className="bg-secondary border-input">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {formConflict ? (
            <div className="mt-3 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
              <CalendarX2 className="size-4" />
              {formConflict}
            </div>
          ) : (
            <div className="mt-3 p-3 rounded-lg bg-chart-4/10 border border-chart-4/30 text-chart-4 text-sm flex items-center gap-2">
              <CalendarCheck2 className="size-4" />
              No conflicts detected
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" className="bg-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreateReservation}
              disabled={!!formConflict}
            >
              <CalendarPlus className="size-4 mr-2" />
              Create Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-border">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span className="truncate">{detail.id}</span>
                  <span className={cn("px-2 py-1 rounded-md text-xs font-semibold", statusColor(detail.status))}>
                    {detail.status}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  Reservation details and access code
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Customer</Label>
                    <div className="mt-1 break-words">{detail.customerName}</div>
                    <small className="text-muted-foreground">{detail.customerPhone}</small>
                    {detail.customerEmail && (
                      <div className="text-muted-foreground break-words">{detail.customerEmail}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vehicle</Label>
                    <div className="mt-1">{detail.vehiclePlate}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Zone / Spot</Label>
                      <div className="mt-1">Zone {detail.zone} • {detail.spot}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <div className="mt-1">{formatDateTime(detail.createdAt)}</div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Window</Label>
                    <div className="mt-1">
                      {formatDateTime(detail.start)} - {formatDateTime(detail.end)}
                    </div>
                  </div>
                  {detail.notes && (
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <div className="mt-1 break-words">{detail.notes}</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    {detail.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        className="bg-secondary"
                        onClick={() => extendReservation(detail.id, 30)}
                      >
                        <CalendarPlus2 className="size-4 mr-2" />
                        Extend 30m
                      </Button>
                    )}
                    {detail.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        className="bg-secondary text-destructive"
                        onClick={() => changeStatus(detail.id, "cancelled")}
                      >
                        <CalendarX className="size-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                    {detail.status !== "completed" && detail.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        className="bg-secondary"
                        onClick={() => changeStatus(detail.id, "confirmed")}
                      >
                        <CalendarCheck2 className="size-4 mr-2" />
                        Mark Confirmed
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-secondary p-4">
                  <div className="bg-white p-3 rounded-lg">
                    <PseudoQR value={detail.id + "|" + detail.vehiclePlate} />
                  </div>
                  <div className="text-center mt-3">
                    <div className="font-semibold">Entry QR Code</div>
                    <small className="text-muted-foreground">
                      Present at gate for access
                    </small>
                  </div>
                  <div className="mt-4 w-full">
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        downloadCSV(`${detail.id}.csv`, [detail]);
                      }}
                    >
                      <Ticket className="size-4 mr-2" />
                      Export as CSV
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-2">
                <Button variant="outline" className="bg-secondary" onClick={() => setDetailId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}