# SAVI — Ton professeur intelligent

Plateforme éducative intelligente pour les élèves, étudiants et candidats aux examens
et concours d'Afrique de l'Ouest : tuteur IA, correction de devoirs, cours personnels,
quiz, examens blancs et suivi de progression.

> **État du projet : Étapes 1 à 7 livrées — prêt pour les tests de validation avant ouverture (étape 8).** Tuteur IA en flux, mode strict sur les documents
> de l'élève (avec sources citées et signalement de ce qui manque), import et lecture de cours (PDF, photos),
> fiches et exercices générés, quiz corrigés côté serveur, correction de devoirs en deux temps (texte lu →
> vérification → analyse), examens blancs chronométrés, progression et objectifs, historique épinglable.
> Sans clé d'IA configurée, l'application tourne en **mode démonstration** (IA simulée, signalée à l'écran) ;
> le branchement d'un vrai modèle se fait par variables d'environnement, côté serveur uniquement.
> Plan : [`docs/01-audit-et-architecture.md`](docs/01-audit-et-architecture.md) ·
> Écrans : [`docs/02-maquettes.md`](docs/02-maquettes.md) ·
> Fondations : [`docs/03-fondations.md`](docs/03-fondations.md) ·
> MVP pédagogique : [`docs/04-mvp-pedagogique.md`](docs/04-mvp-pedagogique.md) ·
> Abonnement et paiement : [`docs/05-abonnements-paiement.md`](docs/05-abonnements-paiement.md) ·
> Tests et sécurité : [`docs/06-tests-et-securite.md`](docs/06-tests-et-securite.md) ·
> Déploiement et sauvegardes : [`docs/07-deploiement.md`](docs/07-deploiement.md).

## Pile technique

- **Next.js 16** (App Router, TypeScript, Turbopack) · **React 19** · **Tailwind CSS 4**
- **next-intl** : interface multilingue (français stable ; anglais, mooré, dioula, fulfuldé en bêta ; espagnol prévu)
- PWA installable (manifeste, icônes), thème clair/sombre, conception « mobile d'abord » (Android)
- **PostgreSQL + Drizzle ORM** (PGlite embarqué en développement et dans les tests : rien à installer)
- Authentification par sessions serveur (e-mail **ou** téléphone, scrypt, cookies httpOnly), essai gratuit de
  4 jours calculé côté serveur, limitation des abus, journal d'audit sans données sensibles
- **Vercel AI SDK** avec fournisseur configurable (`AI_PROVIDER` : Anthropic par défaut, OpenAI-compatible, ou `mock`
  pour la démonstration) ; lecture des PDF avec **unpdf**, des photos par le modèle de vision ou **Tesseract.js** en local
- Recherche plein texte PostgreSQL insensible aux accents (`unaccent`) pour les documents de l'élève et le mode strict
- **Vitest** (unitaires + intégration sur PostgreSQL en mémoire), CI GitHub Actions
- Abonnement : essai de 4 jours côté serveur, prestataire de paiement configurable (lien + confirmation manuelle,
  webhook signé, bac à sable hors production) — le prestataire mobile money réel reste à brancher
- Sécurité : CSP avec nonce appliquée en production, contrôle d'origine des API, limitation de débit en base,
  journal d'audit sans contenu personnel, cloisonnement strict par utilisateur (voir `docs/06-tests-et-securite.md`)

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
npm test                        # tests Vitest (66 tests unitaires + intégration, PostgreSQL en mémoire, IA simulée)
npm run build && npm run test:e2e   # parcours de bout en bout (19 tests HTTP contre le serveur construit)
npm run lint                    # ESLint
npm run typecheck               # TypeScript
npm run db:generate             # génère une migration après modification de src/db/schema.ts
npm run db:migrate              # applique les migrations (DATABASE_URL ou PGlite)
npm run icons                   # régénère les icônes PWA depuis le SVG
npm run ocr:setup               # télécharge les données Tesseract (fra, eng) pour lire les photos sans clé d'IA
```

Pour brancher un vrai modèle d'IA : renseigner `AI_PROVIDER=anthropic` et `ANTHROPIC_API_KEY=…` dans `.env.local`
(jamais dans le code). Sans clé, l'application reste utilisable en mode démonstration.

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `src/app/` | Pages et mises en page (`(auth)` : bienvenue, connexion, inscription · `(app)` : écrans connectés · `(legal)` : textes juridiques) |
| `src/db/` | Schéma Drizzle, client PostgreSQL/PGlite, migrateur · migrations SQL dans `drizzle/` |
| `src/server/` | Logique serveur par module : `auth/`, `billing/`, `security/`, `storage/`, `ai/` (fournisseur, invites, garde-fous, IA simulée), `tutor/`, `documents/`, `quiz/`, `grading/`, `progress/`, `learning/actions.ts` (actions serveur des écrans) |
| `src/app/api/` | Routes HTTP : `tuteur` (flux), `documents` (import, recherche, fichier), `corrections` (import, fichier) |
| `src/proxy.ts` | Redirections d'accès et en-tête CSP |
| `tests/` | Tests Vitest (unitaires et intégration) |
| `src/components/ui/` | Système de design SAVI (boutons, cartes, champs, badges, barres de progression…) |
| `src/components/shell/` | Coque applicative : barre haute, navigation basse, thème, bandeau d'essai |
| `src/components/screens/` | Écrans interactifs (tuteur, correction, cours, quiz, examen blanc, paramètres) |
| `src/i18n/` | Configuration des langues (statuts stable / bêta / prévue) et chargement des traductions |
| `messages/` | Fichiers de traduction (`fr.json` est la référence ; les autres retombent dessus) |
| `src/lib/` | Utilitaires et catalogue des examens (`exam-catalogue.ts`) |
| `public/icons/` | Icônes PWA générées (`scripts/gen-icons.mjs`) |
| `docs/` | Audit et architecture, maquettes, fondations, MVP pédagogique, abonnement/paiement, tests et sécurité, déploiement et sauvegardes |
| `Dockerfile`, `docker-compose.yml` | Déploiement sur VPS (PostgreSQL + application), voir `docs/07-deploiement.md` |
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
