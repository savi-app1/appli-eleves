import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { MessageCircleQuestion, Pin, PinOff, ShieldCheck, Trash2 } from "lucide-react";
import { EmptyState, ListGroup, PageHeader } from "@/components/ui/page";
import { SectionLabel } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { listConversations } from "@/server/tutor/service";
import { deleteConversationAction, pinFormAction } from "@/server/learning/actions";

type Conv = Awaited<ReturnType<typeof listConversations>>[number];

export default async function HistoryPage() {
  const { user } = await requireUser();
  const db = await getDb();
  const t = await getTranslations("profile");
  const tt = await getTranslations("tutor");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const convs = await listConversations(db, user.id, 100);
  const pinned = convs.filter((c) => c.pinned);
  const recent = convs.filter((c) => !c.pinned);

  function Row({ c }: { c: Conv }) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface-2">
        <Link href={`/tuteur?c=${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-soft text-green-ink"><MessageCircleQuestion className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold text-ink">{c.title}</span>
              {c.pinned ? <Pin className="size-3.5 shrink-0 text-green" /> : null}
              {c.strictMode ? <ShieldCheck className="size-3.5 shrink-0 text-green" aria-label={t("strictTag")} /> : null}
            </span>
            <span className="block truncate text-xs text-muted">{c.preview ?? ""}</span>
            <span className="block text-[11px] text-muted">
              {t("messages", { count: c.messageCount })} · {format.dateTime(c.updatedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
        </Link>
        <form action={pinFormAction}>
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="pinned" value={c.pinned ? "0" : "1"} />
          <button type="submit" aria-label={c.pinned ? tt("actions.unpin") : tt("actions.pin")} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-green-soft hover:text-green-ink">
            {c.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          </button>
        </form>
        <form action={deleteConversationAction}>
          <input type="hidden" name="id" value={c.id} />
          <ConfirmSubmit message={tc("confirmDelete")} aria-label={t("deleteConversation")} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 className="size-4" />
          </ConfirmSubmit>
        </form>
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t("items.history")} back="/profil" />
      <div className="space-y-5">
        {convs.length === 0 ? (
          <EmptyState icon={<MessageCircleQuestion className="size-6" />} title={t("noHistory")} action={<Link href="/tuteur" className="rounded-full bg-green px-4 py-2 text-sm font-bold text-white">{tt("newChat")}</Link>} />
        ) : null}
        {pinned.length > 0 ? (
          <section>
            <SectionLabel className="mb-2">{t("pinned")}</SectionLabel>
            <ListGroup>{pinned.map((c) => <Row key={c.id} c={c} />)}</ListGroup>
          </section>
        ) : convs.length > 0 ? (
          <p className="text-xs text-muted">{t("pinnedEmpty")}</p>
        ) : null}
        {recent.length > 0 ? (
          <section>
            <SectionLabel className="mb-2">{t("recent")}</SectionLabel>
            <ListGroup>{recent.map((c) => <Row key={c.id} c={c} />)}</ListGroup>
          </section>
        ) : null}
      </div>
    </>
  );
}
