"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Navigation, Car, Clock, IndianRupee, QrCode, Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";

// Types
interface NearbyLocation {
  id: number;
  title: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  totalSlots: number;
  availableSlots: number;
  pricingMode: "hourly" | "slab" | string;
  basePricePerHourPaise: number;
  slabJson?: Array<{ minMinutes: number; maxMinutes: number; pricePaise: number }> | null;
  photos?: string[] | null;
  distance_meters?: number;
  eta_minutes?: number;
}

interface PriceResult {
  duration_minutes: number;
  price_paise: number;
  pricing_details: {
    mode: string;
    applied_rate: number;
    calculation_method: string;
  };
}

interface Reservation {
  id: number;
  locationId: number;
  customerUserId: string;
  vehicleNumber: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pricePaise: number;
  status: string;
  createdAt: string;
}

interface Transaction {
  id: number;
  reservationId: number;
  amountPaise: number;
  paymentMethod: string;
  upiVpa?: string | null;
  qrPayload?: string | null;
  status: string;
  createdAt: string;
}

export const CustomerPortal: React.FC = () => {
  const { data: session, isPending } = useSession();

  // Geolocation state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [nearby, setNearby] = useState<NearbyLocation[]>([]);
  const [fetchingNearby, setFetchingNearby] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking/payment state
  const [selected, setSelected] = useState<NearbyLocation | null>(null);
  const [vehicle, setVehicle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [price, setPrice] = useState<PriceResult | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [paying, setPaying] = useState(false);

  // Acquire location
  const askLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser");
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocLoading(false);
      },
      (err) => {
        setError(err.message || "Failed to get location");
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Fetch nearby approved locations within 1km
  const fetchNearby = useCallback(async () => {
    if (!coords) return;
    setFetchingNearby(true);
    setError(null);
    try {
      const url = `/api/locations/nearby?lat=${coords.lat}&lng=${coords.lng}&radiusMeters=1000`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch nearby locations");
      setNearby(data);
      if (data.length === 0) toast.message("No parking within 1km", { description: "Try moving closer or increasing radius." });
    } catch (e: any) {
      setError(e.message || "Failed to fetch nearby");
    } finally {
      setFetchingNearby(false);
    }
  }, [coords]);

  useEffect(() => {
    // Auto-request location once on mount
    askLocation();
  }, [askLocation]);

  useEffect(() => {
    if (coords) fetchNearby();
  }, [coords, fetchNearby]);

  useEffect(() => {
    if (!coords || fetchingNearby) return;
    const interval = setInterval(fetchNearby, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [coords, fetchNearby, fetchingNearby]);

  const formatINR = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

  // Calculate price
  const calculatePrice = async () => {
    if (!selected || !start || !end) {
      toast.error("Select slot and time range");
      return;
    }
    try {
      const res = await fetch("/api/reservations/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: selected.id,
          start_time: start,
          end_time: end,
        }),
      });
      const data: PriceResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Price calc failed");
      setPrice(data);
      toast.success("Price calculated");
    } catch (e: any) {
      toast.error(e.message || "Failed to calculate price");
    }
  };

  // Create reservation
  const createReservation = async () => {
    if (!session?.user) {
      toast.error("Sign in required");
      return;
    }
    if (!selected || !vehicle || !start || !end) {
      toast.error("Enter vehicle and time range");
      return;
    }
    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          location_id: selected.id,
          vehicle_number: vehicle.trim(),
          start_time: start,
          end_time: end,
        }),
      });
      const data: Reservation & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Reservation failed");
      setReservation(data);
      toast.success("Reservation confirmed");
    } catch (e: any) {
      toast.error(e.message || "Failed to reserve");
    }
  };

  // Initiate payment (UPI)
  const initiatePayment = async () => {
    if (!reservation) return;
    try {
      setPaying(true);
      const token = localStorage.getItem("bearer_token");
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          reservation_id: reservation.id,
          method: "upi",
        }),
      });
      const data: Transaction & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment initiation failed");
      setTxn(data);
      toast.success("UPI QR generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate payment");
    } finally {
      setPaying(false);
    }
  };

  // Mark paid and generate invoice
  const markPaidAndDownload = async () => {
    if (!txn) return;
    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch(`/api/transactions/${txn.id}/mark-paid`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm payment");
      toast.success("Payment confirmed");
      // Generate PDF invoice
      generateInvoicePDF();
    } catch (e: any) {
      toast.error(e.message || "Failed to complete payment");
    }
  };

  const generateInvoicePDF = () => {
    if (!reservation || !selected) return;
    const doc = new jsPDF();
    const amount = reservation.pricePaise;

    doc.setFontSize(16);
    doc.text("ParkOps Invoice", 20, 20);

    doc.setFontSize(11);
    doc.text(`Invoice Date: ${new Date().toLocaleString()}`, 20, 30);
    doc.text(`Reservation #${reservation.id}`, 20, 38);
    doc.text(`Customer: ${session?.user?.email ?? "-"}`, 20, 46);

    doc.text("Location", 20, 60);
    doc.text(`${selected.title}`, 20, 68);
    doc.text(`${selected.address ?? ""} ${selected.city ?? ""}`, 20, 76);

    doc.text("Booking", 20, 92);
    doc.text(`Vehicle: ${reservation.vehicleNumber}`, 20, 100);
    doc.text(`Start: ${new Date(reservation.startTime).toLocaleString()}`, 20, 108);
    doc.text(`End: ${new Date(reservation.endTime).toLocaleString()}`, 20, 116);
    doc.text(`Duration: ${reservation.durationMinutes} minutes`, 20, 124);

    doc.setFontSize(13);
    doc.text(`Total: ${formatINR(amount)}`, 20, 140);

    doc.save(`invoice_reservation_${reservation.id}.pdf`);
  };

  const resetFlow = () => {
    setSelected(null);
    setVehicle("");
    setStart("");
    setEnd("");
    setPrice(null);
    setReservation(null);
    setTxn(null);
  };

  if (isPending) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-4">Customer Portal</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-4">Customer Portal</h1>
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Sign in to find and book nearby parking</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = "/sign-in")} className="bg-primary text-primary-foreground">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Customer Portal</h1>
            <p className="text-muted-foreground">See only real-time availability within 1km of your current location.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={askLocation} disabled={locLoading} className="border-border">
              <Navigation className={`w-4 h-4 mr-2 ${locLoading ? "animate-spin" : ""}`} />
              {locLoading ? "Locating..." : "Use my location"}
            </Button>
            <Button variant="outline" onClick={fetchNearby} disabled={!coords || fetchingNearby} className="border-border">
              <MapPin className="w-4 h-4 mr-2" />
              Refresh Nearby
            </Button>
          </div>
        </div>

        {error && <div className="text-destructive text-sm" role="alert">{error}</div>}

        {/* Nearby results */}
        {nearby.length > 0 && (
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearby.map((loc) => (
                <Card key={loc.id} className={`border-border hover:border-primary/50 transition-colors ${selected?.id === loc.id ? "ring-1 ring-primary" : ""}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="truncate">{loc.title}</span>
                      <span className="text-sm font-medium text-muted-foreground">{(loc.distance_meters ?? 0) < 50 ? "<50m" : `${Math.round((loc.distance_meters ?? 0))} m`}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {loc.address}{loc.city ? `, ${loc.city}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-secondary/50">{loc.availableSlots} / {loc.totalSlots} available</Badge>
                      <Badge variant="secondary" className="bg-secondary/50">
                        {loc.pricingMode === "hourly" ? (<span className="inline-flex items-center"><IndianRupee className="w-3 h-3 mr-1" />{(loc.basePricePerHourPaise/100).toFixed(0)}/hr</span>) : "Slab pricing"}
                      </Badge>
                      {typeof loc.eta_minutes === "number" && (
                        <Badge variant="secondary" className="bg-secondary/50"><Clock className="w-3 h-3 mr-1" />{loc.eta_minutes} min</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => setSelected(loc)}>Select</Button>
                      {selected?.id === loc.id && (
                        <span className="text-xs text-muted-foreground">Selected</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {fetchingNearby && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Updating availability...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Booking / Payment */}
        {selected && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Book: {selected.title}</CardTitle>
              <CardDescription>Enter your vehicle number and time window.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!reservation && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Vehicle number</Label>
                    <Input id="vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="e.g. MH12AB1234" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start">Start time</Label>
                    <Input id="start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End time</Label>
                    <Input id="end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
                  </div>
                </div>
              )}

              {!reservation && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={calculatePrice} className="border-border">Calculate Price</Button>
                  <Button onClick={createReservation} className="bg-primary text-primary-foreground">Reserve</Button>
                  <Button variant="ghost" onClick={resetFlow}>Cancel</Button>
                </div>
              )}

              {price && !reservation && (
                <div className="text-sm text-muted-foreground">
                  Estimated: <span className="font-medium text-foreground">{formatINR(price.price_paise)}</span> · {price.pricing_details.calculation_method}
                </div>
              )}

              {reservation && (
                <div className="space-y-4">
                  <div className="text-sm">
                    <div>Reservation #{reservation.id} confirmed</div>
                    <div className="text-muted-foreground">Amount due: <span className="text-foreground font-medium">{formatINR(reservation.pricePaise)}</span></div>
                  </div>
                  {!txn ? (
                    <Button onClick={initiatePayment} disabled={paying} className="bg-primary text-primary-foreground">
                      <QrCode className="w-4 h-4 mr-2" /> {paying ? "Generating..." : "Pay via UPI"}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                        <div className="text-sm text-muted-foreground">Scan to pay via UPI</div>
                        <div className="text-sm">Amount: <span className="font-medium">{formatINR(txn.amountPaise)}</span></div>
                      </div>
                      {txn.qrPayload ? (
                        <div className="bg-white p-3 rounded inline-block">
                          <QRCodeCanvas value={txn.qrPayload} size={168} includeMargin={true} />
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">QR payload unavailable</div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button onClick={markPaidAndDownload} className="bg-primary text-primary-foreground">I have paid</Button>
                        <Button variant="ghost" onClick={resetFlow}>New booking</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerPortal;