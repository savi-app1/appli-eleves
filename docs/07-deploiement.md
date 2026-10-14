# Étape 7 — Préproduction, déploiement, sauvegardes

## 1. Où en est l'URL de préproduction

- **Aujourd'hui** : l'application tourne dans l'environnement de prévisualisation de la session de travail (lien
  fourni dans la conversation), avec l'IA simulée (`AI_PROVIDER=mock`), le paiement en bac à sable
  (`PAYMENT_PROVIDER=sandbox`, `APP_ENV=preview`) et une base PostgreSQL embarquée. Ce lien sert aux tests de
  validation ; il n'est pas destiné à durer ni à être partagé largement.
- **URL stable** : elle nécessite un hébergeur et donc des comptes au nom de l'équipe SAVI (pour garder le contrôle et
  la facturation). Deux options sont prêtes dans le dépôt ; les deux se déploient en moins d'une heure une fois les
  comptes créés.

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

1. Hébergeur (A ou B) et création des comptes au nom de l'équipe SAVI ; nom de domaine.
2. Clé du fournisseur d'IA (Anthropic recommandé) et budget mensuel.
3. Prestataire de paiement et accès à son environnement de test ; tarifs définitifs.
4. Fournisseur d'e-mails/SMS (vérification de compte, mot de passe oublié) — Brevo, Resend, Orange SMS API…
5. Textes juridiques définitifs (mentions `[à compléter]` dans `/mentions-legales`, `/confidentialite`, `/conditions`).
