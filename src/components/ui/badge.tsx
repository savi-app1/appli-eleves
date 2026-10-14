import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "gray" | "warning" | "danger" | "info" | "black";

const tones: Record<Tone, string> = {
  green: "bg-green-soft text-green-ink",
  gray: "bg-surface-2 text-muted",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-ink",
  black: "bg-black text-white",
};

export function Badge({ className, tone = "gray", ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5", tones[tone], className)}
      {...props}
    />
  );
}
