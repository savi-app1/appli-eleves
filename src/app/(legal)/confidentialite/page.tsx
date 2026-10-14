import type { Metadata } from "next";
import { LegalDocView } from "@/components/screens/legal-doc";
import { privacy } from "@/content/legal";

export const metadata: Metadata = { title: "Politique de confidentialité — SAVI" };

export default function Page() {
  return <LegalDocView doc={privacy} />;
}
