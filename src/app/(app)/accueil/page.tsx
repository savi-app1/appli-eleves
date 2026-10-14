import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AlertTriangle, BookOpenCheck, Camera, ChevronRight, Flame, FolderOpen, ListChecks, MessageCircleQuestion, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { ProgressBar, toneForScore } from "@/components/ui/progress";
import { SubmitButton } from "@/components/ui/submit-button";
import { TrialBanner } from "@/components/shell/trial-banner";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { aiMode } from "@/server/ai/provider";
import { getProgress } from "@/server/progress/service";
import { listConversations } from "@/server/tutor/service";
import { generateQuizAction } from "@/server/learning/actions";
import { cn } from "@/lib/utils";

const tiles = [
  { key: "ask", href: "/tuteur", Icon: MessageCircleQuestion, style: "bg-green text-white", iconStyle: "bg-white/15 text-white" },
  { key: "grade", href: "/correction", Icon: Camera, style: "bg-black text-white", iconStyle: "bg-white/15 text-white" },
  { key: "quiz", href: "/quiz", Icon: ListChecks, style: "bg-green-soft text-green-ink", iconStyle: "bg-green text-white" },
  { key: "courses", href: "/cours", Icon: FolderOpen, style: "bg-surface text-ink border border-line", iconStyle: "bg-surface-2 text-ink" },
] as const;

export default async function HomePage() {
  const { user, entitlement } = await requireUser();
  const db = await getDb();
  const t = await getTranslations("home");
  const tp = await getTranslations("progress");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const [progress, conversations] = await Promise.all([getProgress(db, user.id), listConversations(db, user.id, 3)]);
  const weak = progress.difficulties[0];
  const session = weak
    ? { subject: weak.subject, topic: weak.topic, why: tp("sessionWhy.weak", { percent: weak.percent }) }
    : progress.stats.quizzes === 0
      ? { subject: "Mathématiques", topic: "Théorème de Pythagore", why: tp("sessionWhy.new") }
      : null;

  return (
    <div className="space-y-5">
      <TrialBanner entitlement={entitlement} />
      {aiMode() === "demo" ? (
        <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-2 text-xs text-ink"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {t("demoBanner")}</p>
      ) : null}

      <section>
        <h1 className="text-2xl font-extrabold text-ink">{t("greeting", { name: user.firstName })}</h1>
        <p className="mt-0.5 text-[15px] text-muted">{t("prompt")}</p>
      </section>

      <section className="grid grid-cols-2 gap-3" aria-label="Actions principales">
        {tiles.map(({ key, href, Icon, style, iconStyle }) => (
          <Link key={key} href={href} className={cn("flex min-h-[124px] flex-col justify-between rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]", style)}>
            <span className={cn("flex size-10 items-center justify-center rounded-xl", iconStyle)}><Icon className="size-5" /></span>
            <span>
              <span className="block text-[15px] font-bold leading-tight">{t(`tiles.${key}.title`)}</span>
              <span className="mt-0.5 block text-xs opacity-80">{t(`tiles.${key}.subtitle`)}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/examens" className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)]">
          <span className="flex size-10 items-center justify-center rounded-xl bg-green-soft text-green-ink"><BookOpenCheck className="size-5" /></span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-ink">{t("tiles.exams.title")}</span>
            <span className="block truncate text-xs text-muted">{t("tiles.exams.subtitle")}</span>
          </span>
        </Link>
        <Link href="/progression" className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)]">
          <span className="flex size-10 items-center justify-center rounded-xl bg-green-soft text-green-ink"><TrendingUp className="size-5" /></span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-ink">{t("tiles.progress.title")}</span>
            <span className="block truncate text-xs text-muted">{t("tiles.progress.subtitle")}</span>
          </span>
        </Link>
      </section>

      <Card>
        <CardTitle action={<Badge tone="green"><Flame className="size-3.5" /> {t("streak", { count: progress.streakDays })}</Badge>}>{t("todayRevision")}</CardTitle>
        {session ? (
          <form action={generateQuizAction} className="flex items-center justify-between gap-3">
            <input type="hidden" name="subject" value={session.subject} />
            <input type="hidden" name="topic" value={session.topic} />
            <input type="hidden" name="count" value="5" />
            <input type="hidden" name="source" value="revision" />
            <input type="hidden" name="back" value="/accueil" />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-ink">{session.topic}</div>
              <div className="text-xs text-muted">{session.subject} · {tc("minutes", { count: 10 })} · {session.why}</div>
            </div>
            <SubmitButton size="sm" className="shrink-0" pendingLabel={tc("generating")}><Sparkles className="size-4" /> {t("todayRevisionCta")}</SubmitButton>
          </form>
        ) : (
          <p className="text-sm text-muted">{t("revisionFallback")}</p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>{t("weeklyGoal")}</span>
          <span className="font-semibold text-ink">{t("weeklyGoalProgress", { done: progress.weeklyGoal.done, total: progress.weeklyGoal.total })}</span>
        </div>
        <ProgressBar className="mt-1.5" value={Math.min(100, (progress.weeklyGoal.done / progress.weeklyGoal.total) * 100)} />
      </Card>

      <Card>
        <CardTitle action={<Link href="/progression" className="text-sm font-semibold text-green">{tc("seeAll")}</Link>}>{t("tiles.progress.title")}</CardTitle>
        {progress.bySubject.length === 0 ? (
          <p className="text-sm text-muted">{t("noProgress")}</p>
        ) : (
          <ul className="space-y-3">
            {progress.bySubject.slice(0, 3).map((s) => (
              <li key={s.subject}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{s.subject}</span>
                  <span className="font-bold text-ink">{s.percent} %</span>
                </div>
                <ProgressBar value={s.percent} tone={toneForScore(s.percent)} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-0">
        <div className="px-4 pt-4"><CardTitle action={<Link href="/profil/historique" className="text-sm font-semibold text-green">{tc("seeAll")}</Link>}>{t("recentChats")}</CardTitle></div>
        {conversations.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted">{t("noChats")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link href={`/tuteur?c=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-soft text-green-ink"><MessageCircleQuestion className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5"><span className="truncate text-sm font-semibold text-ink">{c.title}</span>{c.strictMode ? <ShieldCheck className="size-3.5 shrink-0 text-green" /> : null}</span>
                    <span className="block truncate text-xs text-muted">{format.dateTime(c.updatedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
