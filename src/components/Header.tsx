"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ParkingMeter,
  SquareMenu,
  Settings2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type NavItem = {
  key: string;
  label: string;
  href: string;
};

type SearchItem = {
  id: string;
  type: "plate" | "driver";
  label: string;
  value: string;
  meta?: string;
};

type AlertItem = {
  id: string;
  type: "overstay" | "violation" | "notice";
  title: string;
  message?: string;
  timestamp: string | Date;
};

type User = {
  name: string;
  role: string;
  email?: string;
};

interface HeaderProps {
  className?: string;
  navItems?: NavItem[];
  activeKey?: string;
  onTabChange?: (key: string) => void;
  searchItems?: SearchItem[];
  onSearchSelect?: (item: SearchItem) => void;
  alerts?: AlertItem[];
  onAlertView?: (alert: AlertItem) => void;
  onAlertDismiss?: (alert: AlertItem) => void;
  user?: User;
  onLogout?: () => void;
}

export default function Header({
  className,
  navItems = [
    { key: "dashboard", label: "Dashboard", href: "/dashboard" },
    { key: "spaces", label: "Spaces", href: "/spaces" },
    { key: "reservations", label: "Reservations", href: "/reservations" },
    { key: "billing", label: "Billing", href: "/billing" },
    { key: "visitors", label: "Visitors", href: "/visitors" },
    { key: "reports", label: "Reports", href: "/reports" },
    { key: "settings", label: "Settings", href: "/settings" },
  ],
  activeKey = "dashboard",
  onTabChange,
  searchItems = [],
  onSearchSelect,
  alerts = [],
  onAlertView,
  onAlertDismiss,
  user,
  onLogout,
}: HeaderProps) {
  const [mounted, setMounted] = React.useState(false);
  const [themeDark, setThemeDark] = React.useState(true);

  const [alertsOpen, setAlertsOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const [query, setQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState<number>(-1);

  const localAlerts = React.useMemo(() => alerts, [alerts]);
  const alertCount = localAlerts.length;

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("theme") || "dark";
      const isDark = saved === "dark";
      setThemeDark(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, []);

  const handleThemeToggle = (checked: boolean) => {
    setThemeDark(checked);
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", checked);
      window.localStorage.setItem("theme", checked ? "dark" : "light");
    }
  };

  const filtered = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return searchItems
      .filter((s) => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q) || (s.meta?.toLowerCase().includes(q) ?? false))
      .slice(0, 8);
  }, [query, searchItems]);

  const commitSelect = (item: SearchItem) => {
    onSearchSelect?.(item);
    toast.success(`Selected ${item.type === "plate" ? "plate" : "driver"}: ${item.label}`);
    setQuery("");
    setSearchOpen(false);
    setHighlightIndex(-1);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[Math.max(0, highlightIndex)];
      if (item) commitSelect(item);
    } else if (e.key === "Escape") {
      setSearchOpen(false);
      setHighlightIndex(-1);
    }
  };

  const onChangeTab = (key: string) => {
    onTabChange?.(key);
  };

  // --- Auth-aware user display (uses bearer token presence as lightweight heuristic) ---
  const [hasToken, setHasToken] = React.useState(false);
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setHasToken(!!localStorage.getItem("bearer_token"));
    }
  }, []);

  const isLoggedIn = !!user || hasToken;

  // Render
  return (
    <header
      className={cn(
        "w-full bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border",
        "text-foreground",
        className
      )}
      role="banner"
    >
      <div className="mx-auto w-full max-w-full px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          {/* Branding + Mobile menu */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md p-1.5 text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Parking Management Home"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ParkingMeter className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="hidden sm:block font-semibold tracking-[-0.01em]">
                ParkOps
              </span>
            </Link>

            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  aria-label="Open navigation menu"
                >
                  <SquareMenu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} className="w-56 bg-popover text-popover-foreground">
                <DropdownMenuLabel className="text-sm">Navigation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {navItems.map((item) => (
                    <DropdownMenuItem key={item.key} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "w-full rounded-sm px-2 py-1.5 text-sm",
                          activeKey === item.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={(e) => {
                          if (item.href === "#") e.preventDefault();
                          onChangeTab(item.key);
                        }}
                      >
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Portals</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/customer" className="w-full rounded-sm px-2 py-1.5 text-sm">Customer</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/owner" className="w-full rounded-sm px-2 py-1.5 text-sm">Client</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="w-full rounded-sm px-2 py-1.5 text-sm">Admin</Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tabs - Desktop */}
          <div className="hidden min-w-0 sm:flex">
            <Tabs value={activeKey}>
              <TabsList className="bg-secondary text-secondary-foreground">
                {navItems.map((item) => (
                  <TabsTrigger
                    key={item.key}
                    value={item.key}
                    className={cn(
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                      "px-3"
                    )}
                    asChild
                    onClick={() => onChangeTab(item.key)}
                  >
                    <Link href={item.href === "#" ? "#" : item.href} onClick={(e) => {
                      if (item.href === "#") e.preventDefault();
                    }} className="min-w-0 truncate">
                      {item.label}
                    </Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Quick Portals - Desktop */}
          <div className="hidden md:flex items-center gap-2 pl-2">
            <Button asChild variant="ghost" className="h-9 px-3">
              <Link href="/customer">Customer</Link>
            </Button>
            <Button asChild variant="ghost" className="h-9 px-3">
              <Link href="/owner">Client</Link>
            </Button>
            <Button asChild variant="ghost" className="h-9 px-3">
              <Link href="/admin">Admin</Link>
            </Button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Global Search */}
          <div className="relative w-full max-w-md min-w-0">
            <Command shouldFilter={false}>
              <div className="relative">
                <CommandInput
                  value={query}
                  onValueChange={(v) => {
                    setQuery(v);
                    setSearchOpen(!!v);
                  }}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Search plates or drivers..."
                  className={cn(
                    "h-9 bg-secondary text-foreground placeholder:text-muted-foreground",
                    "border border-input focus:border-input focus:ring-2 focus:ring-ring"
                  )}
                  aria-label="Global search"
                />
              </div>
              <div className={cn("absolute left-0 right-0 top-10 z-50", searchOpen && filtered.length ? "block" : "hidden")}>
                <div className="rounded-md border border-border bg-popover shadow-lg">
                  <CommandList className="max-h-72 overflow-auto">
                    {!filtered.length ? (
                      <CommandEmpty>No results found.</CommandEmpty>
                    ) : (
                      <CommandGroup heading="Results">
                        {filtered.map((item, idx) => (
                          <CommandItem
                            key={item.id}
                            value={item.value}
                            className={cn(
                              "cursor-pointer",
                              idx === highlightIndex ? "bg-muted/60" : ""
                            )}
                            onSelect={() => commitSelect(item)}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={cn(
                                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded",
                                  item.type === "plate" ? "bg-chart-1/20 text-chart-1" : "bg-chart-5/20 text-chart-5"
                                )}
                                aria-hidden="true"
                              >
                                {item.type === "plate" ? "P" : "D"}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{item.label}</span>
                                  <span className="text-xs text-muted-foreground">· {item.type === "plate" ? "Plate" : "Driver"}</span>
                                </div>
                                {item.meta ? (
                                  <div className="text-xs text-muted-foreground truncate">{item.meta}</div>
                                ) : null}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </div>
              </div>
            </Command>
          </div>

          {/* Actions: Alerts, Theme, Profile */}
          <div className="ml-2 flex items-center gap-1 sm:gap-2">
            {/* Alerts */}
            <Popover open={alertsOpen} onOpenChange={setAlertsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 px-3"
                  aria-label="Open alerts"
                >
                  <span className="text-sm">Alerts</span>
                  {alertCount > 0 ? (
                    <span
                      aria-label={`${alertCount} new alerts`}
                      className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground"
                    >
                      {alertCount > 99 ? "99+" : alertCount}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-96 max-w-[90vw] bg-popover text-popover-foreground p-0 border-border"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="font-semibold">Notifications</div>
                  <span className="text-xs text-muted-foreground">{alertCount} new</span>
                </div>
                <div className="max-h-80 overflow-auto">
                  {localAlerts.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      You're all caught up. No alerts.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {localAlerts.map((a) => (
                        <li key={a.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                                a.type === "violation" ? "bg-destructive" : a.type === "overstay" ? "bg-chart-3" : "bg-chart-5"
                              )}
                              aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-foreground break-words">{a.title}</p>
                                <time className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTime(a.timestamp)}
                                </time>
                              </div>
                              {a.message ? (
                                <p className="mt-1 text-sm text-muted-foreground break-words">
                                  {a.message}
                                </p>
                              ) : null}
                              <div className="mt-3 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 px-3 bg-primary text-primary-foreground hover:opacity-95"
                                  onClick={() => {
                                    onAlertView?.(a);
                                    toast.message("Opening alert", { description: a.title });
                                    setAlertsOpen(false);
                                  }}
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 px-3"
                                  onClick={() => {
                                    onAlertDismiss?.(a);
                                    toast.success("Alert dismissed");
                                  }}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Theme toggle */}
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs text-muted-foreground">Dark</span>
              {mounted ? (
                <Switch
                  checked={themeDark}
                  onCheckedChange={handleThemeToggle}
                  aria-label="Toggle dark mode"
                />
              ) : (
                <div className="h-6 w-10 rounded-full bg-muted" aria-hidden="true" />
              )}
            </div>

            {/* Profile / Auth */}
            {isLoggedIn ? (
              <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-md bg-secondary px-2 py-1.5 text-left transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-haspopup="menu"
                    aria-label="Open profile menu"
                  >
                    <AvatarFallback name={(user?.name) || "User"} />
                    <div className="hidden min-w-0 sm:flex sm:flex-col">
                      <span className="truncate text-sm text-foreground leading-tight">{user?.name || "User"}</span>
                      <span className="truncate text-xs text-muted-foreground leading-tight">{user?.role || "Member"}</span>
                    </div>
                    <Settings2 className="ml-1 hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-popover text-popover-foreground">
                  <DropdownMenuLabel className="flex items-center gap-3">
                    <AvatarFallback name={(user?.name) || "User"} />
                    <div className="min-w-0">
                      <div className="truncate">{user?.name || "User"}</div>
                      <div className="text-xs text-muted-foreground truncate">{user?.email ?? user?.role ?? "Member"}</div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="w-full">
                        Account settings
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      onLogout?.();
                      toast.success("Signed out");
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" className="h-9 px-3">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild className="h-9 px-3 bg-primary text-primary-foreground">
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function AvatarFallback({ name }: { name: string }) {
  const initials = React.useMemo(() => {
    const parts = name.split(" ").filter(Boolean);
    return (parts[0]?.[0] ?? "").concat(parts[parts.length - 1]?.[0] ?? "").toUpperCase() || "U";
  }, [name]);

  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-muted text-sm font-semibold text-foreground"
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function formatTime(ts: string | Date): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleString();
}