# SAVI — Étape 1 : Audit, architecture et plan de réalisation

> Date : 14 octobre 2026 · Statut : **proposé, en attente de validation**
> Ce document est la référence technique du projet. Il sera mis à jour à chaque étape.

---

## 1. Audit de l'existant

### 1.1 Ce qui a réellement été examiné

Le dépôt GitHub `savi-app1/appli-eleves` (branche `main`, commit `1babb01`) contenait exactement **deux fichiers** :

| Fichier | Taille | Nature réelle |
|---|---|---|
| `index.html` | 8 Ko | Prototype statique v1 — 2 écrans (Accueil, Mes cours). |
| `README.md` | 14 Ko | **Ce n'était pas un README** mais une page HTML complète : prototype v2 — 7 écrans (Accueil, Chat, Quiz, Devoir, Cours, Progrès, Profil). |

Aucun autre fichier (pas de `package.json`, pas de backend, pas de base de données, pas de tests, pas de dossier de cours importés).

**Documents non reçus** : le cahier des charges PDF et l'image de concept mentionnés dans la mission n'ont pas été joints à la conversation. Je ne les ai donc pas analysés. Ils restent nécessaires pour valider les écrans (étape 2) et les règles métier détaillées.

### 1.2 Constat technique

Points positifs du prototype :
- Une direction visuelle déjà cohérente (vert `#0E7C3A`, cartes blanches, gris clair, navigation basse).
- Des textes en français adaptés aux élèves, avec un ton bienveillant.
- Une bonne intuition de l'écran d'accueil (4 actions principales + révision du jour + progression).
- Respect de l'accessibilité de base (`:focus-visible`, `role="status"`, `viewport-fit=cover`).

Limites bloquantes :
- Tout est dans **un seul fichier HTML**, sans framework, sans découpage, sans tests.
- Les données (cours, profil, score) sont dans `localStorage` : aucune synchronisation, aucune protection, perte à la réinstallation.
- **Aucun backend** : pas de comptes, pas de sécurité, pas de stockage de documents.
- Le « tuteur IA » copie un prompt dans le presse-papiers et ouvre claude.ai : ce n'est pas une intégration.
- La correction de devoirs et la progression affichent des **valeurs fixes** (16/20, 14,2 de moyenne…).
- Aucune internationalisation (textes codés en dur).
- Pas d'import PDF/photo réel.

### 1.3 Décision : **reconstruire**, en conservant l'identité visuelle et les textes

Le code existant représente moins d'une journée de travail et ne contient aucune fondation (modèle de données, API, sécurité) sur laquelle construire. Le réécrire proprement est plus rapide et plus sûr que de le « faire évoluer ».

Ce qui est conservé (détail dans `legacy/README.md`) :
- palette de couleurs, typographie système, rayons arrondis, cartes ;
- textes d'interface et ton ;
- structure de l'accueil et navigation à 5 onglets ;
- exemples pédagogiques (quiz de démonstration, gabarits « 5 exercices progressifs », « mini-examen »).

Les deux fichiers originaux ont été **archivés intacts** dans `legacy/` (déplacement avec conservation de l'historique Git) avant toute reconstruction.

### 1.4 Point d'attention immédiat : le dépôt est **public**

`gh repo view` indique `isPrivate: false`. Tant que l'application n'est pas lancée, je recommande de passer le dépôt en **privé** (Paramètres → Danger zone → Change visibility). Cela n'empêche aucun déploiement (Vercel, Railway, etc. se connectent aux dépôts privés). Dans tous les cas : aucun secret ne sera jamais commité ; seul `.env.example` (valeurs factices) sera versionné.

---

## 2. Architecture recommandée

### 2.1 Comparatif des approches

| Critère | **PWA (web installable)** | Flutter (app native multiplateforme) | React Native / Expo |
|---|---|---|---|
| Un seul code pour Android + tablette + ordinateur | ✅ oui | ⚠️ oui, mais le web Flutter est lourd | ⚠️ web limité |
| Mise à jour instantanée sans Play Store | ✅ | ❌ (validation + réinstallation) | ❌ |
| Installation sur l'écran d'accueil Android | ✅ (« Ajouter à l'écran d'accueil ») | ✅ (APK / Play Store) | ✅ |
| Caméra pour photographier un devoir | ✅ (`<input capture>` + API caméra) | ✅ natif | ✅ natif |
| Fonctionnement hors ligne | ⚠️ partiel (service worker, cache des cours) | ✅ complet | ✅ |
| Notifications push | ✅ sur Android Chrome | ✅ | ✅ |
| Publication sur Play Store | ✅ possible plus tard via TWA/Capacitor sans réécrire | ✅ | ✅ |
| Coût de développement et maintenance | **le plus faible** | élevé (2 bases de code : Dart + backend) | moyen |
| Poids au premier chargement sur 3G | ~200–400 Ko (optimisable) | APK 15–25 Mo à télécharger | APK 20–40 Mo |
| Testable immédiatement par vous depuis un lien | ✅ | ❌ (il faut compiler un APK) | ⚠️ |

**Recommandation : PWA d'abord.** C'est la solution la plus rapide à mettre entre les mains de vrais élèves, la moins chère à maintenir, et elle n'interdit pas une publication Play Store plus tard (enveloppe TWA ou Capacitor autour de la même application). Le backend construit ici servirait aussi, tel quel, à une éventuelle app Flutter future.

### 2.2 Pile technique retenue (et pourquoi)

| Couche | Choix | Justification |
|---|---|---|
| Application web + API | **Next.js 16 (App Router) + TypeScript + React 19** | Un seul projet pour l'interface et l'API serveur (« Route Handlers »). Rendu serveur = premier affichage rapide sur réseaux lents. Écosystème mature, hébergement simple. Les clés API restent **exclusivement côté serveur**. |
| Interface | **Tailwind CSS 4** + composants maison « mobile-first » | Design system SAVI (vert/blanc/noir/gris), thème clair/sombre, boutons ≥ 44 px, contraste AA. Pas de bibliothèque lourde. |
| Base de données | **PostgreSQL** via **Drizzle ORM** | Relationnel, fiable, recherche plein texte en français intégrée (`tsvector`), extension `pgvector` disponible pour la recherche sémantique plus tard. Drizzle = TypeScript pur, sans binaire à télécharger, migrations SQL lisibles. |
| Base locale / tests | **PGlite** (PostgreSQL compilé en WebAssembly) | Vrai PostgreSQL 18 exécuté dans Node sans serveur à installer : développement et tests reproductibles, **vérifié fonctionnel dans l'environnement actuel** (recherche plein texte française testée). Même schéma Drizzle en production sur un vrai Postgres. |
| Authentification | Sessions serveur (cookie `httpOnly`, `Secure`, `SameSite=Lax`), mots de passe hachés avec **scrypt** (module `crypto` natif de Node, paramètres OWASP) | Pas de dépendance tierce opaque, contrôle total, révocation immédiate des sessions. Identifiant = e-mail **ou numéro de téléphone** (fréquent en Afrique de l'Ouest). Vérification par e-mail/SMS activable quand un fournisseur sera configuré. |
| Fournisseur d'IA | **Vercel AI SDK** avec adaptateurs **Anthropic, OpenAI, Google Gemini, Mistral** choisis par variable d'environnement `AI_PROVIDER` | Changement de fournisseur sans toucher au code. Réponses en streaming (l'élève voit le texte arriver, important sur réseau lent). Sorties structurées (quiz, corrections notées) validées par schéma `zod`. Un **mode `mock`** déterministe permet de développer et tester sans clé API. |
| OCR | 1) **Modèle multimodal** (l'image du devoir est envoyée directement au modèle : meilleur résultat sur l'écriture manuscrite) ; 2) **Tesseract.js** en option gratuite pour les documents imprimés ; 3) `pdf-parse` pour les PDF avec texte | Qualité maximale là où ça compte (devoirs manuscrits), coût minimal ailleurs. Le texte extrait est **toujours montré à l'élève pour confirmation** avant analyse. |
| Stockage des documents | Interface `StorageProvider` : **système de fichiers** en local, **S3 compatible** (Cloudflare R2 recommandé) en production | Documents privés, jamais exposés publiquement : téléchargement via URL signée courte ou proxy authentifié. R2 : 10 Go gratuits, pas de frais de sortie. |
| Internationalisation | **next-intl** ; fichiers `messages/fr.json`, `en.json`, `mos.json` (mooré), `dyu.json` (dioula), `ff.json` (fulfuldé), `es.json` | Langue d'interface, langue de la question et langue de réponse de l'IA = **trois réglages distincts**. Chaque langue a un statut (`stable` / `bêta` / `prévue`) affiché honnêtement dans les paramètres. |
| Paiements | Interface `PaymentProvider` + page d'abonnement configurable + point d'entrée webhook avec **vérification de signature** | Aucun prestataire codé en dur, aucun lien inventé. Candidats à étudier pour le Burkina Faso : Ligdicash, CinetPay, PayDunya, FedaPay (Orange Money, Moov Money, Wave, cartes). |
| Tests | **Vitest** (unitaires + intégration avec PGlite) ; **Playwright** (parcours complets, exécuté en CI) | Tests rapides et réalistes (vraie base Postgres en mémoire). |
| CI/CD | **GitHub Actions** : lint, typage, tests sur chaque PR ; déploiement automatique de prévisualisation | Qualité garantie avant fusion ; URL de test par branche. |
| Hébergement | Voir § 3 — **Option A** Vercel + Neon + R2 (géré), **Option B** VPS + Docker Compose (autonome). Le code est préparé pour les deux. | |

### 2.3 Vue d'ensemble

```
 Téléphone Android / tablette / PC
 ┌───────────────────────────────────────┐
 │  SAVI (PWA : React, installable,      │
 │  cache hors ligne du « squelette »)   │
 └───────────────┬───────────────────────┘
                 │ HTTPS (cookies de session, JSON, streaming)
 ┌───────────────▼───────────────────────┐
 │  Serveur Next.js                      │
 │  • pages (rendu serveur)              │
 │  • API /api/* (contrôles d'accès,     │
 │    quotas, validation des fichiers)   │
 │  • modules métier : tuteur, documents,│
 │    correction, quiz, examens,         │
 │    progression, abonnements           │
 └───┬──────────┬──────────┬─────────────┘
     │          │          │
 ┌───▼───┐  ┌───▼────┐  ┌──▼───────────────┐
 │Postgres│  │Stockage│  │Fournisseur d'IA   │
 │(Neon / │  │privé   │  │(Claude / GPT /    │
 │ VPS)   │  │(R2/S3) │  │ Gemini / Mistral) │
 └────────┘  └────────┘  └──────────────────┘
                              ▲
              Webhook signé   │   Paiement mobile money
          ┌───────────────────┴──────────┐
          │ Prestataire de paiement      │
          └──────────────────────────────┘
```

Les modules métier sont écrits dans `src/server/<module>/` **sans dépendre de Next.js**, pour pouvoir être extraits dans un service séparé si le trafic l'exige un jour.

### 2.4 Organisation prévue du dépôt

```
appli-eleves/
├─ src/
│  ├─ app/                 # pages et API (Next.js App Router)
│  │  ├─ (auth)/           # connexion, inscription, mot de passe oublié
│  │  ├─ (app)/            # écrans connectés : accueil, tuteur, cours, quiz, examens, progrès, profil
│  │  ├─ admin/            # tableau de bord admin (accès restreint, sans lecture des conversations)
│  │  └─ api/              # route handlers (REST + streaming)
│  ├─ components/          # design system SAVI + composants d'écran
│  ├─ server/              # logique métier indépendante du framework
│  │  ├─ auth/  ai/  documents/  tutor/  grading/  quiz/  exams/  progress/  billing/  storage/
│  ├─ db/                  # schéma Drizzle, migrations, seed
│  ├─ i18n/                # configuration des langues
│  └─ lib/                 # utilitaires partagés (validation, erreurs, quotas)
├─ messages/               # fr.json, en.json, mos.json, dyu.json, ff.json, es.json
├─ content/exams/          # catalogue examens/concours (JSON versionné, avec source et date de vérification)
├─ tests/                  # unitaires, intégration, e2e
├─ docs/                   # architecture, déploiement, sauvegarde, sécurité, juridique
├─ legacy/                 # archive de la v1 (lecture seule)
├─ .github/workflows/      # CI
├─ .env.example
└─ README.md
```

### 2.5 Modèle de données (principales tables)

- `users` (identité, classe/niveau, pays, langues préférées, thème, rôle, consentement, date de naissance facultative pour les règles « mineurs »)
- `sessions` (jeton haché, expiration, appareil)
- `subscriptions` (`trial` / `active` / `expired` / `cancelled`, `trial_ends_at`, `current_period_end`, origine du paiement)
- `payments` (référence prestataire, montant, devise, statut, charge utile du webhook vérifiée)
- `conversations`, `messages` (tuteur IA ; épinglage ; langue de la question et de la réponse)
- `documents`, `document_chunks` (texte extrait, index plein texte français, embeddings optionnels), `subjects`, `chapters`
- `submissions` (devoirs à corriger : fichier, texte extrait, analyse, note indicative si barème)
- `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_answers`
- `exams`, `exam_papers`, `exam_attempts` (avec `source`, `verified_at`, `country`, `level`)
- `goals`, `progress_snapshots` (par matière)
- `usage_counters` (quotas journaliers par utilisateur : questions, corrections, Mo importés)
- `audit_log` (actions sensibles : connexion, suppression, paiement — jamais le contenu des conversations)

Toutes les tables de données personnelles portent `user_id` ; **chaque requête serveur filtre par l'utilisateur de la session**, jamais par un identifiant fourni par le client.

### 2.6 Sécurité et confidentialité (règles d'implémentation)

- Contrôles d'accès côté serveur systématiques ; aucun secret dans le code client.
- Mots de passe : scrypt (N = 2¹⁷, r = 8, p = 1), sel aléatoire, comparaison en temps constant.
- Sessions : jeton aléatoire 256 bits, stocké **haché** en base, expiration glissante 30 jours, révocation à la déconnexion et au changement de mot de passe.
- Protection CSRF : cookies `SameSite=Lax` + vérification de l'en-tête `Origin` sur les mutations.
- En-têtes de sécurité : CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Fichiers importés : types autorisés (PDF, JPEG, PNG, WebP), taille max (10 Mo, configurable), vérification de la **signature binaire** (pas seulement l'extension), noms de fichiers régénérés, images recompressées côté client avant envoi (économie de données).
- Limitation des abus : quotas journaliers par utilisateur et par IP (questions IA, corrections, imports), plafond de tokens par requête, coupe-circuit global de dépense IA.
- Données minimales : pas de collecte inutile ; date de naissance facultative (uniquement pour adapter l'expérience des mineurs) ; aucune publicité ; pas de partage à des tiers.
- Administrateurs : statistiques agrégées et gestion des comptes/abonnements, **sans accès au contenu des conversations et documents** (accès technique uniquement sur demande de l'utilisateur, journalisé).
- Suppression de compte en libre-service : effacement des données personnelles, documents et conversations ; conservation anonymisée des seules statistiques d'usage et des écritures comptables obligatoires.
- Journalisation d'audit des actions sensibles ; sauvegardes chiffrées.
- Pages « Politique de confidentialité » et « Conditions d'utilisation » (brouillons fournis, **à faire valider juridiquement** ; le Burkina Faso dispose d'une loi sur la protection des données personnelles, supervisée par la CIL).

### 2.7 Abonnements et essai gratuit

- À l'inscription, le serveur crée `subscriptions(status='trial', trial_ends_at = now() + 4 jours)` ; la durée est une constante serveur (`TRIAL_DAYS=4`), jamais calculée par le client.
- Un intergiciel calcule à chaque requête l'« entitlement » : `trial_active` | `premium_active` | `expired`. La date de fin d'essai est affichée en clair dans l'application (bandeau + page Abonnement).
- À l'expiration : les fonctions premium (tuteur IA, correction, génération de quiz/résumés, examens blancs) sont bloquées côté **serveur** (HTTP 402) ; la consultation des cours importés, de l'historique, du profil et de la page d'abonnement reste accessible.
- Tarifs dans une configuration (`PRICING_MONTHLY_XOF=1000`, `PRICING_YEARLY_XOF=10000`) marqués « à confirmer » tant que vous ne les validez pas.
- Activation premium **uniquement** après confirmation fiable : webhook signé ou API de statut du prestataire. Un mode `manual` (validation par un administrateur après contrôle du paiement) est prévu comme solution de repli transparente, jamais comme simulation.
- Si vous ne disposez que d'un simple lien de paiement (sans API ni webhook), la confirmation automatique est impossible ; les options seront : (a) demander au prestataire l'activation des notifications/IPN ; (b) utiliser son API de vérification de transaction si elle existe ; (c) validation manuelle via l'espace admin avec saisie de la référence de transaction par l'élève. Je vous présenterai ces options avant de choisir.

### 2.8 Langues

- Interface : fichiers de traduction par langue ; le français est complet au lancement ; l'anglais sera fourni ; mooré, dioula et fulfuldé seront livrés avec un statut **« bêta — en cours de validation »** et des fichiers partiellement remplis à relire par des locuteurs natifs. L'espagnol est prévu (structure prête, non traduit).
- Question de l'élève : détection automatique de la langue + possibilité de forcer.
- Réponse de l'IA : réglage distinct (« réponds-moi en … ») ; pour les langues nationales, l'application affiche un avertissement de qualité et propose une version française en parallèle, car les modèles actuels sont peu fiables dans ces langues.

---

## 3. Hébergement et coûts prévisibles

> Montants indicatifs en USD/EUR au 14/10/2026, à revérifier au moment de la souscription. Taux approximatif : 1 USD ≈ 600 FCFA.

### Option A — Services gérés (recommandée pour démarrer)

| Service | Rôle | Gratuit | Payant (quand) |
|---|---|---|---|
| Vercel | hébergement Next.js, HTTPS, prévisualisations | plan Hobby gratuit **mais réservé aux usages non commerciaux** | Pro **20 $/mois** dès que des abonnements sont vendus |
| Neon | PostgreSQL géré, sauvegardes/restauration à un instant donné | 0,5 Go, suffisant pour les tests et les premiers centaines d'utilisateurs | ~19 $/mois (plan Launch) |
| Cloudflare R2 | stockage privé des PDF/photos | 10 Go, aucun frais de sortie | ~0,015 $/Go/mois au-delà |
| Resend (ou équivalent) | e-mails (vérification, réinitialisation) | 3 000 e-mails/mois | ~20 $/mois au-delà |
| Nom de domaine | ex. `savi-app.com` | — | ~12 $/an (un `.bf` coûte davantage, via un bureau d'enregistrement agréé) |
| Sentry | suivi des erreurs | quota gratuit | optionnel |

**Phase pilote (tests, < 300 élèves) : ≈ 0 à 20 $/mois + IA. Lancement commercial : ≈ 40–60 $/mois + IA.**

### Option B — Serveur privé virtuel (VPS) + Docker Compose

| Élément | Coût |
|---|---|
| VPS Hetzner CX22 (2 vCPU, 4 Go) ou équivalent | ~4–7 €/mois |
| Postgres + MinIO (S3) + Caddy (HTTPS auto) sur le même serveur | inclus |
| Sauvegardes externalisées (R2/B2) | ~1 €/mois |

Moins cher et sans restriction commerciale, mais **vous** gérez les mises à jour système, la surveillance et les restaurations. Un `docker-compose.yml` et un guide seront fournis pour cette option quel que soit le choix initial.

### Coût de l'IA (le poste variable)

Estimation par interaction (≈ 1 500 tokens d'entrée, 500 de sortie) :

| Modèle | Coût par réponse | Pour 30 questions/mois/élève |
|---|---|---|
| Gemini 2.5 Flash | ≈ 0,0017 $ (≈ 1 FCFA) | ≈ 30 FCFA |
| Claude Haiku 4.5 | ≈ 0,004 $ (≈ 2,5 FCFA) | ≈ 75 FCFA |
| GPT-4o mini | ≈ 0,0005 $ (< 1 FCFA) | ≈ 10 FCFA |
| Claude Sonnet 4.5 / GPT-4o (qualité supérieure) | ≈ 0,012 $ (≈ 7 FCFA) | ≈ 220 FCFA |

Une correction de devoir avec photo coûte environ 2 à 3 fois une question texte. Avec un abonnement à 1 000 FCFA/mois, un modèle « rapide » (Flash/Haiku/mini) laisse une marge confortable ; les quotas journaliers protègent contre les usages extrêmes. L'application permettra d'utiliser un modèle économique par défaut et un modèle plus puissant pour les tâches difficiles (correction, mode strict).

### Autres coûts éventuels

- Compte développeur Google Play (si publication en boutique plus tard) : 25 $ une fois.
- SMS de vérification (Africa's Talking, Twilio, Orange SMS API) : ~20–40 FCFA par SMS → c'est pourquoi la vérification par e-mail est privilégiée au départ.
- Commission du prestataire de paiement mobile money : généralement 2 à 4 % par transaction.

---

## 4. Limites techniques et risques (en toute transparence)

1. **Pas d'appel réel à une IA depuis mon environnement de travail** : je n'ai accès qu'à GitHub, npm et PyPI. Je développe avec un fournisseur `mock` déterministe ; les vrais fournisseurs seront testés dès qu'une clé API sera configurée sur votre hébergement (ou si vous m'en fournissez une via les variables d'environnement du déploiement, jamais dans le code).
2. **Pas d'émulateur Android ici** : je teste en fenêtre mobile ; vous testerez sur de vrais téléphones via l'URL de prévisualisation. C'est aussi pour cela que le choix PWA est précieux.
3. **Paiement** : aucune confirmation automatique n'est possible sans API/webhook du prestataire. Rien ne sera activé automatiquement tant que vous n'aurez pas fourni ces informations.
4. **Langues nationales** : les modèles d'IA sont faibles en mooré, dioula et fulfuldé. Elles seront annoncées « bêta » et devront être validées par des locuteurs avant toute communication.
5. **OCR manuscrit** : bon mais imparfait ; l'élève doit pouvoir corriger le texte reconnu.
6. **Examens et concours** : je ne dispose pas d'annales officielles. Le module sera livré avec une **structure de catalogue** (pays, examen, matière, niveau, source, date de vérification) et quelques sujets d'exemple clairement marqués « exemple ». Les vrais contenus devront être fournis ou collectés avec leurs sources.
7. **Réseaux faibles** : optimisations prévues (rendu serveur, streaming, compression des images avant envoi, cache du squelette de l'application), mais une connexion est nécessaire pour l'IA.
8. **Vercel Hobby** interdit l'usage commercial : passer en Pro (ou en VPS) avant de vendre des abonnements.
9. **Juridique** : les brouillons de CGU et de politique de confidentialité ne remplacent pas un avis juridique.

---

## 5. Plan de réalisation

| Étape | Livrables concrets | Ce dont j'ai besoin de vous |
|---|---|---|
| **1. Audit et planification** (ce document) | Archive `legacy/`, ce document, README corrigé | Validation de l'architecture ; PDF + image ; réponses aux questions du § 6 |
| **2. Maquettes** | Les écrans essentiels construits **directement dans la vraie application** (données d'exemple), consultables sur votre téléphone via une URL de prévisualisation : connexion/inscription, accueil, tuteur, correction, mes cours, quiz, examens, progression, profil/paramètres, abonnement. Thèmes clair/sombre. | Vos retours avant de développer les fonctions |
| **3. Fondations** | Projet Next.js + Drizzle + PGlite/Postgres, authentification, sessions, quotas, validation des fichiers, stockage, en-têtes de sécurité, `.env.example`, CI GitHub Actions, structure i18n | Décision hébergement (peut attendre) |
| **4. MVP éducatif** | Tuteur IA (streaming, adaptation au niveau, « explique autrement », exercices), Mes cours (import PDF/images, extraction, recherche, résumés/quiz, **mode strict** avec sources et signalement des manques), correction de devoirs (photo → texte confirmé → analyse → note indicative si barème), quiz (QCM/VF/réponses courtes, correction expliquée, score, historique), historique et épinglage, squelette du module examens, progression de base | Fournisseur d'IA + clé (pour les tests réels) |
| **5. Abonnements** | Essai 4 jours côté serveur, blocage premium, page Abonnement, page de paiement configurable, webhook avec vérification de signature, activation manuelle admin de repli | Prestataire de paiement + identifiants de test |
| **6. Tests** | Tests unitaires/intégration (Vitest + PGlite), parcours e2e (Playwright en CI), tests de sécurité (cloisonnement des données, fichiers malveillants, quotas), vérification mobile et réseau lent | Vos tests sur téléphones réels |
| **7. Préproduction** | Déploiement de test (Vercel + Neon + R2 ou VPS), guide de déploiement, de sauvegarde et de restauration | Comptes d'hébergement créés **par vous** (vous restez propriétaire) |
| **8. Lancement** | Configuration de production, domaine, surveillance, transfert des accès, documentation complète, pages légales finalisées | Votre accord explicite |

Chaque étape se termine par un point de validation avec vous. Le code est poussé en continu sur la branche de travail ; rien n'est publié publiquement sans votre accord.

---

## 6. Informations et autorisations nécessaires

À fournir dès que possible :

1. **Le cahier des charges PDF** et **l'image de concept** (à joindre à la conversation).
2. **Visibilité du dépôt** : accord pour le passer en privé (ou vous le faites vous-même).
3. **Fournisseur d'IA** préféré pour les premiers tests (Anthropic Claude, OpenAI, Google Gemini ou Mistral) — la clé sera à placer uniquement dans les variables d'environnement de l'hébergement.
4. **Choix d'hébergement** : Option A (services gérés) ou Option B (VPS). Peut être décidé à l'étape 7.

À fournir plus tard (pas bloquant pour les étapes 2 à 4) :

5. Prestataire de paiement retenu et accès à sa documentation/ses identifiants de test.
6. Nom de domaine souhaité.
7. Liste des pays, examens et concours à couvrir en priorité (ex. BEPC, Baccalauréat, concours de la fonction publique, ENAM…), et sources de sujets autorisées.
8. Nom de l'entité (personne ou structure) responsable du traitement des données, pour les CGU et la politique de confidentialité.
9. Contacts de locuteurs natifs pour relire les traductions en mooré, dioula et fulfuldé.
