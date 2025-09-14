"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  UserCog,
  FolderCog,
  MonitorCog,
  UserRoundCog,
  PanelTop,
  SlidersVertical,
  ServerCog,
} from "lucide-react";

type Role = "admin" | "operator";

type ZoneConfig = {
  id: string;
  name: string;
  capacity: number;
  active: boolean;
};

type TariffTemplate = {
  id: string;
  name: string;
  baseRate: number;
  hourlyRate: number;
  maxDaily: number;
  graceMinutes: number;
};

type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

type NotificationPrefs = {
  reservationCreated: boolean;
  occupancyAlerts: boolean;
  lowBalance: boolean;
  weeklyReport: boolean;
  email: string;
  sms: string;
};

type IntegrationSettings = {
  webhooksEnabled: boolean;
  webhookUrl: string;
  analyticsEnabled: boolean;
};

type Branding = {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
};

type Timing = {
  defaultReservationMinutes: number;
  gracePeriodMinutes: number;
  overnightAllowed: boolean;
  cutoffHour24: number;
};

type ApiKey = {
  label: string;
  key: string;
  createdAt: string;
};

export interface SettingsProps {
  className?: string;
  initialRole?: Role;
  initialZones?: ZoneConfig[];
  initialTiming?: Timing;
  initialBranding?: Branding;
  initialTariffs?: TariffTemplate[];
  initialUsers?: UserAccount[];
  initialNotifications?: NotificationPrefs;
  initialIntegrations?: IntegrationSettings;
  initialApiKeys?: ApiKey[];
  onSave?: (payload: unknown) => Promise<void> | void;
}

const defaultLogo =
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1920&auto=format&fit=crop";

export default function Settings(props: SettingsProps) {
  const {
    className,
    initialRole = "admin",
    initialZones = [
      { id: "z-a", name: "Zone A", capacity: 120, active: true },
      { id: "z-b", name: "Zone B", capacity: 80, active: true },
      { id: "z-c", name: "Zone C", capacity: 40, active: false },
    ],
    initialTiming = {
      defaultReservationMinutes: 90,
      gracePeriodMinutes: 10,
      overnightAllowed: false,
      cutoffHour24: 23,
    },
    initialBranding = {
      companyName: "ParkWise Systems",
      logoUrl: defaultLogo,
      primaryColor: "#ff8a5a",
      accentColor: "#c6e062",
      supportEmail: "support@parkwise.example",
      supportPhone: "+1 (555) 010-8899",
      address: "100 Market Street, Suite 300, San Francisco, CA",
    },
    initialTariffs = [
      {
        id: "t-default",
        name: "Standard",
        baseRate: 2.5,
        hourlyRate: 3.0,
        maxDaily: 24,
        graceMinutes: 10,
      },
      {
        id: "t-earlybird",
        name: "Early Bird",
        baseRate: 5,
        hourlyRate: 2.5,
        maxDaily: 18,
        graceMinutes: 5,
      },
    ],
    initialUsers = [
      {
        id: "u-1",
        name: "Alex Rivera",
        email: "alex@parkwise.example",
        role: "admin",
        active: true,
      },
      {
        id: "u-2",
        name: "Sam Lee",
        email: "sam@parkwise.example",
        role: "operator",
        active: true,
      },
    ],
    initialNotifications = {
      reservationCreated: true,
      occupancyAlerts: true,
      lowBalance: false,
      weeklyReport: true,
      email: "ops@parkwise.example",
      sms: "+15550105555",
    },
    initialIntegrations = {
      webhooksEnabled: false,
      webhookUrl: "",
      analyticsEnabled: true,
    },
    initialApiKeys = [
      {
        label: "Production",
        key: "pk_live_********************8a5a",
        createdAt: new Date().toISOString(),
      },
    ],
    onSave,
  } = props;

  const [role, setRole] = React.useState<Role>(initialRole);

  // Core state
  const [zones, setZones] = React.useState<ZoneConfig[]>(initialZones);
  const [timing, setTiming] = React.useState<Timing>(initialTiming);
  const [branding, setBranding] = React.useState<Branding>(initialBranding);
  const [tariffs, setTariffs] = React.useState<TariffTemplate[]>(initialTariffs);
  const [users, setUsers] = React.useState<UserAccount[]>(initialUsers);
  const [notifications, setNotifications] =
    React.useState<NotificationPrefs>(initialNotifications);
  const [integrations, setIntegrations] =
    React.useState<IntegrationSettings>(initialIntegrations);
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>(initialApiKeys);

  const isAdmin = role === "admin";

  // Helpers
  const handleSaveAll = async () => {
    const payload = {
      role,
      zones,
      timing,
      branding,
      tariffs,
      users,
      notifications,
      integrations,
      apiKeys,
    };
    try {
      await onSave?.(payload);
      toast.success("Settings saved");
    } catch (e) {
      toast.error("Failed to save settings");
    }
  };

  const confirmable = (fn: () => void) => () => fn();

  const addZone = () => {
    const next: ZoneConfig = {
      id: `z-${Date.now()}`,
      name: `New Zone`,
      capacity: 0,
      active: true,
    };
    setZones((prev) => [...prev, next]);
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  const addTariff = () => {
    const next: TariffTemplate = {
      id: `t-${Date.now()}`,
      name: "New Tariff",
      baseRate: 0,
      hourlyRate: 0,
      maxDaily: 0,
      graceMinutes: 0,
    };
    setTariffs((prev) => [...prev, next]);
  };

  const removeTariff = (id: string) => {
    setTariffs((prev) => prev.filter((t) => t.id !== id));
  };

  const addUser = () => {
    const next: UserAccount = {
      id: `u-${Date.now()}`,
      name: "New User",
      email: "",
      role: "operator",
      active: true,
    };
    setUsers((prev) => [...prev, next]);
  };

  const removeUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const regenerateApiKey = (label: string) => {
    const newKey = `pk_live_${Math.random().toString(36).slice(2)}${Date.now()}`;
    setApiKeys((prev) =>
      prev.map((k) =>
        k.label === label ? { ...k, key: maskKey(newKey) } : k
      )
    );
    toast.success(`API key for ${label} regenerated`);
  };

  const maskKey = (k: string) =>
    k.length > 10 ? k.slice(0, 7) + "****************" + k.slice(-4) : "********";

  // Export / Import
  const exportSettings = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            zones,
            timing,
            branding,
            tariffs,
            users,
            notifications,
            integrations,
            apiKeys,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parkwise-settings-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  const importFileRef = React.useRef<HTMLInputElement>(null);
  const importSettings = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.zones) setZones(parsed.zones);
        if (parsed.timing) setTiming(parsed.timing);
        if (parsed.branding) setBranding(parsed.branding);
        if (parsed.tariffs) setTariffs(parsed.tariffs);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.integrations) setIntegrations(parsed.integrations);
        if (parsed.apiKeys) setApiKeys(parsed.apiKeys);
        toast.success("Settings imported");
      } catch {
        toast.error("Invalid settings file");
      }
    };
    reader.readAsText(file);
  };

  const disabledClass = !isAdmin ? "opacity-60 pointer-events-none" : "";

  return (
    <div className={["w-full max-w-full", className].filter(Boolean).join(" ")}>
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Settings2 className="size-5 text-primary shrink-0" aria-hidden />
              <CardTitle className="text-base sm:text-lg md:text-xl truncate">
                System Settings
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={role}
                onValueChange={(v: Role) => setRole(v)}
              >
                <SelectTrigger
                  className="w-[150px] bg-secondary text-secondary-foreground border-border"
                  aria-label="Current role"
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                </SelectContent>
              </Select>
              <Badge
                className="bg-muted text-muted-foreground border border-border"
                aria-label={`Current permissions: ${isAdmin ? "Admin" : "Operator"}`}
              >
                {isAdmin ? "Admin permissions" : "Operator (limited)"}
              </Badge>
              <div className="hidden sm:flex gap-2">
                <Button
                  variant="secondary"
                  className="bg-secondary text-secondary-foreground hover:bg-surface-2"
                  onClick={exportSettings}
                >
                  Export
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-border">
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-popover text-popover-foreground border-border">
                    <DialogHeader>
                      <DialogTitle>Import settings</DialogTitle>
                      <DialogDescription>
                        Upload a previously exported JSON settings file.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <Input
                        ref={importFileRef}
                        type="file"
                        accept="application/json"
                        className="bg-secondary"
                        onChange={(e) => {
                          const f = e.currentTarget.files?.[0];
                          if (f) importSettings(f);
                        }}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="secondary" onClick={() => {
                        const f = importFileRef.current?.files?.[0];
                        if (f) importSettings(f);
                      }}>
                        Import
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:opacity-90">
                    Save changes
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-popover text-popover-foreground border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm save</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will apply configuration changes system-wide.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmable(handleSaveAll)}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure access control, zoning, pricing, branding, notifications, backups, users, API, and integrations. Some settings are restricted to admins.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="flex flex-wrap gap-2 bg-secondary/70">
              <TabsTrigger value="general" className="data-[state=active]:bg-card">
                <PanelTop className="size-4 mr-2" /> General
              </TabsTrigger>
              <TabsTrigger value="zones" className="data-[state=active]:bg-card">
                <FolderCog className="size-4 mr-2" /> Zones
              </TabsTrigger>
              <TabsTrigger value="timing" className="data-[state=active]:bg-card">
                <SlidersVertical className="size-4 mr-2" /> Timing
              </TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:bg-card">
                <MonitorCog className="size-4 mr-2" /> Pricing
              </TabsTrigger>
              <TabsTrigger value="branding" className="data-[state=active]:bg-card">
                <Settings2 className="size-4 mr-2" /> Branding
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-card">
                <UserCog className="size-4 mr-2" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="backup" className="data-[state=active]:bg-card">
                <ServerCog className="size-4 mr-2" /> Backup & Data
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-card">
                <UserRoundCog className="size-4 mr-2" /> Users
              </TabsTrigger>
              <TabsTrigger value="api" className="data-[state=active]:bg-card">
                <Settings2 className="size-4 mr-2" /> API Keys
              </TabsTrigger>
              <TabsTrigger value="integrations" className="data-[state=active]:bg-card">
                <Settings2 className="size-4 mr-2" /> Integrations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="pt-6">
              <SectionTitle icon={<PanelTop className="size-4" />} title="Global Defaults" />
              <div className="grid gap-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="defaultReservation">
                      Default reservation duration (minutes)
                    </Label>
                    <Input
                      id="defaultReservation"
                      type="number"
                      inputMode="numeric"
                      min={15}
                      step={15}
                      required
                      value={timing.defaultReservationMinutes}
                      onChange={(e) =>
                        setTiming((t) => ({
                          ...t,
                          defaultReservationMinutes: Math.max(
                            15,
                            Number(e.target.value || 0)
                          ),
                        }))
                      }
                      className="bg-secondary"
                    />
                    <small className="text-muted-foreground">
                      Applied when duration not specified by the user.
                    </small>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gracePeriod">Grace period (minutes)</Label>
                    <Input
                      id="gracePeriod"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={5}
                      required
                      value={timing.gracePeriodMinutes}
                      onChange={(e) =>
                        setTiming((t) => ({
                          ...t,
                          gracePeriodMinutes: Math.max(
                            0,
                            Number(e.target.value || 0)
                          ),
                        }))
                      }
                      className="bg-secondary"
                    />
                  </div>
                </div>
                <Separator className="bg-border" />
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex items-center justify-between sm:justify-start gap-3">
                    <Switch
                      id="overnight"
                      checked={timing.overnightAllowed}
                      onCheckedChange={(v) =>
                        setTiming((t) => ({ ...t, overnightAllowed: Boolean(v) }))
                      }
                    />
                    <div className="grid">
                      <Label htmlFor="overnight">Allow overnight stays</Label>
                      <small className="text-muted-foreground">
                        If enabled, reservations may span across midnight.
                      </small>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:max-w-xs">
                    <Label htmlFor="cutoff">Daily cutoff hour (24h)</Label>
                    <Input
                      id="cutoff"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={23}
                      value={timing.cutoffHour24}
                      onChange={(e) =>
                        setTiming((t) => ({
                          ...t,
                          cutoffHour24: Math.min(
                            23,
                            Math.max(0, Number(e.target.value || 0))
                          ),
                        }))
                      }
                      className="bg-secondary"
                    />
                    <small className="text-muted-foreground">
                      Billing cycle reset hour.
                    </small>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="zones" className="pt-6">
              <SectionTitle icon={<FolderCog className="size-4" />} title="Zones & Capacity" />
              <div className="grid gap-4">
                <div className={`flex justify-end ${!isAdmin ? "opacity-60" : ""}`}>
                  <Button
                    onClick={addZone}
                    disabled={!isAdmin}
                    className="bg-secondary hover:bg-surface-2 text-secondary-foreground"
                  >
                    Add zone
                  </Button>
                </div>
                <div className="grid gap-4">
                  {zones.map((z, idx) => (
                    <div
                      key={z.id}
                      className="rounded-lg border border-border bg-secondary p-4 flex flex-col gap-4"
                    >
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="grid gap-2 min-w-0">
                          <Label htmlFor={`zname-${z.id}`}>Zone name</Label>
                          <Input
                            id={`zname-${z.id}`}
                            value={z.name}
                            onChange={(e) =>
                              setZones((prev) =>
                                prev.map((zz) =>
                                  zz.id === z.id ? { ...zz, name: e.target.value } : zz
                                )
                              )
                            }
                            className={`bg-card ${disabledClass}`}
                            disabled={!isAdmin}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`zcap-${z.id}`}>Capacity</Label>
                          <Input
                            id={`zcap-${z.id}`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={z.capacity}
                            onChange={(e) =>
                              setZones((prev) =>
                                prev.map((zz) =>
                                  zz.id === z.id
                                    ? { ...zz, capacity: Math.max(0, Number(e.target.value || 0)) }
                                    : zz
                                )
                              )
                            }
                            className={`bg-card ${disabledClass}`}
                            disabled={!isAdmin}
                          />
                        </div>
                        <div className="flex items-center gap-3 pt-6 sm:pt-0">
                          <Switch
                            id={`zactive-${z.id}`}
                            checked={z.active}
                            onCheckedChange={(v) =>
                              setZones((prev) =>
                                prev.map((zz) =>
                                  zz.id === z.id ? { ...zz, active: Boolean(v) } : zz
                                )
                              )
                            }
                            disabled={!isAdmin}
                          />
                          <Label htmlFor={`zactive-${z.id}`}>Active</Label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <small className="text-muted-foreground">
                          Zone ID: {z.id} • Order: {idx + 1}
                        </small>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              disabled={!isAdmin}
                              className="bg-destructive text-destructive-foreground hover:opacity-90"
                            >
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-popover text-popover-foreground border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove zone {z.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. Reservations assigned to this zone will require reassignment.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeZone(z.id)}>
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timing" className="pt-6">
              <SectionTitle icon={<SlidersVertical className="size-4" />} title="Grace Period & Durations" />
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="defaultMinutes">Default reservation minutes</Label>
                  <Input
                    id="defaultMinutes"
                    type="number"
                    inputMode="numeric"
                    min={15}
                    step={15}
                    value={timing.defaultReservationMinutes}
                    onChange={(e) =>
                      setTiming((t) => ({
                        ...t,
                        defaultReservationMinutes: Math.max(
                          15,
                          Number(e.target.value || 0)
                        ),
                      }))
                    }
                    className="bg-secondary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="graceMinutes">Grace period minutes</Label>
                  <Input
                    id="graceMinutes"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={5}
                    value={timing.gracePeriodMinutes}
                    onChange={(e) =>
                      setTiming((t) => ({
                        ...t,
                        gracePeriodMinutes: Math.max(0, Number(e.target.value || 0)),
                      }))
                    }
                    className="bg-secondary"
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <Switch
                  id="overnight-2"
                  checked={timing.overnightAllowed}
                  onCheckedChange={(v) =>
                    setTiming((t) => ({ ...t, overnightAllowed: Boolean(v) }))
                  }
                />
                <Label htmlFor="overnight-2">Allow overnight reservations</Label>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="pt-6">
              <SectionTitle icon={<MonitorCog className="size-4" />} title="Pricing & Tariff Templates" />
              <div className={`flex justify-end mb-4 ${!isAdmin ? "opacity-60" : ""}`}>
                <Button
                  onClick={addTariff}
                  disabled={!isAdmin}
                  className="bg-secondary hover:bg-surface-2 text-secondary-foreground"
                >
                  Add tariff
                </Button>
              </div>
              <div className="grid gap-4">
                {tariffs.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-secondary p-4 grid gap-4">
                    <div className="grid sm:grid-cols-5 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`tname-${t.id}`}>Name</Label>
                        <Input
                          id={`tname-${t.id}`}
                          value={t.name}
                          onChange={(e) =>
                            setTariffs((prev) =>
                              prev.map((tt) =>
                                tt.id === t.id ? { ...tt, name: e.target.value } : tt
                              )
                            )
                          }
                          className={`bg-card ${disabledClass}`}
                          disabled={!isAdmin}
                        />
                      </div>
                      <NumberField
                        id={`tbase-${t.id}`}
                        label="Base rate ($)"
                        value={t.baseRate}
                        min={0}
                        step={0.5}
                        onChange={(v) =>
                          setTariffs((prev) =>
                            prev.map((tt) =>
                              tt.id === t.id ? { ...tt, baseRate: v } : tt
                            )
                          )
                        }
                        disabled={!isAdmin}
                      />
                      <NumberField
                        id={`thour-${t.id}`}
                        label="Hourly rate ($)"
                        value={t.hourlyRate}
                        min={0}
                        step={0.5}
                        onChange={(v) =>
                          setTariffs((prev) =>
                            prev.map((tt) =>
                              tt.id === t.id ? { ...tt, hourlyRate: v } : tt
                            )
                          )
                        }
                        disabled={!isAdmin}
                      />
                      <NumberField
                        id={`tmax-${t.id}`}
                        label="Max daily ($)"
                        value={t.maxDaily}
                        min={0}
                        step={1}
                        onChange={(v) =>
                          setTariffs((prev) =>
                            prev.map((tt) =>
                              tt.id === t.id ? { ...tt, maxDaily: v } : tt
                            )
                          )
                        }
                        disabled={!isAdmin}
                      />
                      <NumberField
                        id={`tgrace-${t.id}`}
                        label="Grace (min)"
                        value={t.graceMinutes}
                        min={0}
                        step={5}
                        onChange={(v) =>
                          setTariffs((prev) =>
                            prev.map((tt) =>
                              tt.id === t.id ? { ...tt, graceMinutes: v } : tt
                            )
                          )
                        }
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="flex items-center justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={!isAdmin}
                            className="bg-destructive text-destructive-foreground hover:opacity-90"
                          >
                            Delete template
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-popover text-popover-foreground border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {t.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Removing a pricing template may affect new reservations using it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeTariff(t.id)}>
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="branding" className="pt-6">
              <SectionTitle icon={<Settings2 className="size-4" />} title="Branding & Company Info" />
              <div className="grid gap-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Company name</Label>
                    <Input
                      id="companyName"
                      value={branding.companyName}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, companyName: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supportEmail">Support email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={branding.supportEmail}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, supportEmail: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="supportPhone">Support phone</Label>
                    <Input
                      id="supportPhone"
                      value={branding.supportPhone}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, supportPhone: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={branding.address}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, address: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="primaryColor">Primary color</Label>
                    <Input
                      id="primaryColor"
                      type="text"
                      value={branding.primaryColor}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, primaryColor: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                    <div
                      className="h-8 w-full rounded-md border border-border"
                      style={{ backgroundColor: branding.primaryColor }}
                      aria-hidden
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accentColor">Accent color</Label>
                    <Input
                      id="accentColor"
                      type="text"
                      value={branding.accentColor}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, accentColor: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                    <div
                      className="h-8 w-full rounded-md border border-border"
                      style={{ backgroundColor: branding.accentColor }}
                      aria-hidden
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      type="url"
                      value={branding.logoUrl}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, logoUrl: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Logo preview</Label>
                  <div className="relative overflow-hidden rounded-lg border border-border bg-muted p-3">
                    <img
                      src={branding.logoUrl || defaultLogo}
                      alt="Company logo preview"
                      className="max-w-full h-auto rounded-md"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="pt-6">
              <SectionTitle icon={<UserCog className="size-4" />} title="Notification Preferences" />
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <CheckboxRow
                    id="notif-res-created"
                    label="Reservation created"
                    checked={notifications.reservationCreated}
                    onChange={(v) =>
                      setNotifications((n) => ({ ...n, reservationCreated: Boolean(v) }))
                    }
                  />
                  <CheckboxRow
                    id="notif-occupancy"
                    label="Occupancy alerts"
                    checked={notifications.occupancyAlerts}
                    onChange={(v) =>
                      setNotifications((n) => ({ ...n, occupancyAlerts: Boolean(v) }))
                    }
                  />
                  <CheckboxRow
                    id="notif-low-balance"
                    label="Low balance alerts"
                    checked={notifications.lowBalance}
                    onChange={(v) =>
                      setNotifications((n) => ({ ...n, lowBalance: Boolean(v) }))
                    }
                  />
                  <CheckboxRow
                    id="notif-weekly-report"
                    label="Weekly report"
                    checked={notifications.weeklyReport}
                    onChange={(v) =>
                      setNotifications((n) => ({ ...n, weeklyReport: Boolean(v) }))
                    }
                  />
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="notif-email">Notification email</Label>
                    <Input
                      id="notif-email"
                      type="email"
                      value={notifications.email}
                      onChange={(e) =>
                        setNotifications((n) => ({ ...n, email: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notif-sms">Notification phone (SMS)</Label>
                    <Input
                      id="notif-sms"
                      type="tel"
                      value={notifications.sms}
                      onChange={(e) =>
                        setNotifications((n) => ({ ...n, sms: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="backup" className="pt-6">
              <SectionTitle icon={<ServerCog className="size-4" />} title="Backup & Data Management" />
              <div className="grid gap-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="backup-frequency">Backup frequency</Label>
                    <Select
                      defaultValue="daily"
                      onValueChange={(v) => {
                        toast.message("Backup frequency updated", {
                          description: `Set to ${v}`,
                        });
                      }}
                    >
                      <SelectTrigger id="backup-frequency" className="bg-secondary">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="retention">Retention (days)</Label>
                    <Input
                      id="retention"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      defaultValue={30}
                      className="bg-secondary"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground hover:bg-surface-2"
                    onClick={() => toast.info("Backup started")}
                  >
                    Run backup now
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="bg-destructive text-destructive-foreground">
                        Purge old backups
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-popover text-popover-foreground border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Purge old backups?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete backups older than the retention policy.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => toast.success("Old backups purged")}>
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users" className="pt-6">
              <SectionTitle icon={<UserRoundCog className="size-4" />} title="User Accounts & Roles" />
              <div className={`flex justify-end mb-4 ${!isAdmin ? "opacity-60" : ""}`}>
                <Button
                  onClick={addUser}
                  disabled={!isAdmin}
                  className="bg-secondary hover:bg-surface-2 text-secondary-foreground"
                >
                  Add user
                </Button>
              </div>
              <div className="grid gap-4">
                {users.map((u) => (
                  <div key={u.id} className="rounded-lg border border-border bg-secondary p-4 grid gap-4">
                    <div className="grid sm:grid-cols-5 gap-4">
                      <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor={`uname-${u.id}`}>Name</Label>
                        <Input
                          id={`uname-${u.id}`}
                          value={u.name}
                          onChange={(e) =>
                            setUsers((prev) =>
                              prev.map((uu) =>
                                uu.id === u.id ? { ...uu, name: e.target.value } : uu
                              )
                            )
                          }
                          className={`bg-card ${disabledClass}`}
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor={`uemail-${u.id}`}>Email</Label>
                        <Input
                          id={`uemail-${u.id}`}
                          type="email"
                          value={u.email}
                          onChange={(e) =>
                            setUsers((prev) =>
                              prev.map((uu) =>
                                uu.id === u.id ? { ...uu, email: e.target.value } : uu
                              )
                            )
                          }
                          className={`bg-card ${disabledClass}`}
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Role</Label>
                        <Select
                          value={u.role}
                          onValueChange={(v: Role) =>
                            setUsers((prev) =>
                              prev.map((uu) =>
                                uu.id === u.id ? { ...uu, role: v } : uu
                              )
                            )
                          }
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className={`bg-card ${disabledClass}`}>
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover text-popover-foreground">
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="operator">Operator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          id={`uactive-${u.id}`}
                          checked={u.active}
                          onCheckedChange={(v) =>
                            setUsers((prev) =>
                              prev.map((uu) =>
                                uu.id === u.id ? { ...uu, active: Boolean(v) } : uu
                              )
                            )
                          }
                          disabled={!isAdmin}
                        />
                        <Label htmlFor={`uactive-${u.id}`}>Active</Label>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={!isAdmin}
                            className="bg-destructive text-destructive-foreground hover:opacity-90"
                          >
                            Remove user
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-popover text-popover-foreground border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {u.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The user will lose access immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeUser(u.id)}>
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="api" className="pt-6">
              <SectionTitle icon={<Settings2 className="size-4" />} title="API Key Management" />
              <div className="grid gap-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  {apiKeys.map((k) => (
                    <div key={k.label} className="rounded-lg border border-border bg-secondary p-4 grid gap-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold truncate">{k.label}</div>
                        <Badge className="bg-muted text-muted-foreground border border-border">
                          {new Date(k.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="text-sm break-words bg-card rounded-md p-2 border border-border">
                        {k.key}
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="secondary"
                          className="bg-secondary text-secondary-foreground hover:bg-surface-2"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(k.key)
                              .then(() => toast.success("API key copied"))
                              .catch(() => toast.error("Copy failed"));
                          }}
                        >
                          Copy
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="border-border"
                              disabled={!isAdmin}
                            >
                              Regenerate
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-popover text-popover-foreground border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Regenerate key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Existing integrations using this key will stop working until updated.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => regenerateApiKey(k.label)}>
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="bg-border" />
                <div className={`grid sm:grid-cols-3 gap-4 ${!isAdmin ? "opacity-60" : ""}`}>
                  <div className="grid gap-2">
                    <Label htmlFor="new-key-label">New key label</Label>
                    <Input id="new-key-label" className="bg-secondary" placeholder="e.g., Staging" />
                  </div>
                  <div className="flex items-end">
                    <Button
                      disabled={!isAdmin}
                      onClick={() => {
                        const labelInput = document.getElementById(
                          "new-key-label"
                        ) as HTMLInputElement | null;
                        const label = labelInput?.value?.trim();
                        if (!label) {
                          toast.error("Please provide a label");
                          return;
                        }
                        const newK = `pk_live_${Math.random().toString(36).slice(2)}${Date.now()}`;
                        setApiKeys((prev) => [
                          ...prev,
                          { label, key: maskKey(newK), createdAt: new Date().toISOString() },
                        ]);
                        if (labelInput) labelInput.value = "";
                        toast.success("API key created");
                      }}
                      className="bg-primary text-primary-foreground hover:opacity-90"
                    >
                      Create key
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="integrations" className="pt-6">
              <SectionTitle icon={<Settings2 className="size-4" />} title="System Integrations" />
              <div className="grid gap-6">
                <div className="flex items-center gap-3">
                  <Switch
                    id="webhooks-enabled"
                    checked={integrations.webhooksEnabled}
                    onCheckedChange={(v) =>
                      setIntegrations((i) => ({ ...i, webhooksEnabled: Boolean(v) }))
                    }
                  />
                  <div className="grid">
                    <Label htmlFor="webhooks-enabled">Enable webhooks</Label>
                    <small className="text-muted-foreground">
                      Receive event notifications at your webhook endpoint.
                    </small>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      placeholder="https://example.com/webhooks/parking"
                      value={integrations.webhookUrl}
                      onChange={(e) =>
                        setIntegrations((i) => ({ ...i, webhookUrl: e.target.value }))
                      }
                      className="bg-secondary"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="analytics-enabled"
                      checked={integrations.analyticsEnabled}
                      onCheckedChange={(v) =>
                        setIntegrations((i) => ({ ...i, analyticsEnabled: Boolean(v) }))
                      }
                    />
                    <Label htmlFor="analytics-enabled">Enable analytics</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-primary">{icon}</span>
      <h3 className="text-lg font-semibold leading-none">{title}</h3>
    </div>
  );
}

function CheckboxRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  min = 0,
  step = 1,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  step?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value || 0)))}
        className={`bg-card ${disabled ? "opacity-60 pointer-events-none" : ""}`}
        disabled={disabled}
      />
    </div>
  );
}