import type { Metadata } from "next";
import { LegalDocView } from "@/components/screens/legal-doc";
import { legalNotice } from "@/content/legal";

export const metadata: Metadata = { title: "Mentions légales — SAVI" };

export default function Page() {
  return <LegalDocView doc={legalNotice} />;
}
