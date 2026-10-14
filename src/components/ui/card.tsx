import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, children, action }: { className?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[15px] font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-xs font-semibold uppercase tracking-wide text-muted", className)}>{children}</div>;
}
