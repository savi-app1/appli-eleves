import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpenCheck, Camera, ChevronRight, Flame, FolderOpen, ListChecks, MessageCircleQuestion, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { TrialBanner } from "@/components/shell/trial-banner";
import { mockConversations, mockProgress, mockSubjects, mockUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tiles = [
  { key: "ask", href: "/tuteur", Icon: MessageCircleQuestion, style: "bg-green text-white", iconStyle: "bg-white/15 text-white" },
  { key: "grade", href: "/correction", Icon: Camera, style: "bg-black text-white", iconStyle: "bg-white/15 text-white" },
  { key: "quiz", href: "/quiz", Icon: ListChecks, style: "bg-green-soft text-green-ink", iconStyle: "bg-green text-white" },
  { key: "courses", href: "/cours", Icon: FolderOpen, style: "bg-surface text-ink border border-line", iconStyle: "bg-surface-2 text-ink" },
] as const;

export default async function HomePage() {
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const session = mockProgress.revisionSessions[0];

  return (
    <div className="space-y-5">
      <TrialBanner />

      <section>
        <h1 className="text-2xl font-extrabold text-ink">{t("greeting", { name: mockUser.firstName })}</h1>
        <p className="mt-0.5 text-[15px] text-muted">{t("prompt")}</p>
      </section>

      <section className="grid grid-cols-2 gap-3" aria-label="Actions principales">
        {tiles.map(({ key, href, Icon, style, iconStyle }) => (
          <Link
            key={key}
            href={href}
            className={cn("flex min-h-[124px] flex-col justify-between rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]", style)}
          >
            <span className={cn("flex size-10 items-center justify-center rounded-xl", iconStyle)}>
              <Icon className="size-5" />
            </span>
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
        <CardTitle action={<Badge tone="green"><Flame className="size-3.5" /> {t("streak", { count: mockUser.streakDays })}</Badge>}>
          {t("todayRevision")}
        </CardTitle>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-ink">{session.title}</div>
            <div className="text-xs text-muted">{session.subject} · {tc("minutes", { count: session.minutes })} · {session.why}</div>
          </div>
          <ButtonLink href="/quiz/jouer" size="sm" className="shrink-0">{t("todayRevisionCta")}</ButtonLink>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>{t("weeklyGoal")}</span>
          <span className="font-semibold text-ink">{t("weeklyGoalProgress", { done: mockUser.weeklyGoal.done, total: mockUser.weeklyGoal.total })}</span>
        </div>
        <ProgressBar className="mt-1.5" value={(mockUser.weeklyGoal.done / mockUser.weeklyGoal.total) * 100} />
      </Card>

      <Card>
        <CardTitle action={<Link href="/progression" className="text-sm font-semibold text-green">{tc("seeAll")}</Link>}>
          {t("tiles.progress.title")}
        </CardTitle>
        <ul className="space-y-3">
          {mockSubjects.slice(0, 3).map((s) => (
            <li key={s.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{s.emoji} {s.name}</span>
                <span className="font-bold text-ink">{s.score} %</span>
              </div>
              <ProgressBar value={s.score} tone={s.score >= 65 ? "green" : s.score >= 50 ? "warning" : "danger"} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-0">
        <div className="px-4 pt-4"><CardTitle action={<Link href="/profil/historique" className="text-sm font-semibold text-green">{tc("seeAll")}</Link>}>{t("recentChats")}</CardTitle></div>
        <ul className="divide-y divide-line">
          {mockConversations.slice(0, 2).map((c) => (
            <li key={c.id}>
              <Link href="/tuteur" className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-soft text-green-ink"><MessageCircleQuestion className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{c.title}</span>
                  <span className="block truncate text-xs text-muted">{c.subject} · {c.updatedAt}</span>
                </span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
