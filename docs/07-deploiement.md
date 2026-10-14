# Étape 7 — Préproduction, déploiement, sauvegardes

## 1. Où en est l'URL de préproduction

- **En ligne** : le site Netlify relié au dépôt GitHub (`cosmic-otter-c3fd6b`) construit automatiquement chaque
  commit — voir la section 8 (option C). La branche `main` donne l'URL de préproduction stable
  `https://cosmic-otter-c3fd6b.netlify.app` (renommable dans Netlify → *Site configuration* → *Change site name*),
  chaque pull request a son *Deploy Preview*. Environnement clairement étiqueté « préproduction » : IA simulée
  (`AI_PROVIDER=mock`), paiement en bac à sable (`PAYMENT_PROVIDER=sandbox`, `APP_ENV=preview`).
- **Passage en production réelle** : il suffit d'ajouter dans Netlify (*Site configuration* → *Environment variables*)
  ce qui ne doit jamais être dans le dépôt : `PAYMENT_PROVIDER=webhook` + `PAYMENT_WEBHOOK_SECRET` + `PAYMENT_LINK`
  (prestataire de paiement), `ADMIN_IDENTIFIERS` (adresses réelles de l'équipe), `APP_ENV=production`, éventuellement
  une clé `ANTHROPIC_API_KEY` propre (sinon la passerelle IA Netlify est utilisée), puis de relancer un déploiement
  (*Deploys* → *Trigger deploy*). Les variables définies dans l'interface Netlify priment sur le préréglage.
- **Vérification automatique** : à chaque push, le flux GitHub Actions « Vérification du déploiement » attend la fin du
  déploiement Netlify, interroge `/api/sante` puis rejoue le parcours complet sur le site réel (comptes de test créés
  puis supprimés) ; le rapport est publié comme *check* sur le commit.
- Les options A (Vercel + Neon + R2) et B (VPS Docker) restent disponibles si l'équipe préfère un autre hébergeur.

## 2. Option A — Vercel + Neon + Cloudflare R2 (recommandée pour démarrer)

Pourquoi : zéro serveur à administrer, déploiement automatique à chaque `git push`, prévisualisation par branche,
HTTPS et domaine inclus, niveau gratuit suffisant pour un pilote (puis ~20 $/mois Vercel Pro + 19 $/mois Neon Launch
si l'usage grandit). Limite : les fonctions serveur ont un temps maximal (60 s par défaut sur Pro, 10 s en gratuit) —
la lecture OCR locale d'une grosse photo peut dépasser 10 s : prévoir soit le niveau Pro, soit un vrai modèle de vision
(`AI_PROVIDER=anthropic`, plus rapide et plus fiable que Tesseract).

1. **Base de données** : créer un projet Neon (région Europe de l'Ouest, la plus proche), copier `DATABASE_URL`
   (avec `?sslmode=require`). Les migrations créent l'extension `unaccent` (autorisée sur Neon, Supabase, RDS).
2. **Stockage** : créer un bucket R2 **privé** `savi-documents`, un jeton API « Object Read & Write » limité à ce bucket ;
   noter `S3_ENDPOINT` (https://<id-compte>.r2.cloudflarestorage.com), clé et secret.
3. **Vercel** : « Import Git Repository » → `savi-app1/appli-eleves` → Framework Next.js détecté. Variables
   d'environnement (onglet Settings → Environment Variables), pour *Preview* puis *Production* :

   | Variable | Préproduction | Production |
   |---|---|---|
   | `APP_ENV` | `preview` | `production` |
   | `NEXT_PUBLIC_APP_URL` | URL Vercel de prévisualisation | `https://<domaine>` |
   | `DATABASE_URL` | branche Neon `preview` | branche Neon `main` |
   | `STORAGE_PROVIDER` + `S3_*` | bucket `savi-documents-preprod` | bucket `savi-documents` |
   | `AI_PROVIDER`, `ANTHROPIC_API_KEY` | `mock` ou clé de test | `anthropic` + clé |
   | `PAYMENT_PROVIDER`, `PAYMENT_*` | `sandbox` | `link` ou `webhook` + secrets (jamais `sandbox`) |
   | `ADMIN_IDENTIFIERS` | e-mails de l'équipe | e-mails de l'équipe |
   | `TRIAL_DAYS`, `PRICING_*` | valeurs de test | `4`, `1000`, `10000`, `PRICING_CONFIRMED=1` |
   | `NEXT_TELEMETRY_DISABLED` | `1` | `1` |

4. **Migrations** : commande de build Vercel = `node scripts/migrate.mjs && next build` (ou lancer
   `DATABASE_URL=… node scripts/migrate.mjs` depuis un poste avant chaque mise en production).
5. **Branches** : `main` → production ; toute autre branche → URL de prévisualisation automatique. La CI GitHub doit
   être verte (lint, types, 66 tests, build, 19 tests de bout en bout) avant de fusionner dans `main`.
6. **Domaine** : ajouter le domaine dans Vercel, créer l'enregistrement DNS indiqué ; HTTPS automatique.

## 3. Option B — VPS (Hetzner, OVH, Contabo…) avec Docker

Pourquoi : coût fixe faible (4–7 €/mois), aucune limite de durée d'exécution, données hébergées où l'on veut,
disque local pour les fichiers. Contrepartie : mises à jour système, sauvegardes et supervision à votre charge.

```bash
# Sur le serveur (Ubuntu 24.04, Docker installé)
git clone https://github.com/savi-app1/appli-eleves.git && cd appli-eleves
cp .env.example .env            # renseigner POSTGRES_PASSWORD, APP_ENV, NEXT_PUBLIC_APP_URL, AI_*, PAYMENT_*, ADMIN_IDENTIFIERS
docker compose up -d --build    # construit l'image, démarre PostgreSQL, applique les migrations, lance l'application sur 127.0.0.1:3000
```

Devant l'application, un reverse proxy qui termine le TLS, par exemple Caddy (`Caddyfile` : `savi.example.org { reverse_proxy 127.0.0.1:3000 }`)
— certificats Let's Encrypt automatiques. Mise à jour : `git pull && docker compose up -d --build`.

## 4. Sauvegardes et restauration

| Quoi | Comment | Fréquence |
|---|---|---|
| Base PostgreSQL | Neon : restauration à un instant (7 jours) incluse ; VPS : `docker compose exec db pg_dump -U savi -Fc savi > savi-$(date +%F).dump` puis copie hors du serveur (R2/B2, 30 jours de rétention) | quotidienne (cron) |
| Fichiers importés | R2/B2 : versionnage du bucket ou réplication ; VPS : `docker run --rm -v appli-eleves_uploads:/data -v $PWD:/backup alpine tar czf /backup/uploads-$(date +%F).tgz /data` | quotidienne |
| Secrets | gestionnaire de mots de passe de l'équipe (jamais dans Git) | à chaque changement |

Restauration : `pg_restore -U savi -d savi --clean savi-2026-10-14.dump` (VPS) ou « Restore » dans la console Neon ;
fichiers : extraire l'archive dans le volume `uploads`. Tester la restauration une fois par trimestre sur la préproduction.

## 5. Mise à jour de l'application

1. Développer sur une branche, ouvrir une Pull Request : la CI exécute lint, types, tests, build et parcours de bout en bout.
2. Vérifier l'URL de prévisualisation (Vercel) ou déployer la branche sur la préproduction (VPS).
3. Fusionner dans `main` → déploiement automatique (Vercel) ou `git pull && docker compose up -d --build` (VPS).
4. Les migrations sont idempotentes et s'exécutent avant le démarrage ; pour une migration risquée, faire une sauvegarde juste avant.

## 6. Supervision minimale

- Vercel : onglet Logs + alertes e-mail ; VPS : `docker compose logs -f app`, et un service de ping gratuit
  (UptimeRobot, Better Stack) sur `https://<domaine>/connexion`.
- Les erreurs serveur sont journalisées avec un code de corrélation (`digest`) affiché à l'élève sur la page d'erreur.
- Coûts à surveiller : consommation IA (plafonds journaliers déjà en place), stockage, SMS si activés.

## 7. Ce qu'il faut encore décider ou fournir

1. Reprendre la main sur le site Netlify et sa base (section 8.3) ; nom de domaine.
2. Clé du fournisseur d'IA (Anthropic recommandé) et budget mensuel.
3. Prestataire de paiement et accès à son environnement de test ; tarifs définitifs.
4. Fournisseur d'e-mails/SMS (vérification de compte, mot de passe oublié) — Brevo, Resend, Orange SMS API…
5. Textes juridiques définitifs (mentions `[à compléter]` dans `/mentions-legales`, `/confidentialite`, `/conditions`).

## 8. Option C — Netlify (site relié au dépôt, déployée)

### 8.1 Ce qui est en place

| Élément | Choix | Pourquoi |
|---|---|---|
| Hébergement | Site Netlify relié au dépôt GitHub par l'application Netlify (déjà installée sur le dépôt) | Seul canal de déploiement utilisable sans identifiant à transmettre ; HTTPS, CDN et aperçus par pull request inclus |
| Construction | `netlify.toml` : `npm run ocr:setup && npm run build`, Node 22, plugin `@netlify/plugin-nextjs` | Télécharge les modèles OCR puis construit Next.js ; le plugin transforme l'application en fonctions serverless |
| Base de données | **Netlify Database** (PostgreSQL managé, infrastructure Neon) provisionnée automatiquement par l'étape de build « Netlify Database setup » dès que `@netlify/database` figure dans les dépendances ; variable `NETLIFY_DB_URL` injectée dans les fonctions. Production = base principale ; chaque branche/aperçu = **branche de base** isolée | Aucune clé à copier ; `src/db/client.ts` l'utilise si `DATABASE_URL` est absent et **exécute les migrations Drizzle au premier démarrage** (verrou `pg_advisory_lock`, désactivable avec `DB_AUTO_MIGRATE=0`) |
| Fichiers | **Netlify Blobs**, magasin privé `savi-fichiers` (`STORAGE_PROVIDER=netlify-blobs`) | Disque des fonctions en lecture seule ; les documents importés doivent survivre aux redéploiements |
| Intelligence artificielle | **Passerelle IA Netlify** (*AI Gateway*) : le site reçoit automatiquement `ANTHROPIC_API_KEY` + `ANTHROPIC_BASE_URL` (et OpenAI, Gemini) ; le fournisseur est détecté à l'exécution (`AI_PROVIDER=auto`) → **Claude réel** (Haiku 4.5 pour le tuteur/fiches/quiz, Sonnet 4.5 pour les corrections et le mode strict), OCR par vision du modèle | Aucune clé à gérer au départ ; la consommation est facturée en **crédits IA du compte Netlify** (quota gratuit limité : suivre *Usage* → *AI Gateway*). Pour utiliser une clé Anthropic propre, définir `ANTHROPIC_API_KEY` dans l'interface Netlify : elle prime sur la passerelle |
| Réglages | Préréglage `SAVI_DEPLOY_PRESET=netlify-preview` dans `next.config.ts` : `APP_ENV=preview`, paiement bac à sable, OCR limité à 8 s, pool de 2 connexions, administrateur initial `admin.savi@exemple.com` — chaque valeur est remplaçable par une variable du même nom dans l'interface Netlify (lue au moment du build) | Netlify ne transmet pas les variables de `netlify.toml` aux fonctions à l'exécution : les valeurs **non secrètes** sont donc figées à la construction. Tout secret se met dans l'interface Netlify |
| Vérification | Flux GitHub Actions « Vérification du déploiement » (`.github/workflows/verification-deploiement.yml`) : attend la fin du déploiement, appelle `GET /api/sante` puis rejoue les 18 scénarios de bout en bout contre le site réel | Preuve automatique que le site en ligne fonctionne (inscription, tuteur, documents, quiz, correction, paiement bac à sable, sécurité) |

Point de santé : `GET /api/sante` → `{"ok":true,"env":"preview","db":"ok","storage":"netlify-blobs","ai":"mock","payment":"sandbox"}`
(503 si la base est injoignable).

### 8.2 Limites de l'offre gratuite Netlify (à connaître)

- **10 s par requête de fonction** : la lecture OCR locale (Tesseract) d'une photo peut dépasser ce délai ; l'application
  échoue alors proprement et l'élève peut saisir le texte. Avec une clé IA réelle, l'OCR passe par la vision du modèle
  (plus rapide et plus fiable). Les réponses du tuteur en flux ne sont pas concernées (streaming).
- 300 minutes de construction/mois, 100 Go de bande passante : suffisant pour un pilote ; au-delà, offre Pro (19 $/mois).
- Netlify Database : quotas de l'offre gratuite (stockage et calcul limités) ; consulter Netlify → *Database* pour l'usage et voir 8.3.

### 8.3 Actions à faire par l'équipe SAVI (une seule fois)

1. **Vérifier la base de données** dans Netlify → site → *Database* : état, usage, sauvegardes ; si l'interface propose de
   « réclamer » (*claim*) la base auprès de Neon, le faire sans attendre (une base non réclamée peut être supprimée après
   quelques jours).
2. Renommer le site et, le moment venu, relier le nom de domaine (*Domain management*).
3. Ajouter les secrets (IA, paiement) dans *Environment variables* quand ils seront disponibles — jamais dans le dépôt.
4. Activer les sauvegardes : Neon conserve 24 h d'historique (restauration à un instant donné) sur l'offre gratuite ;
   pour un export quotidien, utiliser `pg_dump` avec `NETLIFY_DB_URL` (section 4 ; `netlify database connect` donne aussi
   un accès SQL). Les fichiers des élèves
   sont dans Netlify Blobs (durables, répliqués), à exporter avec `netlify blobs:list/get` si besoin.
