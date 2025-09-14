"use client";

import { useSession } from "@/lib/auth-client";
import { useState } from "react";

interface FormData {
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  photos: string;
  totalSlots: string;
  pricingMode: "hourly" | "slab";
  basePricePerHourPaise: string;
  slabJson: string;
}

export const OwnerPortal = () => {
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    latitude: "",
    longitude: "",
    photos: "",
    totalSlots: "",
    pricingMode: "hourly",
    basePricePerHourPaise: "",
    slabJson: ""
  });

  const parsePhotos = (input: string): string[] => {
    if (!input.trim()) return [];
    return input.split(",").map(url => url.trim()).filter(Boolean);
  };

  const safeParseJSON = <T,>(input: string): T | null => {
    if (!input.trim()) return null;
    try {
      return JSON.parse(input) as T;
    } catch {
      return null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Title is required");
      return false;
    }
    if (!formData.address.trim()) {
      setError("Address is required");
      return false;
    }
    if (!formData.city.trim()) {
      setError("City is required");
      return false;
    }
    const lat = parseFloat(formData.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError("Latitude must be a valid number between -90 and 90");
      return false;
    }
    const lng = parseFloat(formData.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError("Longitude must be a valid number between -180 and 180");
      return false;
    }
    const slots = parseInt(formData.totalSlots);
    if (isNaN(slots) || slots < 1) {
      setError("Total slots must be a positive number");
      return false;
    }
    const price = parseInt(formData.basePricePerHourPaise);
    if (isNaN(price) || price < 0) {
      setError("Base price must be a non-negative number");
      return false;
    }
    if (formData.pricingMode === "slab") {
      const slabData = safeParseJSON<any[]>(formData.slabJson);
      if (!slabData || !Array.isArray(slabData)) {
        setError("Valid slab JSON configuration is required for slab pricing");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        setError("Authentication token not found");
        return;
      }

      const photos = parsePhotos(formData.photos);
      const slabData = formData.pricingMode === "slab" 
        ? JSON.parse(formData.slabJson) 
        : null;

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        photos: photos.length ? photos : undefined,
        totalSlots: parseInt(formData.totalSlots),
        pricingMode: formData.pricingMode,
        basePricePerHourPaise: parseInt(formData.basePricePerHourPaise),
        slabJson: slabData || undefined
      };

      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      setSuccess(true);
      setFormData({
        title: "",
        description: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        latitude: "",
        longitude: "",
        photos: "",
        totalSlots: "",
        pricingMode: "hourly",
        basePricePerHourPaise: "",
        slabJson: ""
      });
    } catch (err) {
      setError((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-4">Owner Portal</h1>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-4">Owner Portal</h1>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-muted-foreground mb-4">Please sign in to access the Owner Portal.</p>
            <a href="/sign-in" className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-4">Owner Portal</h1>
        <p className="text-muted-foreground mb-8">Submit a new parking location to the marketplace. An owner role is required to list locations.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Details Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                  Title *
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="e.g. Downtown Premium Parking"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground min-h-[80px]"
                  placeholder="Brief description of the parking location"
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
                  Address *
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="123 Main Street"
                  required
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-foreground mb-2">
                  City *
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-foreground mb-2">
                  State
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="State"
                />
              </div>
              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-foreground mb-2">
                  Pincode
                </label>
                <input
                  id="pincode"
                  name="pincode"
                  type="text"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="123456"
                />
              </div>
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-foreground mb-2">
                  Latitude *
                </label>
                <input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="19.0760"
                  required
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-foreground mb-2">
                  Longitude *
                </label>
                <input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="72.8777"
                  required
                />
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pricingMode" className="block text-sm font-medium text-foreground mb-2">
                  Pricing Mode *
                </label>
                <select
                  id="pricingMode"
                  name="pricingMode"
                  value={formData.pricingMode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                  required
                >
                  <option value="hourly">Hourly</option>
                  <option value="slab">Slab</option>
                </select>
              </div>
              <div>
                <label htmlFor="basePricePerHourPaise" className="block text-sm font-medium text-foreground mb-2">
                  Base Price (₹/hour) *
                </label>
                <input
                  id="basePricePerHourPaise"
                  name="basePricePerHourPaise"
                  type="number"
                  value={formData.basePricePerHourPaise}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="e.g. 3000 for ₹30/hour"
                  required
                />
              </div>
              {formData.pricingMode === "slab" && (
                <div className="md:col-span-2">
                  <label htmlFor="slabJson" className="block text-sm font-medium text-foreground mb-2">
                    Slab Configuration (JSON) *
                  </label>
                  <textarea
                    id="slabJson"
                    name="slabJson"
                    value={formData.slabJson}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground font-mono text-sm min-h-[80px]"
                    placeholder='[{"minMinutes":0,"maxMinutes":60,"pricePaise":2000},{"minMinutes":61,"maxMinutes":300,"pricePaise":5000}]'
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Define time-based pricing slabs in minutes.</p>
                </div>
              )}
            </div>
          </div>

          {/* Photos Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Photos</h2>
            <div>
              <label htmlFor="photos" className="block text-sm font-medium text-foreground mb-2">
                Photo URLs (comma-separated)
              </label>
              <input
                id="photos"
                name="photos"
                type="text"
                value={formData.photos}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
              />
              <p className="text-xs text-muted-foreground mt-1">Provide image URLs separated by commas.</p>
            </div>
          </div>

          {/* Availability Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Availability</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="totalSlots" className="block text-sm font-medium text-foreground mb-2">
                  Total Parking Slots *
                </label>
                <input
                  id="totalSlots"
                  name="totalSlots"
                  type="number"
                  min="1"
                  value={formData.totalSlots}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                  placeholder="5"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {error && (
                <div role="alert" aria-live="polite" className="text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div role="status" aria-live="polite" className="text-sm text-success">
                  Location submitted successfully. It is now awaiting admin approval.
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? "Submitting..." : "Submit Location"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};