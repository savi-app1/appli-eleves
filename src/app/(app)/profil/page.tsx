import { getFormatter, getTranslations } from "next-intl/server";
import { Bell, ChevronRight, CreditCard, Download, FileText, History, LifeBuoy, Languages, LogOut, Pencil, Shield, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ListGroup, ListItem, PageHeader } from "@/components/ui/page";
import { SectionLabel } from "@/components/ui/card";
import { requireUser } from "@/server/auth/current";
import { deleteAccountAction, logoutAction } from "@/server/auth/actions";
import { initials } from "@/lib/utils";
import { mockExamCatalogue } from "@/lib/mock-data";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ delete?: string }> }) {
  const { user, entitlement } = await requireUser();
  const { delete: del } = await searchParams;
  const t = await getTranslations("profile");
  const ta = await getTranslations("auth");
  const ts = await getTranslations("subscription");
  const tl = await getTranslations("languagesNames");
  const tset = await getTranslations("settings");
  const format = await getFormatter();
  const chevron = <ChevronRight className="size-4 text-muted" />;
  const countryName = mockExamCatalogue.countries.find((c) => c.code === user.country)?.name ?? user.country;
  const levelLabel = ta.has(`levels.${user.level}`) ? ta(`levels.${user.level}`) : user.level;

  const subscriptionSubtitle =
    entitlement.status === "premium" && entitlement.premiumUntil
      ? ts("renews", { date: format.dateTime(entitlement.premiumUntil, { day: "numeric", month: "long" }) })
      : ts("trialEnds", { date: format.dateTime(entitlement.trialEndsAt, { day: "numeric", month: "long" }) });
  const subscriptionBadge =
    entitlement.status === "premium" ? <Badge tone="green">{ts("activeTitle")}</Badge>
    : entitlement.status === "trial" ? <Badge tone="green">{ts("trialTitle")}</Badge>
    : <Badge tone="danger">{ts("expiredTitle")}</Badge>;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-green text-2xl font-extrabold text-white">{initials(user.firstName)}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-extrabold text-ink">{user.firstName}</div>
            <div className="text-sm text-muted">{levelLabel} · {countryName}</div>
            <div className="truncate text-xs text-muted">{user.email ?? user.phone}</div>
            <div className="text-xs text-muted">{t("memberSince", { date: format.dateTime(user.createdAt, { day: "numeric", month: "long", year: "numeric" }) })}</div>
          </div>
          <a href="/profil/parametres" aria-label={t("edit")} className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2"><Pencil className="size-4" /></a>
        </div>

        <section>
          <SectionLabel className="mb-2">{t("sections.account")}</SectionLabel>
          <ListGroup>
            <ListItem href="/abonnement" icon={<CreditCard className="size-5" />} title={t("items.subscription")} subtitle={subscriptionSubtitle} right={subscriptionBadge} />
            <ListItem href="/profil/historique" icon={<History className="size-5" />} title={t("items.history")} right={chevron} />
          </ListGroup>
        </section>

        <section>
          <SectionLabel className="mb-2">{t("sections.preferences")}</SectionLabel>
          <ListGroup>
            <ListItem
              href="/profil/parametres"
              icon={<Languages className="size-5" />}
              title={t("items.settings")}
              subtitle={`${tl(user.uiLocale)} · ${tset(`themes.${user.theme}`)}`}
              right={chevron}
            />
            <ListItem icon={<Bell className="size-5" />} title={t("items.notifications")} right={<Badge tone="gray">Bientôt</Badge>} />
          </ListGroup>
        </section>

        <section>
          <SectionLabel className="mb-2">{t("sections.data")}</SectionLabel>
          <ListGroup>
            <ListItem href="/confidentialite" icon={<Shield className="size-5" />} title={t("items.privacy")} right={chevron} />
            <ListItem href="/conditions" icon={<FileText className="size-5" />} title={t("items.terms")} right={chevron} />
            <ListItem icon={<Download className="size-5" />} title={t("items.export")} right={<Badge tone="gray">Bientôt</Badge>} />
            <ListItem href="/profil?delete=confirm" icon={<Trash2 className="size-5" />} title={t("items.deleteAccount")} subtitle={t("deleteWarning")} danger />
          </ListGroup>
          {del === "confirm" ? (
            <form action={deleteAccountAction} className="mt-3 space-y-3 rounded-[var(--radius-card)] border border-danger bg-danger-soft p-4">
              <p className="text-sm font-semibold text-danger">{t("deleteWarning")}</p>
              <p className="text-sm text-ink">{t("deleteTypeToConfirm")}</p>
              <Input name="confirm" placeholder="SUPPRIMER" autoComplete="off" required />
              <div className="flex gap-2">
                <a href="/profil" className="inline-flex h-11 flex-1 items-center justify-center rounded-[var(--radius-btn)] border border-line bg-surface text-[15px] font-semibold text-ink">{t("cancel")}</a>
                <Button type="submit" variant="danger" className="flex-1 bg-danger text-white hover:bg-danger">{t("items.deleteAccount")}</Button>
              </div>
            </form>
          ) : null}
        </section>

        <section>
          <SectionLabel className="mb-2">{t("sections.about")}</SectionLabel>
          <ListGroup>
            <ListItem icon={<LifeBuoy className="size-5" />} title={t("items.help")} right={chevron} />
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink"><LogOut className="size-5" /></span>
                <span className="text-[15px] font-medium text-ink">{t("items.logout")}</span>
              </button>
            </form>
          </ListGroup>
          <p className="mt-3 text-center text-xs text-muted">SAVI · {t("items.version")} 0.3.0</p>
        </section>
      </div>
    </>
  );
}
