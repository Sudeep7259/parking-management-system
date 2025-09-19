"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LocationItem = {
  id: number;
  title: string;
  address: string;
  city: string;
  state: string | null;
  pincode: string | null;
  latitude: number;
  longitude: number;
  totalSlots: number;
  availableSlots: number;
  pricingMode: "hourly" | "daily" | "slab";
  basePricePerHourPaise: number;
  approved: boolean;
  createdAt: string;
};

export const AddParkingSection: React.FC = () => {
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    latitude: "",
    longitude: "",
    totalSlots: "1",
  });

  const [pricingOpen, setPricingOpen] = React.useState(false);
  const [pricingMode, setPricingMode] = React.useState<"hourly" | "daily" | "slab">("hourly");
  const [basePricePerHourPaise, setBasePricePerHourPaise] = React.useState("1000"); // default ₹10/hr
  const [submitting, setSubmitting] = React.useState(false);

  const [locations, setLocations] = React.useState<LocationItem[]>([]);
  const [loadingList, setLoadingList] = React.useState(false);

  const fetchLocations = React.useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await fetch("/api/locations?page=1&pageSize=10");
      const data = await res.json();
      if (res.ok) {
        setLocations(data.data || []);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingList(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const fillFromGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, latitude: String(latitude), longitude: String(longitude) }));
        toast.success("Location captured");
      },
      () => toast.error("Failed to get location. Please enter coordinates manually.")
    );
  };

  const validatePrimary = () => {
    if (!form.title.trim()) return "Please enter a title";
    if (!form.address.trim()) return "Please enter address";
    if (!form.city.trim()) return "Please enter city";
    if (!form.latitude || isNaN(Number(form.latitude))) return "Latitude must be a number";
    if (!form.longitude || isNaN(Number(form.longitude))) return "Longitude must be a number";
    if (!form.totalSlots || Number(form.totalSlots) < 1) return "Total slots must be at least 1";
    return null;
  };

  const onNextPricing = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePrimary();
    if (err) {
      toast.error(err);
      return;
    }
    setPricingOpen(true);
  };

  const submitAll = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
    try {
      setSubmitting(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        photos: [],
        totalSlots: Number(form.totalSlots),
        pricingMode,
        basePricePerHourPaise: Number(basePricePerHourPaise),
      };

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || "Failed to add parking location";
        toast.error(msg);
        return;
      }

      toast.success("Parking location submitted! Pending approval.");
      setPricingOpen(false);
      setForm({ title: "", description: "", address: "", city: "", state: "", pincode: "", latitude: "", longitude: "", totalSlots: "1" });
      setPricingMode("hourly");
      setBasePricePerHourPaise("1000");
      fetchLocations();
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <Card className="bg-card p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Add your parking near home</h2>
        <p className="text-sm text-muted-foreground">Fill details and set your price. Your listing will appear on the website (may require admin approval).</p>
        <form onSubmit={onNextPricing} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="col-span-1 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g., Covered spot near MG Road" />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, Area" />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="State (optional)" />
          </div>
          <div>
            <Label htmlFor="pincode">Pincode</Label>
            <Input id="pincode" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} placeholder="Pincode (optional)" />
          </div>
          <div>
            <Label htmlFor="totalSlots">Total Slots</Label>
            <Input id="totalSlots" type="number" min={1} value={form.totalSlots} onChange={(e) => setForm((f) => ({ ...f, totalSlots: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="e.g., 12.9716" />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="e.g., 77.5946" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Any details like covered/open, security, access hours..." rows={3} />
          </div>
          <div className="col-span-1 sm:col-span-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={fillFromGeolocation}>Use my current location</Button>
            <Button type="submit" className="bg-primary text-primary-foreground">Next: Set Price</Button>
          </div>
        </form>
      </Card>

      <Card className="bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Recently added</h3>
          <Button variant="ghost" onClick={fetchLocations} disabled={loadingList}>Refresh</Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {locations.map((loc) => (
            <div key={loc.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold truncate">{loc.title}</div>
                <span className="text-xs text-muted-foreground">{loc.city}</span>
              </div>
              <div className="text-sm text-muted-foreground truncate">{loc.address}</div>
              <div className="mt-2 text-sm">{loc.availableSlots}/{loc.totalSlots} available • {loc.pricingMode} • ₹{(loc.basePricePerHourPaise/100).toFixed(2)}/hr</div>
              {!loc.approved ? (
                <div className="mt-1 text-xs text-muted-foreground">Pending approval</div>
              ) : null}
            </div>
          ))}
          {locations.length === 0 && (
            <div className="text-sm text-muted-foreground">No locations yet.</div>
          )}
        </div>
      </Card>

      <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
        <DialogContent className="bg-popover text-popover-foreground">
          <DialogHeader>
            <DialogTitle>Set your pricing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pricing mode</Label>
              <Select value={pricingMode} onValueChange={(v) => setPricingMode(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select pricing mode" /></SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="slab">Slab (set base for now)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base price per hour (₹)</Label>
              <Input type="number" min={0} value={String(Number(basePricePerHourPaise)/100)} onChange={(e) => {
                const rupees = Number(e.target.value || 0);
                setBasePricePerHourPaise(String(Math.round(rupees * 100)));
              }} />
              <p className="mt-1 text-xs text-muted-foreground">Charged as base in paise: {basePricePerHourPaise}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPricingOpen(false)}>Cancel</Button>
            <Button onClick={submitAll} disabled={submitting} className="bg-primary text-primary-foreground">{submitting ? "Submitting..." : "Save & Publish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AddParkingSection;