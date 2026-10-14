import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page";
import { CoursesScreen } from "@/components/screens/courses";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { listDocuments, listSubjects } from "@/server/documents/service";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CoursesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { user } = await requireUser();
  const db = await getDb();
  const t = await getTranslations("courses");
  const [docs, subjects] = await Promise.all([listDocuments(db, user.id), listSubjects(db, user.id)]);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <CoursesScreen
        docs={docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }))}
        error={one(sp.erreur) || null}
        openImport={one(sp.importer) === "1"}
      />
    </>
  );
}
