import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/shell/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Wordmark />
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-green">
          <ArrowLeft className="size-4" /> SAVI
        </Link>
      </header>
      <article className="prose-savi rounded-[var(--radius-card)] border border-line bg-surface p-5 text-[15px] leading-relaxed text-ink">{children}</article>
    </div>
  );
}
