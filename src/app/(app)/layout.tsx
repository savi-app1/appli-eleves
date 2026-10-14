import { getTranslations } from "next-intl/server";
import { BottomNav } from "@/components/shell/bottom-nav";
import { PreviewBanner } from "@/components/shell/preview-banner";
import { TopBar } from "@/components/shell/top-bar";
import { requireUser } from "@/server/auth/current";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const t = await getTranslations("nav");
  const ta = await getTranslations("app");
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <PreviewBanner text={ta("previewBanner")} />
      <TopBar />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-28">{children}</main>
      <BottomNav
        labels={{ home: t("home"), tutor: t("tutor"), courses: t("courses"), quiz: t("quiz"), profile: t("profile") }}
      />
    </div>
  );
}
