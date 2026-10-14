import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "./logo";
import { ThemeToggle } from "./theme";

export function TopBar({ right, title }: { right?: ReactNode; title?: ReactNode }) {
  return (
    <div className="pt-safe sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link href="/accueil" className="flex items-center gap-2" aria-label="SAVI — Accueil">
          <LogoMark size={30} />
          <span className="text-lg font-extrabold tracking-tight text-green">SAVI</span>
          {title ? <span className="ml-1 truncate text-sm text-muted">· {title}</span> : null}
        </Link>
        <div className="flex items-center gap-1">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
