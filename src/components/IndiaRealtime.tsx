"use client";

import React from "react";

// A small live widget showing current India time (IST) and date
// Updates every second. Tailwind-only styling to match the design system.
export const IndiaRealtime: React.FC<{ className?: string }> = ({ className }) => {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Format in Asia/Kolkata timezone
  const time = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

  const date = now.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div
      className={[
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4",
        "flex items-center justify-between gap-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div>
        <div className="text-xs text-muted-foreground">India (IST)</div>
        <div className="text-2xl font-bold tracking-tight text-foreground">{time}</div>
        <div className="text-sm text-muted-foreground">{date}</div>
      </div>
      <div className="hidden sm:block text-right">
        <div className="text-xs text-muted-foreground">Timezone</div>
        <div className="text-sm font-semibold">Asia/Kolkata</div>
      </div>
    </div>
  );
};

export default IndiaRealtime;