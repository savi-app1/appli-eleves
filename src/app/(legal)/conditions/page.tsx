import type { Metadata } from "next";
import { LegalDocView } from "@/components/screens/legal-doc";
import { terms } from "@/content/legal";

export const metadata: Metadata = { title: "Conditions d'utilisation — SAVI" };

export default function Page() {
  return <LegalDocView doc={terms} />;
}
