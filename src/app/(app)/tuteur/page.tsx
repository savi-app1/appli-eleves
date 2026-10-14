import { getTranslations } from "next-intl/server";
import { TutorChat } from "@/components/screens/tutor-chat";
import { requireUser } from "@/server/auth/current";

export default async function TutorPage() {
  const { user } = await requireUser();
  const ta = await getTranslations("auth");
  const level = ta.has(`levels.${user.level}`) ? ta(`levels.${user.level}`) : user.level;
  return <TutorChat user={{ firstName: user.firstName, level }} />;
}
