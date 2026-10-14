# SAVI — Ton professeur intelligent

Plateforme éducative intelligente pour les élèves, étudiants et candidats aux examens
et concours d'Afrique de l'Ouest : tuteur IA, correction de devoirs, cours personnels,
quiz, examens blancs et suivi de progression.

> **État du projet : Étape 3 — fondations livrées (base de données, comptes, sessions, essai gratuit, sécurité).**
> Inscription, connexion, préférences, essai de 4 jours et suppression de compte sont réels ; les écrans
> tuteur / cours / quiz / examens affichent encore des **données d'exemple** jusqu'à l'étape 4.
> Plan : [`docs/01-audit-et-architecture.md`](docs/01-audit-et-architecture.md) ·
> Écrans : [`docs/02-maquettes.md`](docs/02-maquettes.md) ·
> Fondations : [`docs/03-fondations.md`](docs/03-fondations.md).

## Pile technique

- **Next.js 16** (App Router, TypeScript, Turbopack) · **React 19** · **Tailwind CSS 4**
- **next-intl** : interface multilingue (français stable ; anglais, mooré, dioula, fulfuldé en bêta ; espagnol prévu)
- PWA installable (manifeste, icônes), thème clair/sombre, conception « mobile d'abord » (Android)
- **PostgreSQL + Drizzle ORM** (PGlite embarqué en développement et dans les tests : rien à installer)
- Authentification par sessions serveur (e-mail **ou** téléphone, scrypt, cookies httpOnly), essai gratuit de
  4 jours calculé côté serveur, limitation des abus, journal d'audit sans données sensibles
- **Vitest** (unitaires + intégration sur PostgreSQL en mémoire), CI GitHub Actions
- À venir (étapes 4–5) : fournisseur d'IA configurable (Anthropic par défaut), stockage privé S3/R2, paiement mobile money.

## Démarrer en local

Prérequis : Node.js 22+ et npm 10+.

```bash
npm install
cp .env.example .env.local      # aucune variable obligatoire en développement
npm run dev                     # http://localhost:3000 — la base PGlite est créée dans ./.data
```

Créer ensuite un compte depuis `/inscription` (e-mail ou numéro de téléphone, mot de passe ≥ 8 caractères).

Autres commandes :

```bash
npm run build && npm start      # version de production
npm test                        # tests Vitest (30 tests, PostgreSQL en mémoire)
npm run lint                    # ESLint
npm run typecheck               # TypeScript
npm run db:generate             # génère une migration après modification de src/db/schema.ts
npm run db:migrate              # applique les migrations (DATABASE_URL ou PGlite)
npm run icons                   # régénère les icônes PWA depuis le SVG
```

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `src/app/` | Pages et mises en page (`(auth)` : bienvenue, connexion, inscription · `(app)` : écrans connectés · `(legal)` : textes juridiques) |
| `src/db/` | Schéma Drizzle, client PostgreSQL/PGlite, migrateur · migrations SQL dans `drizzle/` |
| `src/server/` | Logique serveur par module : `auth/`, `billing/`, `security/`, `storage/` |
| `src/proxy.ts` | Redirections d'accès et en-tête CSP |
| `tests/` | Tests Vitest (unitaires et intégration) |
| `src/components/ui/` | Système de design SAVI (boutons, cartes, champs, badges, barres de progression…) |
| `src/components/shell/` | Coque applicative : barre haute, navigation basse, thème, bandeau d'essai |
| `src/components/screens/` | Écrans interactifs (tuteur, correction, cours, quiz, examen blanc, paramètres) |
| `src/i18n/` | Configuration des langues (statuts stable / bêta / prévue) et chargement des traductions |
| `messages/` | Fichiers de traduction (`fr.json` est la référence ; les autres retombent dessus) |
| `src/lib/` | Utilitaires et **données d'exemple** (`mock-data.ts`, `mock-tutor.ts`) encore utilisées par les écrans métier — remplacées à l'étape 4 |
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
