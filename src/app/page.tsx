"use client";

import * as React from "react";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import SpaceManagement from "@/components/SpaceManagement";
import Reservations from "@/components/Reservations";
import BillingAndPricing from "@/components/BillingAndPricing";
import VisitorsAndHistory from "@/components/VisitorsAndHistory";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import IndiaRealtime from "@/components/IndiaRealtime";
import AddParkingSection from "@/components/AddParkingSection";

type NavKey =
  | "dashboard"
  | "spaces"
  | "reservations"
  | "billing"
  | "visitors"
  | "reports"
  | "settings"
  | "addParking";

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

export default function Page() {
  const [activeTab, setActiveTab] = React.useState<NavKey>("dashboard");
  const [showPortalPicker, setShowPortalPicker] = React.useState(true);
  const [portal, setPortal] = React.useState<"customer" | "client" | "admin" | null>(null);

  const [alerts, setAlerts] = React.useState<AlertItem[]>([
    {
      id: "alrt-1",
      type: "overstay",
      title: "Overstay detected in Zone D",
      message: "Vehicle 7XYZ123 exceeded reservation by 25 minutes.",
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: "alrt-2",
      type: "violation",
      title: "Unauthorized parking in Zone A",
      message: "Plate 5KLM456 does not have a valid permit.",
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ]);

  const searchItems = React.useMemo<SearchItem[]>(
    () => [
      { id: "s1", type: "plate", label: "7XYZ123", value: "7XYZ123", meta: "Alex Johnson • Zone A • A-02" },
      { id: "s2", type: "driver", label: "Maria Gomez", value: "maria-gomez", meta: "Plate 8XYZ789 • Zone B • B-02" },
      { id: "s3", type: "plate", label: "5KLM456", value: "5KLM456", meta: "Chris Lee • Zone C • C-01" },
      { id: "s4", type: "driver", label: "Marcus Lee", value: "marcus-lee", meta: "Plate KJH-2201 • Zone B" },
      { id: "s5", type: "plate", label: "VIP-8842", value: "VIP-8842", meta: "VIP • V-02" },
    ],
    []
  );

  const navItems = React.useMemo(
    () => {
      if (portal === "customer") {
        return [
          { key: "reservations", label: "Reservations", href: "#" },
        ];
      }
      if (portal === "client") {
        return [
          { key: "addParking", label: "Add Parking", href: "#" },
        ];
      }
      if (portal === "admin") {
        return [
          { key: "dashboard", label: "Dashboard", href: "#" },
          { key: "spaces", label: "Spaces", href: "#" },
          { key: "reservations", label: "Reservations", href: "#" },
          { key: "billing", label: "Billing", href: "#" },
          { key: "visitors", label: "Visitors", href: "#" },
          { key: "reports", label: "Reports", href: "#" },
          { key: "users", label: "Users", href: "#" },
          { key: "settings", label: "Settings", href: "#" },
        ];
      }
      return [] as { key: string; label: string; href: string }[];
    },
    [portal]
  );

  // Allowed tabs by portal to strictly gate navigation and rendering
  const allowedTabs = React.useMemo<NavKey[]>(() => {
    if (portal === "customer") return ["reservations"];
    if (portal === "client") return ["addParking"];
    if (portal === "admin") return [
      "dashboard",
      "spaces",
      "reservations",
      "billing",
      "visitors",
      "reports",
      "users",
      "settings",
    ];
    return [];
  }, [portal]);

  // Ensure activeTab always valid for selected portal
  React.useEffect(() => {
    if (!portal) return;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [portal, allowedTabs, activeTab]);

  const handleTabChange = React.useCallback((key: string) => {
    const k = key as NavKey;
    if (allowedTabs.includes(k)) setActiveTab(k);
    else if (allowedTabs.length) setActiveTab(allowedTabs[0]);
  }, [allowedTabs]);

  const handleSearchSelect = React.useCallback((item: any) => {
    // Route to a relevant section when selecting a result, but stay within allowed tabs
    const wanted: NavKey = item.type === "plate" ? "reservations" : "visitors";
    if (allowedTabs.includes(wanted)) setActiveTab(wanted);
    else if (allowedTabs.length) setActiveTab(allowedTabs[0]);
  }, [allowedTabs]);

  const handleAlertView = React.useCallback((alert: any) => {
    // Navigate based on alert type, constrained to allowed tabs
    let wanted: NavKey = "reports";
    if (alert.type === "violation") wanted = "visitors";
    else if (alert.type === "overstay") wanted = "reservations";

    if (allowedTabs.includes(wanted)) setActiveTab(wanted);
    else if (allowedTabs.length) setActiveTab(allowedTabs[0]);

    // Optionally mark as read
    // ... existing setAlerts filter remains ...
    // We'll keep the dismiss behavior the same
  }, [allowedTabs]);

  const handleAlertDismiss = React.useCallback((alert: AlertItem) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
  }, []);

  const onLogout = React.useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bearer_token");
    }
    // Keep users within their current portal's default tab
    setActiveTab(() => {
      if (portal === "customer") return "reservations";
      if (portal === "client") return "addParking";
      return "dashboard"; // admin or no portal
    });
  }, [portal]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {!showPortalPicker && (
        <Header
          className="sticky top-0 z-40"
          navItems={navItems}
          activeKey={activeTab}
          onTabChange={handleTabChange}
          searchItems={searchItems}
          onSearchSelect={handleSearchSelect}
          alerts={alerts}
          onAlertView={(a) => {
            // keep original behavior then constrain
            let wanted: NavKey = "reports";
            if (a.type === "violation") wanted = "visitors";
            else if (a.type === "overstay") wanted = "reservations";
            if (allowedTabs.includes(wanted)) setActiveTab(wanted);
            else if (allowedTabs.length) setActiveTab(allowedTabs[0]);
            setAlerts((prev) => prev.filter((x) => x.id !== a.id));
          }}
          onAlertDismiss={(a) => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
          onLogout={onLogout}
          showPortals={false}
        />
      )}

      {showPortalPicker ? (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-10">
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Who are you?</h1>
              <p className="text-muted-foreground">Choose a portal to get started.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                className="group rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-left p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setPortal("customer");
                  setActiveTab("reservations");
                  setShowPortalPicker(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Customer</h2>
                    <p className="mt-1 text-sm text-muted-foreground">View available parking slots and make reservations.</p>
                  </div>
                  <span className="rounded-md bg-primary/15 text-primary px-2 py-1 text-xs">Browse Slots</span>
                </div>
              </button>

              <button
                type="button"
                className="group rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-left p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setPortal("client");
                  setActiveTab("addParking");
                  setShowPortalPicker(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Client</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Add your parking place and set your price.</p>
                  </div>
                  <span className="rounded-md bg-primary/15 text-primary px-2 py-1 text-xs">Add Parking</span>
                </div>
              </button>

              <button
                type="button"
                className="group rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-left p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setPortal("admin");
                  setActiveTab("dashboard");
                  setShowPortalPicker(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Admin</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Manage spaces, users, and monitor activity.</p>
                  </div>
                  <span className="rounded-md bg-primary/15 text-primary px-2 py-1 text-xs">Open Admin</span>
                </div>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!showPortalPicker && (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {activeTab === "dashboard" && (
          <section className="space-y-6">
            <IndiaRealtime className="w-full" />
            <Dashboard live className="w-full" />
          </section>
        )}

        {activeTab === "spaces" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <SpaceManagement />
            </div>
          </section>
        )}

        {activeTab === "reservations" && (
          <section className="space-y-6">
            <Reservations />
          </section>
        )}

        {activeTab === "billing" && (
          <section className="space-y-6">
            <BillingAndPricing />
          </section>
        )}

        {activeTab === "visitors" && (
          <section className="space-y-6">
            <VisitorsAndHistory />
          </section>
        )}

        {activeTab === "reports" && (
          <section className="space-y-6">
            <Reports />
          </section>
        )}

        {activeTab === "users" && (
          <section className="space-y-6">
            <UserManagement />
          </section>
        )}

        {activeTab === "settings" && (
          <section className="space-y-6">
            <Settings />
          </section>
        )}

        {activeTab === "addParking" && (
          <section className="space-y-6">
            <AddParkingSection />
          </section>
        )}
      </main>
      )}
    </div>
  );
}