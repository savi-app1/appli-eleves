# SAVI — Ton professeur intelligent

Plateforme éducative intelligente pour les élèves, étudiants et candidats aux examens
et concours d'Afrique de l'Ouest : tuteur IA, correction de devoirs, cours personnels,
quiz, examens blancs et suivi de progression.

> **État du projet : reconstruction en cours — Étape 1 (audit et architecture) terminée.**
> Le code applicatif sera ajouté à partir de l'étape 3. Voir le plan détaillé dans
> [`docs/01-audit-et-architecture.md`](docs/01-audit-et-architecture.md).

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `docs/` | Documentation : audit, architecture, plan, puis déploiement, sauvegarde, sécurité |
| `legacy/` | Archive intacte du premier prototype (lecture seule, voir `legacy/README.md`) |

## Principes non négociables

- Les clés API et secrets ne sont **jamais** dans le code : uniquement dans les variables
  d'environnement du serveur (`.env`, non versionné ; un `.env.example` documente les variables).
- Les contrôles d'accès, les quotas et le calcul de l'essai gratuit se font **côté serveur**.
- Les données de chaque utilisateur sont strictement cloisonnées.
- Aucun paiement n'est simulé en production ; l'accès premium n'est activé qu'après confirmation fiable.

## Licence

Tous droits réservés — projet privé en cours de développement.
