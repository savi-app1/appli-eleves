import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/shell/logo";

export const metadata: Metadata = { title: "Hors ligne" };
export const dynamic = "force-static";

/** Page servie par le service worker quand le réseau est coupé. Aucune donnée personnelle, aucun appel réseau. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="size-14" />
      <WifiOff className="size-10 text-muted" />
      <h1 className="text-xl font-extrabold text-ink">Tu es hors ligne</h1>
      <p className="text-sm text-muted">
        SAVI a besoin d&apos;une connexion internet pour répondre à tes questions, lire tes documents et enregistrer ta progression.
        Vérifie tes données mobiles ou le Wi-Fi, puis réessaie.
      </p>
      <p className="text-xs text-muted">You are offline. Check your connection and try again.</p>
      <a href="/accueil" className="mt-2 inline-flex h-11 items-center justify-center rounded-[var(--radius-btn)] bg-green px-5 text-[15px] font-semibold text-white">
        Réessayer
      </a>
    </main>
  );
}
