import { cn } from "@/lib/utils";

/** Marque SAVI : carré vert arrondi + lettre S, déclinée en SVG inline (aucun téléchargement). */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#0E7C3A" />
      <path
        d="M41.5 22.5c-1.6-3.2-5-5-9.4-5-5.6 0-9.6 3-9.6 7.6 0 4.1 2.8 6.2 8.6 7.6l3.6.9c3.6.9 5 2 5 4 0 2.5-2.4 4.1-6 4.1-3.9 0-6.5-1.7-7.4-4.8"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="47" cy="17" r="4" fill="#9FE2B8" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark size={30} />
      <span className="text-xl font-extrabold tracking-tight text-green">SAVI</span>
    </span>
  );
}
