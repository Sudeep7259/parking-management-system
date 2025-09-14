"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ReportsProps = {
  className?: string;
  style?: React.CSSProperties;
};

export default function Reports({ className, style }: ReportsProps) {
  return (
    <section className={cn("w-full max-w-full p-4", className)} style={style} aria-label="Reports placeholder">
      <h2 className="text-xl font-semibold">Reports</h2>
      <p className="text-sm text-muted-foreground">This section will show reports and analytics.</p>
    </section>
  );
}