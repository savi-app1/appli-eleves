import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, back, action, className }: { title: ReactNode; subtitle?: ReactNode; back?: string; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2">
        {back ? (
          <Link href={back} aria-label="Retour" className="-ml-2 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-2">
            <ArrowLeft className="size-5" />
          </Link>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-4 py-8 text-center">
      {icon ? <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-green-soft text-green-ink">{icon}</div> : null}
      <div className="text-[15px] font-semibold text-ink">{title}</div>
      {body ? <p className="mt-1 max-w-xs text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Banner({ tone = "info", children, className, action }: { tone?: "info" | "warning" | "danger" | "green"; children: ReactNode; className?: string; action?: ReactNode }) {
  const tones = {
    info: "bg-info-soft text-ink",
    warning: "bg-warning-soft text-ink",
    danger: "bg-danger-soft text-ink",
    green: "bg-green-soft text-green-ink",
  } as const;
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm", tones[tone], className)}>
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  );
}

export function ListItem({ href, icon, title, subtitle, right, onClick, danger }: { href?: string; icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; onClick?: () => void; danger?: boolean }) {
  const inner = (
    <>
      {icon ? <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", danger ? "bg-danger-soft text-danger" : "bg-surface-2 text-ink")}>{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] font-medium", danger ? "text-danger" : "text-ink")}>{title}</span>
        {subtitle ? <span className="block truncate text-xs text-muted">{subtitle}</span> : null}
      </span>
      {right}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors";
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface", className)}>{children}</div>;
}
