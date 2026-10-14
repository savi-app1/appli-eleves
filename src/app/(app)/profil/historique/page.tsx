import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MessageCircleQuestion, Pin } from "lucide-react";
import { ListGroup, PageHeader } from "@/components/ui/page";
import { SectionLabel } from "@/components/ui/card";
import { mockConversations } from "@/lib/mock-data";

function Row({ c }: { c: (typeof mockConversations)[number] }) {
  return (
    <Link href="/tuteur" className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-soft text-green-ink"><MessageCircleQuestion className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold text-ink">{c.title}</span>
          {c.pinned ? <Pin className="size-3.5 shrink-0 text-green" /> : null}
        </span>
        <span className="block truncate text-xs text-muted">{c.preview}</span>
        <span className="block text-[11px] text-muted">{c.subject} · {c.updatedAt}</span>
      </span>
    </Link>
  );
}

export default async function HistoryPage() {
  const t = await getTranslations("profile");
  const pinned = mockConversations.filter((c) => c.pinned);
  const recent = mockConversations.filter((c) => !c.pinned);
  return (
    <>
      <PageHeader title={t("items.history")} back="/profil" />
      <div className="space-y-5">
        <section>
          <SectionLabel className="mb-2">{t("pinned")}</SectionLabel>
          <ListGroup>{pinned.map((c) => <Row key={c.id} c={c} />)}</ListGroup>
        </section>
        <section>
          <SectionLabel className="mb-2">{t("recent")}</SectionLabel>
          <ListGroup>{recent.map((c) => <Row key={c.id} c={c} />)}</ListGroup>
        </section>
      </div>
    </>
  );
}
