# Étape 4 — MVP pédagogique

Ce document décrit ce qui a été construit à l'étape 4, comment cela fonctionne, les limites connues et
ce qu'il faut pour passer de la démonstration à l'IA réelle.

## 1. Vue d'ensemble

| Fonction | État | Où |
|---|---|---|
| Tuteur IA (questions écrites, réponses adaptées au niveau, « explique autrement / plus simple / un exemple / un exercice ») | ✅ réel, réponse en flux | `/tuteur`, `POST /api/tuteur` |
| Historique des discussions, épingler, supprimer, reprendre | ✅ | `/profil/historique`, `/tuteur?c=<id>` |
| Mes cours : import PDF / photo, lecture du texte, classement matière/chapitre, recherche dans le contenu | ✅ | `/cours`, `/cours/<id>`, `POST /api/documents` |
| Fiche de révision et exercices générés depuis un document | ✅ | `/cours/<id>?onglet=summary|exercises` |
| Mode strict (répond uniquement à partir des documents choisis, cite [1] [2], signale ce qui manque) | ✅ | `/tuteur?strict=1&docs=a,b` |
| Quiz (QCM, vrai/faux, réponse courte) générés par thème ou depuis un cours, correction expliquée, score serveur, historique | ✅ | `/quiz`, `/quiz/<id>` |
| Correction de devoirs : photo/PDF/texte → texte lu → vérification par l'élève → analyse (étapes, erreurs, conseils, note indicative seulement avec barème) | ✅ | `/correction`, `/correction/<id>`, `POST /api/corrections` |
| Examens blancs chronométrés avec correction différée | ✅ (sujets générés, signalés « exemple ») | `/examens`, `/examens/blanc/<id>` |
| Progression : % de réussite, par matière, points forts / difficultés par thème, activité 7 jours, série, objectifs, séances de révision | ✅ | `/progression`, `/accueil` |
| Sujets officiels d'examens avec provenance et date de vérification | ⏳ schéma prêt (`exam_papers`), contenu à valider pays par pays | — |

## 2. Fournisseur d'IA et mode démonstration

- Le code appelle le modèle via le **Vercel AI SDK** (`src/server/ai/provider.ts`). Le fournisseur se choisit par
  `AI_PROVIDER` : `anthropic` (recommandé : Claude Haiku pour les réponses courantes, Claude Sonnet pour le mode
  strict, les corrections et la lecture d'images), `openai` (ou tout service compatible via `OPENAI_BASE_URL`), `mock`.
- **Sans clé API, `AI_PROVIDER=mock`** active le mode démonstration : une IA simulée (`src/server/ai/mock-brain.ts`)
  produit des réponses plausibles (banque de notions, fiches/quiz construits à partir du texte réel du document,
  correction d'équations du premier degré). Ce mode exerce **tout le reste** de l'application à l'identique :
  flux, enregistrement, quotas, mode strict, quiz, corrections. Il est signalé à l'écran (« Mode démonstration :
  IA simulée ») et n'est jamais présenté comme de l'IA réelle.
- Les invites (`src/server/ai/prompts.ts`) imposent : langue de réponse de l'élève (avec rappel que les langues
  nationales sont en test), niveau de classe, pédagogie pas à pas, pas de note sans barème, et pour le mode strict la
  phrase exacte « Cette information n'est pas dans tes documents sélectionnés. » quand l'information manque.
- Les clés restent **côté serveur** (variables d'environnement). Rien n'est exposé au navigateur.

## 3. Garde-fous (`src/server/ai/guard.ts`)

Chaque appel IA passe par : accès Premium/essai valide (sinon **402**) → limitation de débit par utilisateur
(120 requêtes/min, sinon **429 rate_limited**) → plafond journalier par type (`usage_counters`, sinon **429 quota_exceeded**).
Plafonds par défaut : 150 messages tuteur, 20 corrections, 30 générations (fiches/exercices/quiz), 40 imports par jour
(`DAILY_LIMIT_*`). IA indisponible → **503**. Les écrans traduisent ces codes en messages compréhensibles.

## 4. Documents, lecture et recherche

1. Validation : type réel (signature binaire), taille ≤ `MAX_UPLOAD_MB`, stockage privé sous `users/<id>/…`.
2. Lecture : PDF texte avec `unpdf` ; photos par le modèle de vision si une clé est configurée, sinon **Tesseract.js**
   en local (données `fra`/`eng` téléchargées par `npm run ocr:setup`, correct sur l'imprimé, faible sur le manuscrit).
3. Découpage en extraits d'environ 700 caractères (chevauchement 80) indexés en **recherche plein texte PostgreSQL**
   (configuration `french_unaccent` : « hypotenuse » trouve « hypoténuse », utile sur les claviers de téléphone).
4. Le mode strict sélectionne les 6 extraits les plus pertinents **parmi les documents de l'utilisateur uniquement**,
   les numérote et les transmet au modèle ; les sources sont renvoyées au client et enregistrées avec la réponse.
5. Les fichiers originaux ne sont servis qu'à leur propriétaire (`/api/documents/<id>/fichier`).

Limite actuelle : la lecture se fait pendant la requête d'import (quelques secondes ; un très long PDF peut prendre
plus). Une file de traitement en arrière-plan est prévue si l'usage le justifie (le statut `processing` existe déjà).

## 5. Quiz, corrections, examens blancs

- **Quiz** : structure validée par schéma (zod) ; identifiants de questions générés côté serveur ; les réponses sont
  envoyées au navigateur pour le retour immédiat, mais le **score enregistré est recalculé côté serveur**
  (`submitAttempt`), avec normalisation des réponses courtes (accents, espaces, « x = », « ² »).
- **Corrections** : deux temps obligatoires. L'élève voit et corrige le texte lu (confiance affichée) avant l'analyse.
  La note n'est produite que si l'élève a déclaré un barème, et toujours libellée « indicative ».
- **Examens blancs** : quiz `source = exam` avec durée ; correction différée (copie rendue à la fin ou au temps
  écoulé) ; signalés « sujet d'exemple ». Les sujets officiels seront ajoutés avec provenance et date de vérification.

## 6. Progression

Calculée à la demande à partir des tentatives de quiz (par matière et par thème), des messages, corrections et documents.
Points forts : thèmes ≥ 75 % avec au moins 2 réponses ; difficultés : < 60 %. Série = jours consécutifs d'activité.
Objectif hebdomadaire : `WEEKLY_GOAL_SESSIONS` (4 par défaut). Les séances de révision proposées ciblent les thèmes
faibles et génèrent un quiz de 5 questions.

## 7. Données et confidentialité

- Toutes les tables métier portent `user_id` et toutes les lectures filtrent dessus ; la suppression du compte efface
  tout en cascade (documents, extraits, discussions, quiz, corrections, objectifs).
- Les journaux d'audit ne contiennent jamais le contenu des questions, documents ou corrections.
- Les administrateurs n'ont **aucune** vue sur les conversations privées (il n'existe pas d'écran ni de route pour cela).

## 8. Tests

`npm test` : 48 tests, dont l'intégration complète du MVP sur PostgreSQL en mémoire avec l'IA simulée : tuteur (flux,
historique, cloisonnement, essai expiré), documents (import PDF réel, recherche insensible aux accents, mode strict
avec et sans réponse, suppression), quiz (normalisation, génération, score serveur), corrections (texte et photo OCR,
note uniquement avec barème), progression, plafonds journaliers. Un parcours HTTP de bout en bout (inscription →
tuteur → import → fiche → strict → quiz → correction → examen → isolation entre comptes → 401) a aussi été exécuté
sur la version construite.

## 9. Pour passer à l'IA réelle (étape 7)

1. Créer une clé chez le fournisseur choisi (Anthropic recommandé) et la mettre dans l'environnement du serveur :
   `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=…` (optionnel : `AI_MODEL_FAST`, `AI_MODEL_STRONG`).
2. Vérifier le budget : avec les plafonds par défaut, un élève très actif coûte au plus quelques dizaines de FCFA par jour ;
   un usage moyen revient à environ 1–3 FCFA par réponse.
3. Tester les langues nationales avec des locuteurs avant de retirer la mention « en test ».
