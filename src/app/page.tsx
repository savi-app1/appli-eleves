import { redirect } from "next/navigation";

/** Point d'entrée : en attendant l'authentification réelle (étape 3), on présente l'accueil de bienvenue. */
export default function RootPage() {
  redirect("/bienvenue");
}
