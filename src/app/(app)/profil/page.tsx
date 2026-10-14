import { getFormatter, getTranslations } from "next-intl/server";
import { Bell, ChevronRight, CreditCard, Download, FileText, History, LifeBuoy, Languages, LogOut, Pencil, Shield, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ListGroup, ListItem, PageHeader } from "@/components/ui/page";
import { SectionLabel } from "@/components/ui/card";
import { mockSubscription, mockUser } from "@/lib/mock-data";
import { initials } from "@/lib/utils";

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const ta = await getTranslations("auth");
  const ts = await getTranslations("subscription");
  const format = await getFormatter();
  const chevron = <ChevronRight className="size-4 text-muted" />;
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-green text-2xl font-extrabold text-white">{initials(mockUser.firstName)}</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-ink">{mockUser.firstName}</div>
            <div className="text-sm text-muted">{ta(`levels.${mockUser.levelKey}`)} · Burkina Faso</div>
            <div className="text-xs text-muted">{t("memberSince", { date: format.dateTime(mockUser.createdAt, { day: "numeric", month: "long", year: "numeric" }) })}</div>
          </div>
          <button type="button" aria-label={t("edit")} className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2"><Pencil className="size-4" /></button>
        </div>

        <section>
          <SectionLabel className="mb-2">{t("sections.account")}</SectionLabel>
          <ListGroup>
            <ListItem
              href="/abonnement"
              icon={<CreditCard className="size-5" />}
              title={t("items.subscription")}
              subtitle={ts("trialEnds", { date: format.dateTime(mockSubscription.trialEndsAt, { day: "numeric", month: "long" }) })}
              right={<Badge tone="green">{ts("trialTitle")}</Badge>}
            />
            <ListItem href="/profil/historique" icon={<History className="size-5" />} title={t("items.history")} right={chevron} />
          </ListGroup>
        </section>

        <section>
          <SectionLabel className="mb-2">{t("sections.preferences")}</SectionLabel>
          <ListGroup>
            <ListItem href="/profil/parametres" icon={<Languages className="size-5" />} title={t("items.settings")} subtitle="Français · Thème automatique" right={chevron} />
            <ListItem icon={<Bell className="size-5" />} title={t("items.notifications")} right={<Badge tone="gray">Bientôt</Badge>} />
          </ListGroup>
        </section>

        <section>
          <SectionLabel className="mb-2">{t("sections.data")}</SectionLabel>
          <ListGroup>
            <ListItem icon={<Shield className="size-5" />} title={t("items.privacy")} right={chevron} />
            <ListItem icon={<FileText className="size-5" />} title={t("items.terms")} right={chevron} />
            <ListItem icon={<Download className="size-5" />} title={t("items.export")} right={chevron} />
            <ListItem icon={<Trash2 className="size-5" />} title={t("items.deleteAccount")} subtitle={t("deleteWarning")} danger />
          </ListGroup>
        </section>

        <section>
          <SectionLabel className="mb-2">{t("sections.about")}</SectionLabel>
          <ListGroup>
            <ListItem icon={<LifeBuoy className="size-5" />} title={t("items.help")} right={chevron} />
            <ListItem href="/bienvenue" icon={<LogOut className="size-5" />} title={t("items.logout")} />
          </ListGroup>
          <p className="mt-3 text-center text-xs text-muted">SAVI · {t("items.version")} 0.2.0 (maquette)</p>
        </section>
      </div>
    </>
  );
}
