import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <SearchX className="size-10 text-muted" />
      <h1 className="text-xl font-extrabold text-ink">Page introuvable</h1>
      <p className="text-sm text-muted">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
      <Link href="/accueil" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-btn)] bg-green px-5 text-[15px] font-semibold text-white">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
