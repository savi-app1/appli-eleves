# Étape 3 — Fondations : base de données, authentification, sécurité

Date : 14 octobre 2026 · Statut : **livré, à valider**

Cette étape transforme les maquettes en application réelle : les comptes, les sessions, l'essai gratuit
et les préférences sont désormais stockés en base et contrôlés côté serveur. Les écrans « métier »
(tuteur, cours, quiz, examens, progression) affichent encore des données d'exemple : ils sont câblés à
l'étape 4.

## 1. Ce qui fonctionne réellement

| Fonction | Détail |
|---|---|
| Inscription | prénom, e-mail **ou** numéro de téléphone (format national accepté, normalisé en international, ex. `70 00 00 00` → `+22670000000`), mot de passe ≥ 8 caractères, classe, pays, consentement obligatoire |
| Essai gratuit | **4 jours calculés côté serveur** à l'inscription (`TRIAL_DAYS`), date de fin affichée sur l'accueil, le profil et la page Abonnement |
| Connexion | e-mail/téléphone insensible à la casse et aux espaces ; temps de réponse constant que le compte existe ou non |
| Sessions | cookie `savi_session` httpOnly + Secure + SameSite=Lax, 30 jours glissants, jeton aléatoire dont seul le haché SHA-256 est en base ; déconnexion révoque la session |
| Protection des pages | toutes les pages de l'application redirigent vers `/connexion` sans session valide (proxy + vérification serveur dans le layout) |
| Préférences | langue de l'interface, langue des questions, langue des réponses, « aussi en français », thème : persistées en base et appliquées à la connexion suivante |
| Suppression de compte | Profil → Supprimer mon compte → saisir `SUPPRIMER` : suppression définitive (utilisateur, sessions, abonnement, conversations, documents, résultats) en cascade |
| Limitation d'abus | 10 tentatives de connexion / 15 min par (IP + identifiant), 5 inscriptions / heure par IP, compteurs en base (fonctionne même avec plusieurs serveurs) |
| Journal de sécurité | `audit_log` : action, utilisateur, métadonnées non sensibles (jamais de contenu de conversation, jamais d'IP en clair) |
| Textes juridiques | `/conditions`, `/confidentialite`, `/mentions-legales` — **brouillons** à compléter par l'entité responsable (zones `[à compléter]`) |

Sans JavaScript, les formulaires fonctionnent quand même (amélioration progressive) : utile sur les
téléphones lents ou les réseaux instables.

## 2. Architecture technique

```
src/
├── db/                 schéma Drizzle (18 tables), client (PostgreSQL ou PGlite), migrateur
├── server/
│   ├── auth/           mot de passe (scrypt), identifiant, sessions, comptes, actions serveur
│   ├── billing/        calcul des droits (essai / premium / expiré), tarifs
│   ├── security/       limitation de débit, journal d'audit
│   └── storage/        stockage des fichiers (local maintenant, S3/R2 en production)
├── proxy.ts            redirections optimistes + en-tête CSP (mode rapport)
└── app/                pages (Next.js App Router)
drizzle/                migrations SQL générées (versionnées)
tests/                  Vitest : unitaires + intégration sur PostgreSQL en mémoire
```

### Base de données
* **PostgreSQL** partout. En développement et dans les tests, **PGlite** (PostgreSQL compilé en WebAssembly) tourne dans le processus Node : aucune installation, données dans `./.data/pglite` (ignoré par Git). En préproduction/production : `DATABASE_URL` vers un vrai PostgreSQL (Neon, Supabase, VPS…).
* Schéma géré par **Drizzle ORM** ; migrations SQL générées par `npm run db:generate`, appliquées par `npm run db:migrate` (automatique en PGlite).
* Tables : `users`, `sessions`, `subscriptions`, `payments`, `rate_limits`, `usage_counters`, `audit_log`, `subjects`, `conversations`, `messages`, `documents`, `document_chunks` (recherche plein texte français intégrée), `submissions`, `quizzes`, `quiz_attempts`, `goals`, `exam_papers`, `exam_attempts`.
* Toutes les tables de données personnelles portent `user_id` avec `ON DELETE CASCADE` : la suppression de compte est complète par construction.

### Authentification « maison » plutôt qu'un service externe
Choix assumé : Clerk/Auth0 coûtent 25 à 100 $/mois au-delà de quelques milliers d'utilisateurs, imposent l'e-mail (nos élèves ont souvent un simple numéro), et stockent les données hors de notre contrôle. Le code d'authentification fait ~400 lignes, est couvert par des tests et suit les recommandations OWASP (scrypt, jetons opaques hachés, cookies httpOnly, temps constant). La réinitialisation de mot de passe est préparée mais s'activera quand un service d'e-mail/SMS sera choisi (coût ≈ 0 pour l'e-mail, ~10–20 FCFA/SMS).

### Droits d'accès (essai / premium)
`computeEntitlement()` est **la seule** source de vérité : essai actif tant que `now < trial_ends_at`, premium tant que `current_period_end > now` avec un abonnement `active`, sinon **expiré**. Un compte sans ligne d'abonnement n'a aucun accès premium. Les futures routes IA appelleront `requirePremium()` qui renvoie une erreur 402 proprement gérée.

## 3. Sécurité — état des lieux

| Mesure | État |
|---|---|
| Clés d'API côté serveur uniquement | ✅ aucune variable `NEXT_PUBLIC_` sensible ; `server-only` sur le client de base |
| Cloisonnement par utilisateur | ✅ toutes les requêtes filtrent par `user_id` (test d'isolation inclus) |
| Mots de passe | ✅ scrypt N=2¹⁷, sel 16 octets, comparaison en temps constant |
| Sessions | ✅ jetons 256 bits, haché en base, expiration glissante, purge |
| CSRF | ✅ actions serveur Next.js (vérification d'origine) + SameSite=Lax |
| Limitation de débit | ✅ login, inscription ; API IA à l'étape 4 |
| En-têtes HTTP | ✅ HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options ; CSP en mode rapport (passage en mode bloquant après vérification navigateur à l'étape 6) |
| Validation des fichiers | ✅ type autorisé + signature binaire + taille (prêt pour l'étape 4) |
| Données minimales | ✅ pas de nom complet, d'adresse, de date de naissance ; IP jamais stockée en clair |
| Accès administrateur | ✅ aucun rôle admin n'existe encore ; quand il arrivera, il n'aura pas d'accès libre aux conversations (journalisé) |
| Mineurs | ✅ mention d'accord parental < 15 ans à l'inscription ; textes juridiques dédiés |
| Sauvegarde | ⏳ documentée à l'étape 7 selon l'hébergeur retenu |

## 4. Commandes

```bash
npm install
npm run dev          # http://localhost:3000 — base PGlite créée automatiquement
npm test             # 30 tests (unitaires + intégration sur PostgreSQL en mémoire)
npm run lint && npm run typecheck && npm run build
npm run db:generate  # après modification de src/db/schema.ts
npm run db:migrate   # applique les migrations (DATABASE_URL ou PGlite)
```

Intégration continue : `.github/workflows/ci.yml` exécute lint, types, tests et build à chaque
`push`/pull request.

## 5. Vérifications effectuées sur la préversion

Parcours complet exécuté sans navigateur (formulaires en amélioration progressive) :
inscription → accueil personnalisé avec date de fin d'essai → profil → abonnement → déconnexion →
doublon refusé → mot de passe court refusé → inscription par téléphone national → connexion avec
e-mail en majuscules → paramètres → suppression du compte avec confirmation → connexion impossible
ensuite → blocage après 10 tentatives de connexion échouées.

## 6. Ce qui reste volontairement en attente

* **Réinitialisation du mot de passe** : nécessite un fournisseur d'e-mail ou de SMS (à choisir).
* **Textes juridiques** : brouillons structurés ; l'identité de l'éditeur, le contact et le droit applicable sont à fournir.
* **Stockage objet (S3/R2)** et **sauvegardes** : configurés à l'étape 7 avec l'hébergeur.
* **Vérification de l'e-mail / du téléphone** : non bloquante pour le MVP ; sera ajoutée avec le fournisseur d'envoi.
