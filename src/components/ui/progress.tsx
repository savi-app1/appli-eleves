import { cn } from "@/lib/utils";

export function ProgressBar({ value, className, tone = "green", label }: { value: number; className?: string; tone?: "green" | "warning" | "danger"; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color = tone === "green" ? "bg-green" : tone === "warning" ? "bg-warning" : "bg-danger";
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-line", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function toneForScore(score: number): "green" | "warning" | "danger" {
  if (score >= 65) return "green";
  if (score >= 50) return "warning";
  return "danger";
}
