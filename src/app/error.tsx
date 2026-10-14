"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/** Erreur inattendue dans une page : message clair, bouton « Réessayer », aucun détail technique exposé. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page]", error.digest ?? error.message);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="size-10 text-warning" />
      <h1 className="text-xl font-extrabold text-ink">Une erreur est survenue</h1>
      <p className="text-sm text-muted">Ce n&apos;est pas de ta faute. Tes données sont en sécurité. Réessaie dans un instant.</p>
      {error.digest ? <p className="text-xs text-muted">Code : {error.digest}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={reset} className="inline-flex h-11 items-center justify-center rounded-[var(--radius-btn)] bg-green px-5 text-[15px] font-semibold text-white">
          Réessayer
        </button>
        <a href="/accueil" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-btn)] border border-line bg-surface px-5 text-[15px] font-semibold text-ink">
          Accueil
        </a>
      </div>
    </main>
  );
}
