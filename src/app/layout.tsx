import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { THEME_INIT_SCRIPT } from "@/components/shell/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SAVI — Ton professeur intelligent", template: "%s · SAVI" },
  description:
    "Tuteur IA, correction de devoirs, cours personnels, quiz et examens blancs pour les élèves et candidats d'Afrique de l'Ouest.",
  applicationName: "SAVI",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SAVI", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0E7C3A" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1412" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
