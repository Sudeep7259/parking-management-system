"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Grid3x2,
  PanelsTopLeft,
  CircleParking,
  SquareParking,
  PanelLeft,
  PanelLeftClose,
  Grid2x2Check,
  PanelsRightBottom,
  PanelTop,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SpotStatus = "available" | "occupied" | "unavailable";

export type Spot = {
  id: string;
  label: string;
  status: SpotStatus;
  vehiclePlate?: string;
  reasonCode?: "maintenance" | "reserved" | "blocked" | "none";
};

export type Zone = {
  id: string;
  name: string;
  capacity: number;
  spots: Spot[];
};

export type SpaceManagementProps = {
  className?: string;
  style?: React.CSSProperties;
  initialZones?: Zone[];
  initialUnassignedSpots?: Spot[];
  onZonesChange?: (zones: Zone[], unassigned: Spot[]) => void;
};

const DEFAULT_ZONES: Zone[] = [
  {
    id: "zone-a",
    name: "Zone A",
    capacity: 24,
    spots: [
      { id: "A-01", label: "A-01", status: "available" },
      { id: "A-02", label: "A-02", status: "occupied", vehiclePlate: "7XYZ123" },
      { id: "A-03", label: "A-03", status: "unavailable", reasonCode: "maintenance" },
      { id: "A-04", label: "A-04", status: "available" },
    ],
  },
  {
    id: "zone-b",
    name: "Zone B",
    capacity: 12,
    spots: [
      { id: "B-01", label: "B-01", status: "available" },
      { id: "B-02", label: "B-02", status: "available" },
      { id: "B-03", label: "B-03", status: "occupied", vehiclePlate: "8ABC456" },
    ],
  },
];

const DEFAULT_UNASSIGNED: Spot[] = [
  { id: "S-101", label: "S-101", status: "available" },
  { id: "S-102", label: "S-102", status: "unavailable", reasonCode: "blocked" },
  { id: "S-103", label: "S-103", status: "available" },
];

function useStableId(prefix: string) {
  const ref = useRef(0);
  return useCallback(() => {
    ref.current += 1;
    return `${prefix}-${ref.current}`;
  }, [prefix]);
}

export default function SpaceManagement({
  className,
  style,
  initialZones,
  initialUnassignedSpots,
  onZonesChange,
}: SpaceManagementProps) {
  const [zones, setZones] = useState<Zone[]>(initialZones ?? DEFAULT_ZONES);
  const [unassigned, setUnassigned] = useState<Spot[]>(
    initialUnassignedSpots ?? DEFAULT_UNASSIGNED
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    initialZones?.[0]?.id ?? DEFAULT_ZONES[0]?.id ?? ""
  );
  const [zoneSearch, setZoneSearch] = useState("");
  const [spotSearch, setSpotSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SpotStatus | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showUnassigned, setShowUnassigned] = useState(true);

  const [bulkSelection, setBulkSelection] = useState<Record<string, boolean>>({});

  // Dialog states
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  const [spotDialogOpen, setSpotDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<{
    zoneId: string | "unassigned";
    spot: Spot;
  } | null>(null);

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const makeId = useStableId("zone");

  const currentZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || null,
    [zones, selectedZoneId]
  );

  const reportChange = useCallback(
    (nz: Zone[], ua: Spot[]) => {
      onZonesChange?.(nz, ua);
    },
    [onZonesChange]
  );

  const filteredZones = useMemo(() => {
    const q = zoneSearch.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter((z) => z.name.toLowerCase().includes(q));
  }, [zones, zoneSearch]);

  const filteredSpots = useMemo(() => {
    const spots = currentZone?.spots ?? [];
    const q = spotSearch.trim().toLowerCase();
    return spots.filter((s) => {
      const matchesQuery =
        !q ||
        s.label.toLowerCase().includes(q) ||
        (s.vehiclePlate?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === "all" ? true : s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [currentZone, spotSearch, statusFilter]);

  const occupancy = useMemo(() => {
    if (!currentZone) return { occupied: 0, total: 0, percent: 0 };
    const occupied = currentZone.spots.filter((s) => s.status === "occupied").length;
    const total = currentZone.capacity || currentZone.spots.length || 0;
    const percent = total ? Math.min(100, Math.round((occupied / total) * 100)) : 0;
    return { occupied, total, percent };
  }, [currentZone]);

  // Drag-and-drop handlers
  const onSpotDragStart = useCallback((e: React.DragEvent, spot: Spot, from: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ spotId: spot.id, from }));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onZoneDrop = useCallback(
    (e: React.DragEvent, toZoneId: string) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("text/plain");
      if (!raw) return;
      try {
        const { spotId, from } = JSON.parse(raw) as { spotId: string; from: string };
        if (!spotId) return;
        // Move spot from source to destination
        setZones((prevZones) => {
          let moved: Spot | null = null;
          let nextZones = prevZones.map((z) => {
            if (z.id === from) {
              const idx = z.spots.findIndex((s) => s.id === spotId);
              if (idx >= 0) {
                moved = z.spots[idx];
                const updated = [...z.spots];
                updated.splice(idx, 1);
                return { ...z, spots: updated };
              }
            }
            return z;
          });

          let movedFromUnassigned = false;
          if (!moved && from === "unassigned") {
            setUnassigned((prevU) => {
              const idx = prevU.findIndex((s) => s.id === spotId);
              if (idx >= 0) {
                moved = prevU[idx];
                const copy = [...prevU];
                copy.splice(idx, 1);
                return copy;
              }
              return prevU;
            });
            movedFromUnassigned = true;
          }

          if (!moved) return prevZones;

          nextZones = nextZones.map((z) => {
            if (z.id === toZoneId) {
              return { ...z, spots: [...z.spots, moved as Spot] };
            }
            return z;
          });

          // Notify after microtask to ensure unassigned state settled
          queueMicrotask(() => reportChange(nextZones, movedFromUnassigned ? unassigned : unassigned));
          toast.success(`Spot ${moved?.label} assigned to ${nextZones.find((z) => z.id === toZoneId)?.name}`);
          return nextZones;
        });
      } catch {
        // ignore
      }
    },
    [reportChange, unassigned]
  );

  const removeSpotFromZone = useCallback((zoneId: string, spotId: string) => {
    setZones((prev) => {
      let removed: Spot | null = null;
      const next = prev.map((z) => {
        if (z.id === zoneId) {
          const idx = z.spots.findIndex((s) => s.id === spotId);
          if (idx >= 0) {
            const copy = [...z.spots];
            removed = copy.splice(idx, 1)[0]!;
            return { ...z, spots: copy };
          }
        }
        return z;
      });
      if (removed) {
        setUnassigned((prevU) => {
          const result = [...prevU, removed as Spot];
          reportChange(next, result);
          return result;
        });
        toast.message(`Spot ${removed.label} moved to Unassigned`);
      }
      return next;
    });
  }, [reportChange]);

  // Zone management
  const openCreateZone = () => {
    setEditingZone({ id: "", name: "", capacity: 0, spots: [] });
    setZoneDialogOpen(true);
  };

  const openEditZone = () => {
    if (!currentZone) return;
    setEditingZone({ ...currentZone });
    setZoneDialogOpen(true);
  };

  const saveZone = () => {
    if (!editingZone) return;
    if (!editingZone.name.trim()) {
      toast.error("Zone name is required.");
      return;
    }
    if (editingZone.capacity < editingZone.spots.length) {
      toast.error("Capacity cannot be less than current number of spots.");
      return;
    }
    if (!editingZone.id) {
      // create
      const id = makeId();
      const newZone: Zone = { ...editingZone, id };
      const next = [...zones, newZone];
      setZones(next);
      setSelectedZoneId(id);
      toast.success("Zone created");
      reportChange(next, unassigned);
    } else {
      // update
      const next = zones.map((z) => (z.id === editingZone.id ? editingZone : z));
      setZones(next);
      toast.success("Zone updated");
      reportChange(next, unassigned);
    }
    setZoneDialogOpen(false);
  };

  // Spot management
  const openEditSpot = (zoneId: string | "unassigned", spot: Spot) => {
    setEditingSpot({ zoneId, spot: { ...spot } });
    setSpotDialogOpen(true);
  };

  const saveSpot = () => {
    if (!editingSpot) return;
    const { zoneId, spot } = editingSpot;
    if (!spot.label.trim()) {
      toast.error("Spot label is required.");
      return;
    }
    if (zoneId === "unassigned") {
      setUnassigned((prev) => {
        const next = prev.map((s) => (s.id === spot.id ? spot : s));
        reportChange(zones, next);
        return next;
      });
    } else {
      setZones((prev) => {
        const next = prev.map((z) => {
          if (z.id !== zoneId) return z;
          return {
            ...z,
            spots: z.spots.map((s) => (s.id === spot.id ? spot : s)),
          };
        });
        reportChange(next, unassigned);
        return next;
      });
    }
    toast.success("Spot updated");
    setSpotDialogOpen(false);
  };

  const applyBulk = (action: { type: "status" | "clear-vehicle"; value?: SpotStatus }) => {
    const zone = currentZone;
    if (!zone) return;
    const selectedIds = Object.entries(bulkSelection)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!selectedIds.length) {
      toast.message("No spots selected");
      return;
    }
    const nextZones = zones.map((z) => {
      if (z.id !== zone.id) return z;
      const spots = z.spots.map((s) => {
        if (!selectedIds.includes(s.id)) return s;
        if (action.type === "status" && action.value) {
          const next: Spot = { ...s, status: action.value };
          if (action.value !== "occupied") next.vehiclePlate = undefined;
          if (action.value !== "unavailable") next.reasonCode = undefined;
          return next;
        }
        if (action.type === "clear-vehicle") {
          return { ...s, vehiclePlate: undefined, status: s.status === "occupied" ? "available" : s.status };
        }
        return s;
      });
      return { ...z, spots };
    });
    setZones(nextZones);
    setBulkDialogOpen(false);
    setBulkSelection({});
    reportChange(nextZones, unassigned);
    toast.success("Bulk action applied");
  };

  const toggleSelectAll = (checked: boolean) => {
    const ids = filteredSpots.map((s) => s.id);
    const next: Record<string, boolean> = {};
    ids.forEach((id) => (next[id] = checked));
    setBulkSelection(next);
  };

  return (
    <section className={cn("w-full max-w-full bg-card text-card-foreground rounded-lg border border-border", className)} style={style} aria-label="Space management">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border">
        <div className="inline-flex items-center gap-2">
          <SquareParking className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-base sm:text-lg font-semibold tracking-tight">Space Management</h2>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2">
            <Input
              value={zoneSearch}
              onChange={(e) => setZoneSearch(e.target.value)}
              placeholder="Search zones..."
              className="h-9 bg-muted border-input text-foreground placeholder:text-muted-foreground"
              aria-label="Search zones"
            />
          </div>
          <Button
            size="sm"
            className="h-9 bg-primary text-primary-foreground hover:opacity-90"
            onClick={openCreateZone}
          >
            New Zone
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 p-4 sm:p-6">
        {/* Zone List */}
        <aside className="md:col-span-4 lg:col-span-3 rounded-md bg-secondary text-secondary-foreground border border-border">
          <div className="p-3 sm:p-4 flex items-center gap-2 border-b border-border">
            <PanelLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">Zones</span>
            <div className="ml-auto md:hidden">
              <Input
                value={zoneSearch}
                onChange={(e) => setZoneSearch(e.target.value)}
                placeholder="Search"
                className="h-8 bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {filteredZones.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No zones found.</div>
            )}
            <ul className="divide-y divide-border">
              {filteredZones.map((z) => {
                const occupied = z.spots.filter((s) => s.status === "occupied").length;
                const percent = z.capacity ? Math.min(100, Math.round((occupied / z.capacity) * 100)) : 0;
                const isActive = z.id === selectedZoneId;
                return (
                  <li key={z.id}>
                    <button
                      className={cn(
                        "w-full text-left p-3 sm:p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
                        isActive ? "bg-muted/60" : "hover:bg-muted/40"
                      )}
                      onClick={() => setSelectedZoneId(z.id)}
                      aria-current={isActive ? "true" : "false"}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <CircleParking className="h-4 w-4 text-primary" aria-hidden />
                            <span className="font-medium truncate">{z.name}</span>
                          </div>
                          <div className="mt-2">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-chart-1 transition-all"
                                style={{ width: `${percent}%` }}
                                aria-hidden
                              />
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{occupied}/{z.capacity} occupied</span>
                              <span>{percent}%</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{z.spots.length} spots</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Main Zone Detail */}
        <div className="md:col-span-8 lg:col-span-9 min-w-0">
          {!currentZone ? (
            <div className="h-48 rounded-md border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground">
              Select or create a zone to manage spots.
            </div>
          ) : (
            <div className="rounded-md border border-border bg-secondary/40">
              {/* Zone header */}
              <div className="p-4 border-b border-border">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <PanelsRightBottom className="h-4 w-4 text-primary" aria-hidden />
                      <h3 className="text-base sm:text-lg font-semibold truncate">{currentZone.name}</h3>
                    </div>
                    <div className="mt-2 w-full max-w-lg">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-chart-5 transition-all" style={{ width: `${occupancy.percent}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {occupancy.occupied}/{occupancy.total} occupied • Capacity {currentZone.capacity}
                      </div>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    <div className="hidden sm:block w-44">
                      <Input
                        value={spotSearch}
                        onChange={(e) => setSpotSearch(e.target.value)}
                        placeholder="Search spots"
                        className="h-9 bg-muted border-input text-foreground placeholder:text-muted-foreground"
                        aria-label="Search spots"
                      />
                    </div>
                    <Select onValueChange={(v: SpotStatus | "all") => setStatusFilter(v)} value={statusFilter}>
                      <SelectTrigger className="h-9 w-36 bg-muted border-input">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="h-9 border-border" onClick={openEditZone}>
                      Edit Zone
                    </Button>
                    <Button variant="outline" className="h-9 border-border" onClick={() => setBulkDialogOpen(true)}>
                      Bulk Actions
                    </Button>
                    <div className="flex items-center rounded-md bg-muted p-1 border border-input">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Grid view"
                        className={cn(
                          "h-8 w-8 rounded-sm",
                          view === "grid" ? "bg-card text-foreground" : "text-muted-foreground"
                        )}
                        onClick={() => setView("grid")}
                      >
                        <Grid3x2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="List view"
                        className={cn(
                          "h-8 w-8 rounded-sm",
                          view === "list" ? "bg-card text-foreground" : "text-muted-foreground"
                        )}
                        onClick={() => setView("list")}
                      >
                        <PanelsTopLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 sm:hidden">
                  <Input
                    value={spotSearch}
                    onChange={(e) => setSpotSearch(e.target.value)}
                    placeholder="Search spots"
                    className="h-9 bg-muted border-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Zone board */}
              <div
                className="p-4 min-h-64"
                onDragOver={onZoneDragOver}
                onDrop={(e) => onZoneDrop(e, currentZone.id)}
                aria-label={`Drop spots to assign to ${currentZone.name}`}
              >
                <Tabs defaultValue={view} value={view} onValueChange={(v) => setView(v as "grid" | "list")}>
                  <TabsList className="sr-only">
                    <TabsTrigger value="grid">Grid</TabsTrigger>
                    <TabsTrigger value="list">List</TabsTrigger>
                  </TabsList>
                  <TabsContent value="grid" asChild>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {filteredSpots.map((spot) => (
                        <SpotCard
                          key={spot.id}
                          spot={spot}
                          zoneId={currentZone.id}
                          selected={!!bulkSelection[spot.id]}
                          onSelectedChange={(checked) =>
                            setBulkSelection((prev) => ({ ...prev, [spot.id]: !!checked }))
                          }
                          onDragStart={onSpotDragStart}
                          onOpenEdit={() => openEditSpot(currentZone.id, spot)}
                          onUnassign={() => removeSpotFromZone(currentZone.id, spot.id)}
                        />
                      ))}
                      {filteredSpots.length === 0 && (
                        <div className="col-span-full text-sm text-muted-foreground">
                          No spots match the current filters.
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="list" asChild>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="py-2 pr-3 font-medium">Select</th>
                            <th className="py-2 pr-3 font-medium">Label</th>
                            <th className="py-2 pr-3 font-medium">Status</th>
                            <th className="py-2 pr-3 font-medium">Vehicle</th>
                            <th className="py-2 pr-3 font-medium">Reason</th>
                            <th className="py-2 pr-3 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSpots.map((spot) => (
                            <tr key={spot.id} draggable onDragStart={(e) => onSpotDragStart(e, spot, currentZone.id)} className="border-b border-border hover:bg-muted/40">
                              <td className="py-2 pr-3">
                                <Checkbox
                                  checked={!!bulkSelection[spot.id]}
                                  onCheckedChange={(v) =>
                                    setBulkSelection((prev) => ({ ...prev, [spot.id]: !!v }))
                                  }
                                  aria-label={`Select ${spot.label}`}
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <SquareParking className="h-4 w-4 text-primary shrink-0" />
                                  <span className="truncate">{spot.label}</span>
                                </div>
                              </td>
                              <td className="py-2 pr-3">
                                <StatusPill status={spot.status} />
                              </td>
                              <td className="py-2 pr-3">{spot.vehiclePlate || "-"}</td>
                              <td className="py-2 pr-3">{spot.reasonCode ?? "-"}</td>
                              <td className="py-2 pr-3">
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => openEditSpot(currentZone.id, spot)}>
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={() => removeSpotFromZone(currentZone.id, spot.id)}>
                                    Unassign
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredSpots.length === 0 && (
                        <div className="p-4 text-sm text-muted-foreground">No spots match the current filters.</div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <Separator />

              {/* Unassigned panel */}
              <div className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowUnassigned((s) => !s)}
                    aria-expanded={showUnassigned}
                    aria-controls="unassigned-panel"
                  >
                    {showUnassigned ? (
                      <PanelLeftClose className="h-4 w-4 mr-1" />
                    ) : (
                      <PanelLeft className="h-4 w-4 mr-1" />
                    )}
                    Unassigned Spots ({unassigned.length})
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-border"
                      onClick={() => {
                        const newSpot: Spot = {
                          id: `S-${Math.floor(Math.random() * 900 + 100)}`,
                          label: `S-${Math.floor(Math.random() * 900 + 100)}`,
                          status: "available",
                        };
                        setUnassigned((prev) => {
                          const next = [...prev, newSpot];
                          reportChange(zones, next);
                          return next;
                        });
                        toast.success("Spot added to Unassigned");
                      }}
                    >
                      Add Spot
                    </Button>
                  </div>
                </div>
                {showUnassigned && (
                  <div
                    id="unassigned-panel"
                    className="mt-3 rounded-md border border-border bg-secondary/60 p-3"
                    onDragOver={onZoneDragOver}
                    onDrop={(e) => {
                      e.preventDefault();
                      const raw = e.dataTransfer.getData("text/plain");
                      if (!raw) return;
                      try {
                        const { spotId, from } = JSON.parse(raw) as { spotId: string; from: string };
                        if (!spotId) return;
                        if (from === "unassigned") return; // already here
                        // remove from zone and put into unassigned
                        setZones((prev) => {
                          let removed: Spot | null = null;
                          const nextZones = prev.map((z) => {
                            if (z.id === from) {
                              const idx = z.spots.findIndex((s) => s.id === spotId);
                              if (idx >= 0) {
                                const copy = [...z.spots];
                                removed = copy.splice(idx, 1)[0]!;
                                return { ...z, spots: copy };
                              }
                            }
                            return z;
                          });
                          if (removed) {
                            setUnassigned((prevU) => {
                              const result = [...prevU, removed as Spot];
                              reportChange(nextZones, result);
                              return result;
                            });
                            toast.message(`Spot ${removed.label} unassigned`);
                          }
                          return nextZones;
                        });
                      } catch {
                        // ignore
                      }
                    }}
                    aria-label="Unassigned spots dropzone"
                  >
                    <div className="flex flex-wrap gap-2">
                      {unassigned.map((spot) => (
                        <div
                          key={spot.id}
                          className="group relative"
                          draggable
                          onDragStart={(e) => onSpotDragStart(e, spot, "unassigned")}
                        >
                          <div
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-popover/60 backdrop-blur",
                              spot.status === "available" && "ring-1 ring-offset-0 ring-chart-5/20",
                              spot.status === "occupied" && "ring-1 ring-chart-1/30",
                              spot.status === "unavailable" && "opacity-80"
                            )}
                            role="button"
                            tabIndex={0}
                            onClick={() => openEditSpot("unassigned", spot)}
                            onKeyDown={(e) => e.key === "Enter" && openEditSpot("unassigned", spot)}
                          >
                            <SquareParking className="h-4 w-4 text-primary shrink-0" aria-hidden />
                            <span className="text-sm">{spot.label}</span>
                            <StatusDot status={spot.status} />
                          </div>
                        </div>
                      ))}
                      {unassigned.length === 0 && (
                        <div className="text-sm text-muted-foreground">No unassigned spots.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone Dialog */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="bg-popover text-popover-foreground border border-border">
          <DialogHeader>
            <DialogTitle>{editingZone?.id ? "Edit Zone" : "Create Zone"}</DialogTitle>
            <DialogDescription>Configure zone details and capacity. You can adjust spots later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="zone-name">Zone name</Label>
              <Input
                id="zone-name"
                value={editingZone?.name ?? ""}
                onChange={(e) => setEditingZone((z) => (z ? { ...z, name: e.target.value } : z))}
                placeholder="e.g., Basement A"
                className="bg-muted border-input"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zone-capacity">Capacity</Label>
              <Input
                id="zone-capacity"
                type="number"
                min={0}
                value={editingZone?.capacity ?? 0}
                onChange={(e) =>
                  setEditingZone((z) => (z ? { ...z, capacity: Math.max(0, Number(e.target.value || 0)) } : z))
                }
                className="bg-muted border-input"
              />
              <small className="text-muted-foreground">Capacity is used for occupancy calculations.</small>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setZoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary text-primary-foreground" onClick={saveZone}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spot Dialog */}
      <Dialog open={spotDialogOpen} onOpenChange={setSpotDialogOpen}>
        <DialogContent className="bg-popover text-popover-foreground border border-border">
          <DialogHeader>
            <DialogTitle>Edit Spot</DialogTitle>
            <DialogDescription>Manage spot details, availability and vehicle assignment.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="spot-label">Label</Label>
              <Input
                id="spot-label"
                value={editingSpot?.spot.label ?? ""}
                onChange={(e) =>
                  setEditingSpot((p) => (p ? { ...p, spot: { ...p.spot, label: e.target.value } } : p))
                }
                className="bg-muted border-input"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={editingSpot?.spot.status}
                  onValueChange={(v: SpotStatus) =>
                    setEditingSpot((p) => (p ? { ...p, spot: { ...p.spot, status: v } } : p))
                  }
                >
                  <SelectTrigger className="bg-muted border-input">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Reason code</Label>
                <Select
                  value={editingSpot?.spot.reasonCode ?? "none"}
                  onValueChange={(v: "maintenance" | "reserved" | "blocked" | "none") =>
                    setEditingSpot((p) =>
                      p ? { ...p, spot: { ...p.spot, reasonCode: v === "none" ? undefined : v } } : p
                    )
                  }
                >
                  <SelectTrigger className="bg-muted border-input">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
                <small className="text-muted-foreground">Used when status is Unavailable or Reserved.</small>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vehicle-plate">Vehicle plate</Label>
              <Input
                id="vehicle-plate"
                placeholder="e.g., 8ABC123"
                value={editingSpot?.spot.vehiclePlate ?? ""}
                onChange={(e) =>
                  setEditingSpot((p) => (p ? { ...p, spot: { ...p.spot, vehiclePlate: e.target.value } } : p))
                }
                className="bg-muted border-input"
              />
              <small className="text-muted-foreground">
                If provided, status should typically be set to Occupied.
              </small>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setSpotDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={saveSpot}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="bg-popover text-popover-foreground border border-border">
          <DialogHeader>
            <DialogTitle>Bulk actions</DialogTitle>
            <DialogDescription>Apply changes to selected spots in the current zone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Selected: {Object.values(bulkSelection).filter(Boolean).length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-border"
                  onClick={() => toggleSelectAll(true)}
                >
                  Select all
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setBulkSelection({})}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-border bg-secondary/40 p-3">
              <div className="text-sm font-medium mb-2">Quick status</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8 border-border" onClick={() => applyBulk({ type: "status", value: "available" })}>
                  Set Available
                </Button>
                <Button size="sm" variant="outline" className="h-8 border-border" onClick={() => applyBulk({ type: "status", value: "occupied" })}>
                  Set Occupied
                </Button>
                <Button size="sm" variant="outline" className="h-8 border-border" onClick={() => applyBulk({ type: "status", value: "unavailable" })}>
                  Set Unavailable
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-border bg-secondary/40 p-3">
              <div className="text-sm font-medium mb-2">Other actions</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8 border-border" onClick={() => applyBulk({ type: "clear-vehicle" })}>
                  Clear Vehicle Assignments
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function StatusPill({ status }: { status: SpotStatus }) {
  const text = status === "available" ? "Available" : status === "occupied" ? "Occupied" : "Unavailable";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        status === "available" && "bg-chart-5/15 text-chart-5 border border-chart-5/20",
        status === "occupied" && "bg-chart-1/15 text-chart-1 border border-chart-1/25",
        status === "unavailable" && "bg-muted text-muted-foreground border border-border"
      )}
    >
      {text}
    </span>
  );
}

function StatusDot({ status }: { status: SpotStatus }) {
  return (
    <span
      aria-hidden
      className={cn(
        "ml-1 inline-block h-2 w-2 rounded-full",
        status === "available" && "bg-chart-5",
        status === "occupied" && "bg-chart-1",
        status === "unavailable" && "bg-muted-foreground"
      )}
    />
  );
}

type SpotCardProps = {
  spot: Spot;
  zoneId: string;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onDragStart: (e: React.DragEvent, spot: Spot, from: string) => void;
  onOpenEdit: () => void;
  onUnassign: () => void;
};

function SpotCard({
  spot,
  zoneId,
  selected,
  onSelectedChange,
  onDragStart,
  onOpenEdit,
  onUnassign,
}: SpotCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, spot, zoneId)}
      className={cn(
        "group relative rounded-lg border border-border bg-popover p-3 hover:bg-popover/90 focus-within:ring-2 focus-within:ring-ring transition-colors min-w-0"
      )}
      role="group"
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelectedChange(!!v)}
          aria-label={`Select ${spot.label}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <SquareParking className="h-4 w-4 text-primary shrink-0" aria-hidden />
            <span className="font-medium truncate">{spot.label}</span>
            <StatusDot status={spot.status} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground break-words">
            {spot.status === "occupied" ? (
              <span>Vehicle: {spot.vehiclePlate || "N/A"}</span>
            ) : spot.status === "unavailable" ? (
              <span>Reason: {spot.reasonCode ?? "N/A"}</span>
            ) : (
              <span>Available</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <StatusPill status={spot.status} />
        <div className="ml-auto inline-flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 border-border"
            onClick={onOpenEdit}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={onUnassign}
          >
            Unassign
          </Button>
        </div>
      </div>
    </div>
  );
}