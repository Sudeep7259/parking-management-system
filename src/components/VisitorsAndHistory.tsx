"use client"

import React, { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ListFilterPlus,
  Logs,
  SearchCheck,
  History,
  UserCheck,
  UserRoundCheck,
  Undo,
  FileCheck2,
  TicketCheck,
  Clock1,
  BadgeCheck,
  Clock3,
  CalendarSearch,
  ClipboardCheck,
  FileCheck,
  PackageCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Status = "On-site" | "Checked-out" | "Flagged"

type Visit = {
  id: string
  checkInAt: string
  checkOutAt?: string
  zone: string
  violations: number
}

type AuditEntry = {
  id: string
  at: string
  user: string
  action:
    | "check-in"
    | "check-out"
    | "violation-add"
    | "violation-clear"
    | "profile-view"
    | "bulk-check-in"
    | "bulk-check-out"
    | "bulk-export"
    | "edit"
}

export type Visitor = {
  id: string
  driverName: string
  licensePlate: string
  vehicle: string
  zone: string
  status: Status
  lastSeen: string
  checkInAt?: string
  checkOutAt?: string
  violations: number
  visits: Visit[]
  audit: AuditEntry[]
}

type SortKey =
  | "licensePlate"
  | "driverName"
  | "zone"
  | "status"
  | "lastSeen"
  | "violations"

export interface VisitorsAndHistoryProps {
  data?: Visitor[]
  className?: string
  style?: React.CSSProperties
  pageSizeOptions?: number[]
  defaultPageSize?: number
  zones?: string[]
  statuses?: Status[]
}

const defaultZones = ["A", "B", "C", "D", "VIP"]
const defaultStatuses: Status[] = ["On-site", "Checked-out", "Flagged"]

const demoData: Visitor[] = [
  {
    id: "v_1001",
    driverName: "Ava Thompson",
    licensePlate: "8ZX-4412",
    vehicle: "Tesla Model 3",
    zone: "VIP",
    status: "On-site",
    lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    checkInAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    violations: 0,
    visits: [
      {
        id: "visit_1",
        checkInAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        zone: "VIP",
        violations: 0,
      },
    ],
    audit: [
      {
        id: "a1",
        at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        user: "System",
        action: "check-in",
      },
    ],
  },
  {
    id: "v_1002",
    driverName: "Marcus Lee",
    licensePlate: "KJH-2201",
    vehicle: "Ford F-150",
    zone: "B",
    status: "Checked-out",
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    checkInAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    checkOutAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    violations: 1,
    visits: [
      {
        id: "visit_2",
        checkInAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        checkOutAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        zone: "B",
        violations: 1,
      },
      {
        id: "visit_0",
        checkInAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        checkOutAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        zone: "A",
        violations: 0,
      },
    ],
    audit: [
      {
        id: "a2",
        at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        user: "Kiosk-2",
        action: "check-in",
      },
      {
        id: "a3",
        at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        user: "Guard.JS",
        action: "check-out",
      },
      {
        id: "a4",
        at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        user: "ANPR-Cam-B",
        action: "violation-add",
      },
    ],
  },
  {
    id: "v_1003",
    driverName: "Sofia Alvarez",
    licensePlate: "M33-09L",
    vehicle: "Honda Civic",
    zone: "A",
    status: "Flagged",
    lastSeen: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    checkInAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    violations: 2,
    visits: [
      {
        id: "visit_3",
        checkInAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        zone: "A",
        violations: 2,
      },
    ],
    audit: [
      {
        id: "a5",
        at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        user: "Gate-A",
        action: "check-in",
      },
      {
        id: "a6",
        at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        user: "ANPR-Cam-A",
        action: "violation-add",
      },
      {
        id: "a7",
        at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        user: "ANPR-Cam-A",
        action: "violation-add",
      },
    ],
  },
]

function formatDate(t?: string) {
  if (!t) return "—"
  const d = new Date(t)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

function statusColor(s: Status) {
  switch (s) {
    case "On-site":
      return "bg-[--color-intransit] text-[--color-primary-foreground]"
    case "Checked-out":
      return "bg-[--color-success] text-[--color-primary-foreground]"
    case "Flagged":
      return "bg-[--color-destructive] text-[--color-destructive-foreground]"
  }
}

function toCSV(rows: Visitor[]) {
  const headers = [
    "id",
    "driverName",
    "licensePlate",
    "vehicle",
    "zone",
    "status",
    "lastSeen",
    "checkInAt",
    "checkOutAt",
    "violations",
  ]
  const lines = rows.map((v) =>
    [
      v.id,
      v.driverName,
      v.licensePlate,
      v.vehicle,
      v.zone,
      v.status,
      v.lastSeen ?? "",
      v.checkInAt ?? "",
      v.checkOutAt ?? "",
      String(v.violations),
    ]
      .map((x) => `"${String(x).replace(/"/g, '""')}"`)
      .join(","),
  )
  return [headers.join(","), ...lines].join("\n")
}

export default function VisitorsAndHistory({
  data,
  className,
  style,
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  zones = defaultZones,
  statuses = defaultStatuses,
}: VisitorsAndHistoryProps) {
  const [rows, setRows] = useState<Visitor[]>(data && data.length ? data : demoData)

  // Filters
  const [q, setQ] = useState("")
  const [plate, setPlate] = useState("")
  const [driver, setDriver] = useState("")
  const [zone, setZone] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("lastSeen")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // Selection
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  // Modal
  const [active, setActive] = useState<Visitor | null>(null)

  // Simulate real-time updates: bump lastSeen for On-site visitors
  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) =>
        prev.map((v) =>
          v.status === "On-site"
            ? {
                ...v,
                lastSeen: new Date().toISOString(),
              }
            : v,
        ),
      )
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  // Derived filtered rows
  const filtered = useMemo(() => {
    let out = [...rows]
    const qLower = q.trim().toLowerCase()
    const plateLower = plate.trim().toLowerCase()
    const driverLower = driver.trim().toLowerCase()

    out = out.filter((v) => {
      const matchesQ =
        !qLower ||
        v.driverName.toLowerCase().includes(qLower) ||
        v.licensePlate.toLowerCase().includes(qLower) ||
        v.vehicle.toLowerCase().includes(qLower) ||
        v.zone.toLowerCase().includes(qLower) ||
        v.status.toLowerCase().includes(qLower)

      const matchesPlate = !plateLower || v.licensePlate.toLowerCase().includes(plateLower)
      const matchesDriver = !driverLower || v.driverName.toLowerCase().includes(driverLower)
      const matchesZone = zone === "all" || v.zone === zone
      const matchesStatus = status === "all" || v.status === status

      const fromTime = from ? new Date(from).getTime() : undefined
      const toTime = to ? new Date(to).getTime() : undefined
      const last = new Date(v.lastSeen).getTime()
      const matchesFrom = fromTime === undefined || last >= fromTime
      const matchesTo = toTime === undefined || last <= toTime

      return matchesQ && matchesPlate && matchesDriver && matchesZone && matchesStatus && matchesFrom && matchesTo
    })

    out.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      const av = a[sortKey]
      const bv = b[sortKey]
      if (sortKey === "lastSeen") {
        return (new Date(av as string).getTime() - new Date(bv as string).getTime()) * dir
      }
      if (sortKey === "violations") {
        return ((av as number) - (bv as number)) * dir
      }
      return String(av).localeCompare(String(bv)) * dir
    })

    return out
  }, [rows, q, plate, driver, zone, status, from, to, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [q, plate, driver, zone, status, from, to, pageSize])

  // Handlers
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function toggleSelectAll(checked: boolean) {
    const ids = pageRows.map((r) => r.id)
    const next = { ...selected }
    ids.forEach((id) => {
      next[id] = checked
    })
    setSelected(next)
  }

  function isAllSelected() {
    return pageRows.length > 0 && pageRows.every((r) => selected[r.id])
  }

  function clearFilters() {
    setQ("")
    setPlate("")
    setDriver("")
    setZone("all")
    setStatus("all")
    setFrom("")
    setTo("")
  }

  function exportCSV(targetRows: Visitor[]) {
    const csv = toCSV(targetRows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `visitors_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${targetRows.length} row(s) to CSV`)
  }

  function withAudit(v: Visitor, action: AuditEntry["action"]): Visitor {
    const entry: AuditEntry = {
      id: `${v.id}_audit_${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      user: "You",
      action,
    }
    return { ...v, audit: [entry, ...v.audit] }
  }

  function checkInVisitor(id: string) {
    setRows((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        const alreadyOnsite = v.status === "On-site"
        const next: Visitor = withAudit(
          {
            ...v,
            status: "On-site",
            checkInAt: new Date().toISOString(),
            checkOutAt: undefined,
            lastSeen: new Date().toISOString(),
            visits: [
              {
                id: `visit_${Math.random().toString(36).slice(2, 8)}`,
                checkInAt: new Date().toISOString(),
                zone: v.zone,
                violations: 0,
              },
              ...v.visits,
            ],
          },
          "check-in",
        )
        if (!alreadyOnsite) toast.success(`Checked in ${v.driverName}`)
        return next
      }),
    )
  }

  function checkOutVisitor(id: string) {
    setRows((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        const next: Visitor = withAudit(
          {
            ...v,
            status: "Checked-out",
            checkOutAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            visits:
              v.visits.length > 0
                ? [
                    { ...v.visits[0], checkOutAt: new Date().toISOString() },
                    ...v.visits.slice(1),
                  ]
                : v.visits,
          },
          "check-out",
        )
        toast.message(`Checked out ${v.driverName}`)
        return next
      }),
    )
  }

  function addViolation(id: string) {
    setRows((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        const next: Visitor = withAudit(
          {
            ...v,
            status: v.status === "Checked-out" ? "Flagged" : ("Flagged" as Status),
            violations: v.violations + 1,
            visits:
              v.visits.length > 0
                ? [{ ...v.visits[0], violations: v.visits[0].violations + 1 }, ...v.visits.slice(1)]
                : v.visits,
          },
          "violation-add",
        )
        toast.error(`Violation recorded for ${v.driverName}`)
        return next
      }),
    )
  }

  function clearViolations(id: string) {
    setRows((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        const next: Visitor = withAudit(
          {
            ...v,
            violations: 0,
            status: v.status === "Flagged" ? "On-site" : v.status,
          },
          "violation-clear",
        )
        toast.success(`Cleared violations for ${v.driverName}`)
        return next
      }),
    )
  }

  function bulk(action: "check-in" | "check-out" | "export") {
    const ids = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([id]) => id)
    const targets = rows.filter((r) => ids.includes(r.id))
    if (targets.length === 0) {
      toast.info("No rows selected")
      return
    }
    if (action === "export") {
      exportCSV(targets)
      setRows((prev) =>
        prev.map((v) => (ids.includes(v.id) ? withAudit(v, "bulk-export") : v)),
      )
      return
    }
    if (action === "check-in") {
      targets.forEach((t) => checkInVisitor(t.id))
      setRows((prev) => prev.map((v) => (ids.includes(v.id) ? withAudit(v, "bulk-check-in") : v)))
      toast.success(`Checked in ${targets.length} visitor(s)`)
    }
    if (action === "check-out") {
      targets.forEach((t) => checkOutVisitor(t.id))
      setRows((prev) => prev.map((v) => (ids.includes(v.id) ? withAudit(v, "bulk-check-out") : v)))
      toast.message(`Checked out ${targets.length} visitor(s)`)
    }
  }

  function openProfile(v: Visitor) {
    setActive(withAudit(v, "profile-view"))
    setRows((prev) => prev.map((x) => (x.id === v.id ? withAudit(v, "profile-view") : x)))
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <section
      style={style}
      className={cn(
        "w-full max-w-full rounded-[--radius] bg-card text-foreground shadow-sm ring-1 ring-[--border]",
        "p-4 sm:p-6",
        className,
      )}
      aria-label="Visitors and History"
    >
      <header className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Visitor Management</h2>
            <p className="text-muted-foreground text-sm mt-1 break-words">
              Track visitors in real-time, review history, and take actions with confidence.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="bg-[--color-secondary] text-foreground hover:bg-[--color-surface-2]"
              onClick={() => exportCSV(filtered)}
              aria-label="Export CSV for current results"
            >
              <FileCheck className="size-4 mr-2" /> Export CSV
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="bg-[--color-secondary] text-foreground hover:bg-[--color-surface-2]"
                >
                  <ClipboardCheck className="size-4 mr-2" />
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Apply to selected</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => bulk("check-in")}>
                  <UserCheck className="size-4 mr-2" /> Check-in
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulk("check-out")}>
                  <UserRoundCheck className="size-4 mr-2" /> Check-out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulk("export")}>
                  <FileCheck2 className="size-4 mr-2" /> Export Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Tabs defaultValue="filters" className="w-full">
        <TabsList className="bg-[--color-secondary] text-[--color-on-surface]">
          <TabsTrigger value="filters" className="data-[state=active]:text-foreground">
            <ListFilterPlus className="size-4 mr-2" /> Filters
          </TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:text-foreground">
            <SearchCheck className="size-4 mr-2" /> Search
          </TabsTrigger>
        </TabsList>
        <TabsContent value="filters" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">License plate</label>
              <Input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="e.g., ABC-1234"
                className="bg-secondary text-foreground placeholder:text-muted-foreground"
                aria-label="Filter by license plate"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-xs text-muted-foreground mb-1">Driver name</label>
              <Input
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                placeholder="e.g., Jane Doe"
                className="bg-secondary text-foreground placeholder:text-muted-foreground"
                aria-label="Filter by driver name"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Zone</label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger className="bg-secondary text-foreground">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="all">All</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z} value={z}>
                      Zone {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-secondary text-foreground">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="all">All</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <CalendarSearch className="size-3.5" /> From
                </label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="bg-secondary text-foreground"
                  aria-label="From date"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <CalendarSearch className="size-3.5" /> To
                </label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="bg-secondary text-foreground"
                  aria-label="To date"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="secondary"
              className="bg-[--color-secondary] hover:bg-[--color-surface-2] text-foreground"
              onClick={clearFilters}
            >
              <Undo className="size-4 mr-2" /> Reset
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="search" className="mt-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Global search</label>
            <div className="relative">
              <SearchCheck className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search across plate, driver, vehicle, zone, status..."
                className="pl-9 bg-secondary text-foreground placeholder:text-muted-foreground"
                aria-label="Global search"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {filtered.length} result(s) • Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Rows</label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(parseInt(v))}
          >
            <SelectTrigger className="h-8 w-[5.5rem] bg-secondary text-foreground">
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground">
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 rounded-[--radius] bg-[--color-secondary] p-2 ring-1 ring-[--border]">
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader className="[&_tr]:border-b [&_th]:text-muted-foreground">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all on page"
                    checked={isAllSelected()}
                    onCheckedChange={(val) => toggleSelectAll(Boolean(val))}
                  />
                </TableHead>
                <SortableHead label="Plate" active={sortKey === "licensePlate"} dir={sortDir} onClick={() => toggleSort("licensePlate")} />
                <SortableHead label="Driver" active={sortKey === "driverName"} dir={sortDir} onClick={() => toggleSort("driverName")} />
                <SortableHead label="Vehicle" />
                <SortableHead label="Zone" active={sortKey === "zone"} dir={sortDir} onClick={() => toggleSort("zone")} />
                <SortableHead label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />
                <SortableHead label="Last seen" active={sortKey === "lastSeen"} dir={sortDir} onClick={() => toggleSort("lastSeen")} />
                <SortableHead label="Violations" active={sortKey === "violations"} dir={sortDir} onClick={() => toggleSort("violations")} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((v) => {
                const onSite = v.status === "On-site"
                const recentlySeen = Date.now() - new Date(v.lastSeen).getTime() < 3 * 60 * 1000
                return (
                  <TableRow key={v.id} className="hover:bg-[--color-surface-2]/60">
                    <TableCell className="align-middle">
                      <Checkbox
                        aria-label={`Select ${v.driverName}`}
                        checked={!!selected[v.id]}
                        onCheckedChange={(val) =>
                          setSelected((s) => ({ ...s, [v.id]: Boolean(val) }))
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <BadgeCheck className="size-3.5 text-[--color-brand]" />
                        <span className="truncate">{v.licensePlate}</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openProfile(v)}
                        className="text-foreground hover:underline focus:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[--ring] rounded-sm truncate"
                        aria-label={`Open profile of ${v.driverName}`}
                      >
                        {v.driverName}
                      </button>
                    </TableCell>
                    <TableCell className="text-[--color-on-surface]">{v.vehicle}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-[--border] text-[--color-on-surface]">
                        Zone {v.zone}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs", statusColor(v.status))}>
                        {v.status === "On-site" && (
                          <>
                            <Clock1 className="size-3.5" /> On-site
                          </>
                        )}
                        {v.status === "Checked-out" && (
                          <>
                            <Clock3 className="size-3.5" /> Checked-out
                          </>
                        )}
                        {v.status === "Flagged" && (
                          <>
                            <TicketCheck className="size-3.5" /> Flagged
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {onSite && recentlySeen ? (
                          <span
                            className="relative flex h-2.5 w-2.5"
                            aria-label="Recently active"
                            title="Active within last 3 minutes"
                          >
                            <span className="absolute inline-flex h-full w-full rounded-full bg-[--color-accent] opacity-75 animate-ping" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[--color-accent]" />
                          </span>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-[--color-muted-foreground]/40" aria-hidden />
                        )}
                        <span className="text-sm">{formatDate(v.lastSeen)}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(v.violations > 0 ? "text-[--color-destructive]" : "text-[--color-on-surface]")}>
                      {v.violations}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onSite ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 bg-[--color-secondary] hover:bg-[--color-surface-2]"
                            onClick={() => checkOutVisitor(v.id)}
                          >
                            <UserRoundCheck className="size-4 mr-2" /> Check-out
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 bg-[--color-secondary] hover:bg-[--color-surface-2]"
                            onClick={() => checkInVisitor(v.id)}
                          >
                            <UserCheck className="size-4 mr-2" /> Check-in
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 bg-[--color-secondary] hover:bg-[--color-surface-2]"
                              aria-label="More actions"
                            >
                              <Logs className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
                            <DropdownMenuItem onClick={() => openProfile(v)}>
                              <History className="size-4 mr-2" /> View profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addViolation(v.id)}>
                              <TicketCheck className="size-4 mr-2" /> Add violation
                            </DropdownMenuItem>
                            {v.violations > 0 && (
                              <DropdownMenuItem onClick={() => clearViolations(v.id)}>
                                <PackageCheck className="size-4 mr-2" /> Clear violations
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No results found. Adjust filters or search terms.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3">
          <div className="text-xs text-muted-foreground">
            {selectedCount} selected
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 bg-[--color-secondary] hover:bg-[--color-surface-2]"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 bg-[--color-secondary] hover:bg-[--color-surface-2]"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl bg-popover text-popover-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5 text-[--color-brand]" />
              Visitor Profile
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Detailed history, status, and audit trail.
            </DialogDescription>
          </DialogHeader>

          {active && (
            <div className="grid grid-cols-1 gap-6">
              <div className="rounded-[--radius] bg-[--color-secondary] p-4 ring-1 ring-[--border]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-muted-foreground">Driver</div>
                    <div className="font-semibold truncate">{active.driverName}</div>
                    <div className="text-sm text-muted-foreground mt-1 break-words">
                      {active.vehicle} • Plate {active.licensePlate}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-[--border]">
                      Zone {active.zone}
                    </Badge>
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs", statusColor(active.status))}>
                      <BadgeCheck className="size-3.5" /> {active.status}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Check-in</div>
                    <div>{formatDate(active.checkInAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Check-out</div>
                    <div>{formatDate(active.checkOutAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Last seen</div>
                    <div>{formatDate(active.lastSeen)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Violations</div>
                    <div className={cn(active.violations ? "text-[--color-destructive]" : "text-[--color-on-surface]")}>
                      {active.violations}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {active.status !== "On-site" ? (
                    <Button
                      size="sm"
                      className="bg-[--color-brand] text-[--color-primary-foreground] hover:opacity-90"
                      onClick={() => {
                        checkInVisitor(active.id)
                        setActive((a) => (a ? { ...a, status: "On-site", checkInAt: new Date().toISOString() } : a))
                      }}
                    >
                      <UserCheck className="size-4 mr-2" /> Check-in
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-[--color-secondary] hover:bg-[--color-surface-2]"
                      onClick={() => {
                        checkOutVisitor(active.id)
                        setActive((a) => (a ? { ...a, status: "Checked-out", checkOutAt: new Date().toISOString() } : a))
                      }}
                    >
                      <UserRoundCheck className="size-4 mr-2" /> Check-out
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-[--color-secondary] hover:bg-[--color-surface-2]"
                    onClick={() => {
                      addViolation(active.id)
                      setActive((a) => (a ? { ...a, status: "Flagged", violations: a.violations + 1 } : a))
                    }}
                  >
                    <TicketCheck className="size-4 mr-2" /> Add violation
                  </Button>
                  {active.violations > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-[--color-secondary] hover:bg-[--color-surface-2]"
                      onClick={() => {
                        clearViolations(active.id)
                        setActive((a) => (a ? { ...a, violations: 0, status: a.status === "Flagged" ? "On-site" : a.status } : a))
                      }}
                    >
                      <PackageCheck className="size-4 mr-2" /> Clear violations
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[--radius] bg-[--color-secondary] p-4 ring-1 ring-[--border] min-w-0">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Clock1 className="size-4 text-[--color-brand]" />
                    Visit history
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-auto pr-1">
                    {active.visits.length === 0 && (
                      <div className="text-sm text-muted-foreground">No past visits.</div>
                    )}
                    {active.visits.map((vs) => (
                      <div key={vs.id} className="rounded-md bg-[--color-surface-2] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="outline" className="border-[--border]">Zone {vs.zone}</Badge>
                          <div className="text-xs text-muted-foreground">Violations:{" "}
                            <span className={cn(vs.violations ? "text-[--color-destructive]" : "text-[--color-on-surface]")}>
                              {vs.violations}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">In</div>
                            <div>{formatDate(vs.checkInAt)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Out</div>
                            <div>{formatDate(vs.checkOutAt)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[--radius] bg-[--color-secondary] p-4 ring-1 ring-[--border] min-w-0">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Logs className="size-4 text-[--color-brand]" />
                    Audit trail
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-auto pr-1">
                    {active.audit.length === 0 && (
                      <div className="text-sm text-muted-foreground">No audit records yet.</div>
                    )}
                    {active.audit
                      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                      .map((e) => (
                        <div key={e.id} className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-[--color-accent]" aria-hidden />
                          <div className="min-w-0">
                            <div className="text-sm break-words">
                              <span className="text-foreground">{e.user}</span>{" "}
                              <span className="text-muted-foreground">
                                {auditLabel(e.action)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(e.at)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
        </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function auditLabel(a: AuditEntry["action"]) {
  switch (a) {
    case "check-in":
      return "checked in"
    case "check-out":
      return "checked out"
    case "violation-add":
      return "added a violation"
    case "violation-clear":
      return "cleared violations"
    case "profile-view":
      return "viewed profile"
    case "bulk-check-in":
      return "bulk check-in"
    case "bulk-check-out":
      return "bulk check-out"
    case "bulk-export":
      return "exported CSV"
    case "edit":
      return "edited record"
  }
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active?: boolean
  dir?: "asc" | "desc"
  onClick?: () => void
}) {
  return (
    <TableHead>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 text-left text-sm text-muted-foreground hover:text-foreground",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-[--ring] rounded-sm",
        )}
        onClick={onClick}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        {active && (
          <span className="text-xs">
            {dir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </button>
    </TableHead>
  )
}