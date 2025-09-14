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

type NavKey =
  | "dashboard"
  | "spaces"
  | "reservations"
  | "billing"
  | "visitors"
  | "reports"
  | "settings";

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
    () => [
      { key: "dashboard", label: "Dashboard", href: "#" },
      { key: "spaces", label: "Spaces", href: "#" },
      { key: "reservations", label: "Reservations", href: "#" },
      { key: "billing", label: "Billing", href: "#" },
      { key: "visitors", label: "Visitors", href: "#" },
      { key: "reports", label: "Reports", href: "#" },
      { key: "settings", label: "Settings", href: "#" },
    ],
    []
  );

  const handleTabChange = React.useCallback((key: string) => {
    setActiveTab(key as NavKey);
  }, []);

  const handleSearchSelect = React.useCallback((item: SearchItem) => {
    // Route to a relevant section when selecting a result
    if (item.type === "plate") {
      setActiveTab("reservations");
    } else {
      setActiveTab("visitors");
    }
  }, []);

  const handleAlertView = React.useCallback((alert: AlertItem) => {
    // Navigate to a relevant section based on alert type
    if (alert.type === "violation") {
      setActiveTab("visitors");
    } else if (alert.type === "overstay") {
      setActiveTab("reservations");
    } else {
      setActiveTab("reports");
    }
    // Optionally mark as read
    setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
  }, []);

  const handleAlertDismiss = React.useCallback((alert: AlertItem) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
  }, []);

  const onLogout = React.useCallback(() => {
    // Reset to dashboard on logout for this demo
    setActiveTab("dashboard");
  }, []);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <Header
        className="sticky top-0 z-40"
        navItems={navItems}
        activeKey={activeTab}
        onTabChange={handleTabChange}
        searchItems={searchItems}
        onSearchSelect={handleSearchSelect}
        alerts={alerts}
        onAlertView={handleAlertView}
        onAlertDismiss={handleAlertDismiss}
        onLogout={onLogout}
      />

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

        {activeTab === "settings" && (
          <section className="space-y-6">
            <Settings />
          </section>
        )}
      </main>
    </div>
  );
}