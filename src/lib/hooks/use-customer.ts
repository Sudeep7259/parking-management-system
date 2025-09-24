"use client";

import { useState, useEffect } from "react";

export type CustomerProduct = {
  id: string;
  name?: string;
  status?: string;
};

export type CustomerData = {
  id?: string;
  email?: string;
  name?: string;
  products?: CustomerProduct[];
  features?: Record<string, any>;
} | null;

export type CheckArgs = { featureId: string; requiredBalance?: number };
export type TrackArgs = { featureId: string; value: number; idempotencyKey?: string };
export type CheckoutArgs = { productId?: string; successUrl?: string; cancelUrl?: string };

export function useCustomer() {
  const [customer, setCustomer] = useState<CustomerData>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // lightweight placeholder; replace with real implementation when payments is wired
    setIsLoading(true);
    // simulate fetch
    const t = setTimeout(() => {
      setCustomer({
        id: undefined,
        products: [],
        features: {},
      });
      setIsLoading(false);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const check = async (_args: CheckArgs) => {
    // allow by default in stub
    return true;
  };

  const track = async (_args: TrackArgs) => {
    // no-op in stub
  };

  const checkout = async (_args: CheckoutArgs) => {
    return { url: undefined };
  };

  const refetch = async () => {
    // no-op for now
  };

  return { customer, check, track, checkout, refetch, isLoading } as const;
}