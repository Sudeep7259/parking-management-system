"use client";

import React, { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, RefreshCw, MapPin } from "lucide-react";
import { toast } from "sonner";

interface PendingLocation {
  id: number;
  ownerUserId: string;
  title: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude: number;
  longitude: number;
  photos?: string[] | null;
  totalSlots: number;
  availableSlots: number;
  pricingMode: string;
  basePricePerHourPaise: number;
  slabJson?: any;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name?: string | null; email?: string | null };
}

export const AdminPortal = () => {
  const { data: session, isPending: sessionPending } = useSession();
  const [pending, setPending] = useState<PendingLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("bearer_token");
      const res = await fetch("/api/locations/pending", {
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch pending locations");
      setPending(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) fetchPending();
  }, [session?.user]);

  const handleApprove = async (id: number, approve: boolean) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bearer_token");
      const res = await fetch(`/api/locations/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ approve }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Action failed");
      setPending((prev) => prev.filter((p) => p.id !== id));
      toast.success(approve ? "Location approved" : "Location rejected");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (sessionPending) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-4">Admin Portal</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-4">Admin Portal</h1>
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access the admin portal</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/sign-in"} className="bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Portal</h1>
          <p className="text-muted-foreground">Approve or reject newly submitted parking locations.</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Pending: {pending.length}</div>
          <Button 
            onClick={fetchPending} 
            disabled={loading}
            variant="outline" 
            size="sm"
            className="border-border hover:bg-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="text-destructive text-sm" role="alert">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pending.map((loc) => (
            <Card key={loc.id} className="border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{loc.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <CardDescription className="line-clamp-1">
                        {loc.address}, {loc.city}
                      </CardDescription>
                    </div>
                    <CardDescription className="text-sm mt-2">
                      Owner: {loc.owner?.name || loc.ownerUserId}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="bg-secondary/50">
                    {loc.totalSlots} slots
                  </Badge>
                  <Badge variant="secondary" className="bg-secondary/50">
                    {loc.pricingMode === "hourly" ? `₹${loc.basePricePerHourPaise / 100}/hr` : "Slab pricing"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(loc.id, true)}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(loc.id, false)}
                    disabled={loading}
                    variant="destructive"
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!pending.length && !loading && (
          <Card className="border-border">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No pending locations to review</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};