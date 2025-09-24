import type { PricingProduct } from "@/components/autumn/pricing-table";

// Basic product definitions used by /pricing page and any upgrade CTAs
export const products: PricingProduct[] = [
  {
    id: "free",
    name: "Free",
    description: "Great to explore and get started",
    price: 0,
    period: "/month",
    features: [
      "Book up to 2 reservations/month",
      "1 parking listing",
      "Email support",
    ],
    ctaLabel: "Get started",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For frequent drivers and owners",
    price: 499,
    period: "/month",
    features: [
      "Unlimited reservations",
      "Unlimited listings",
      "Priority support",
    ],
    popular: true,
    ctaLabel: "Upgrade to Pro",
  },
  {
    id: "business",
    name: "Business",
    description: "Teams and complexes with multiple locations",
    price: 1499,
    period: "/month",
    features: [
      "Everything in Pro",
      "Multi-user management",
      "Advanced reports",
    ],
    ctaLabel: "Contact sales",
  },
];