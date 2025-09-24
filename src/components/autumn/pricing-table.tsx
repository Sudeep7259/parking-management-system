import Link from "next/link";

export type PricingProduct = {
  id: string;
  name: string;
  description?: string;
  price: number | string; // e.g. 0 or "₹499"
  period?: "/month" | "/year" | string;
  features?: string[];
  ctaLabel?: string;
  popular?: boolean;
};

export const PricingTable = ({ products }: { products: PricingProduct[] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((p) => (
        <div
          key={p.id}
          className={`relative rounded-xl border border-border bg-card text-card-foreground p-6 flex flex-col ${
            p.popular ? "ring-2 ring-primary" : ""
          }`}
        >
          {p.popular && (
            <span className="absolute -top-2 right-4 rounded-md bg-primary/20 text-primary text-xs px-2 py-0.5">
              Most popular
            </span>
          )}
          <div className="mb-4">
            <h3 className="text-xl font-semibold">{p.name}</h3>
            {p.description ? (
              <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
            ) : null}
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">
                {typeof p.price === "number" ? `₹${p.price}` : p.price}
              </span>
              {p.period ? (
                <span className="text-muted-foreground">{p.period}</span>
              ) : null}
            </div>
          </div>

          {p.features?.length ? (
            <ul className="space-y-2 mb-6 text-sm">
              {p.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                  <span className="text-on-surface">{f}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mb-6" />
          )}

          <div className="mt-auto">
            <Link
              href={p.id === "free" ? "/register" : "/register"}
              className={`inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                p.id === "free"
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {p.ctaLabel || (p.id === "free" ? "Get started" : "Upgrade")}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PricingTable;