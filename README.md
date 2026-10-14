# SAVI — Ton professeur intelligent

Plateforme éducative intelligente pour les élèves, étudiants et candidats aux examens
et concours d'Afrique de l'Ouest : tuteur IA, correction de devoirs, cours personnels,
quiz, examens blancs et suivi de progression.

> **État du projet : Étape 2 — maquettes interactives en cours de validation.**
> Les écrans sont construits dans la vraie application (Next.js) avec des **données d'exemple**.
> Plan complet : [`docs/01-audit-et-architecture.md`](docs/01-audit-et-architecture.md) ·
> Guide des écrans : [`docs/02-maquettes.md`](docs/02-maquettes.md).

## Pile technique

- **Next.js 16** (App Router, TypeScript, Turbopack) · **React 19** · **Tailwind CSS 4**
- **next-intl** : interface multilingue (français stable ; anglais, mooré, dioula, fulfuldé en bêta ; espagnol prévu)
- PWA installable (manifeste, icônes), thème clair/sombre, conception « mobile d'abord » (Android)
- À venir (étapes 3–5) : PostgreSQL + Drizzle ORM, authentification par sessions, stockage privé S3,
  fournisseur d'IA configurable (Anthropic par défaut), essai gratuit de 4 jours côté serveur, paiement mobile money.

## Démarrer en local

Prérequis : Node.js 22+ et npm 10+.

```bash
npm install
cp .env.example .env.local      # aucune variable obligatoire à ce stade
npm run dev                     # http://localhost:3000
```

Autres commandes :

```bash
npm run build && npm start      # version de production
npm run lint                    # ESLint
npm run typecheck               # TypeScript
npm run icons                   # régénère les icônes PWA depuis le SVG
```

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `src/app/` | Pages et mises en page (`(auth)` : bienvenue, connexion, inscription · `(app)` : écrans connectés) |
| `src/components/ui/` | Système de design SAVI (boutons, cartes, champs, badges, barres de progression…) |
| `src/components/shell/` | Coque applicative : barre haute, navigation basse, thème, bandeau d'essai |
| `src/components/screens/` | Écrans interactifs (tuteur, correction, cours, quiz, examen blanc, paramètres) |
| `src/i18n/` | Configuration des langues (statuts stable / bêta / prévue) et chargement des traductions |
| `messages/` | Fichiers de traduction (`fr.json` est la référence ; les autres retombent dessus) |
| `src/lib/` | Utilitaires et **données d'exemple** (`mock-data.ts`, `mock-tutor.ts`) — remplacées à l'étape 3 |
| `public/icons/` | Icônes PWA générées (`scripts/gen-icons.mjs`) |
| `docs/` | Audit, architecture, plan, guide des maquettes (puis déploiement, sauvegarde, sécurité) |
| `legacy/` | Archive intacte du premier prototype (lecture seule) |

## Principes non négociables

- Les clés API et secrets ne sont **jamais** dans le code ni dans le dépôt : uniquement dans les variables
  d'environnement du serveur (`.env.local` ignoré par Git ; `.env.example` documente les variables).
- Les contrôles d'accès, les quotas et le calcul de l'essai gratuit se font **côté serveur**.
- Les données de chaque utilisateur sont strictement cloisonnées.
- Aucun paiement n'est simulé en production ; l'accès Premium n'est activé qu'après confirmation fiable.
- Les langues nationales ne sont annoncées « prises en charge » qu'après validation par des locuteurs.

## Licence

Tous droits réservés — projet privé en cours de développement.
