# Étape 6 — Tests, erreurs, sécurité, mobile et réseaux faibles

## 1. Tests automatisés

| Niveau | Commande | Contenu | Nombre |
|---|---|---|---|
| Unitaires | `npm test` | validation des entrées, calcul de l'essai, limitation de débit, schémas IA, normalisation des réponses de quiz, signature des webhooks, références et périodes de paiement, configuration du prestataire | 25 |
| Intégration (PostgreSQL en mémoire) | `npm test` | comptes et sessions, essai expiré, suppression de compte en cascade, tuteur, documents + mode strict, quiz, corrections (texte et photo), progression, plafonds journaliers, paiement et activation du Premium, webhook HTTP | 39 |
| Bout en bout (HTTP, serveur construit) | `npm run build && npm run test:e2e` | parcours complet d'un élève : inscription → tuteur en flux → import PDF → recherche → fiche → mode strict → quiz → correction (texte + OCR photo) → examen blanc → progression → paiement bac à sable → webhook → administration → cloisonnement entre deux comptes → déconnexion ; en-têtes de sécurité et contrôle d'origine | 19 |

Le parcours de bout en bout démarre lui-même `next start` sur un port libre avec une base jetable (`.data/e2e-pglite`),
l'IA simulée et le paiement en bac à sable : aucune dépendance externe, exécuté dans la CI GitHub à chaque modification.

Ce qui n'est **pas** automatisé (à faire à la main sur téléphone avant l'ouverture, voir § 5) : rendu visuel,
gestes tactiles, caméra, installation PWA, comportement réel sur 2G/3G.

## 2. Gestion des erreurs

- Codes métier traduits en messages clairs : essai expiré (→ page Abonnement), quota journalier, trop de requêtes,
  IA indisponible, fichier refusé (type, contenu, taille), élément introuvable.
- Pages d'erreur dédiées : `error.tsx` (réessayer / accueil, aucun détail technique, code de corrélation),
  `global-error.tsx` (mise en page racine), `not-found.tsx`.
- Les routes API renvoient toujours du JSON (`401`, `403`, `404`, `400`, `402`, `429`, `503`), jamais une page HTML.
- Lecture OCR bornée dans le temps (`OCR_TIMEOUT_MS`) : une photo illisible donne un statut « échec » explicite, pas une
  requête bloquée.

## 3. Sécurité (état après l'étape 6)

| Mesure | Détail |
|---|---|
| Sessions | jetons aléatoires hachés en base, cookie `httpOnly` `Secure` `SameSite=Lax`, glissement 30 jours, révocation à la déconnexion et à la suppression |
| Mots de passe | scrypt, comparaison en temps constant, 8 à 128 caractères |
| Force brute | 10 tentatives / 15 min par adresse+identifiant **et** 30 / h par identifiant toutes adresses confondues ; 5 inscriptions / h par adresse ; clés hachées (jamais d'adresse IP ni d'identifiant en clair) |
| CSRF | actions serveur protégées par Next.js (origine) ; routes API : cookie `SameSite=Lax` + contrôle explicite de l'en-tête `Origin` (403) |
| CSP | **appliquée en production** : scripts uniquement avec nonce par requête (`strict-dynamic`), pas d'`eval`, images `self/data/blob`, connexions `self`, `object-src 'none'`, `frame-ancestors 'self'` (ouverte uniquement pour la prévisualisation sandbox) ; rapport seul en développement |
| Autres en-têtes | HSTS (2 ans, preload), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (caméra autorisée pour soi, géolocalisation/micro refusés), `X-Robots-Tag: noindex` hors production |
| Fichiers | type déclaré **et** signature binaire, taille maximale, stockage privé hors du dossier public, clés `users/<id>/<uuid>`, lecture réservée au propriétaire |
| Cloisonnement | toutes les requêtes métier filtrent sur `user_id` ; vérifié par tests d'intégration et de bout en bout (404 systématique) |
| IA | clés serveur uniquement, garde-fous Premium → débit → plafonds journaliers, invites qui interdisent de sortir des documents en mode strict |
| Paiement | activation uniquement sur événement signé ou confirmation manuelle auditée, idempotence, contrôle montant/devise, bac à sable interdit en production |
| Administration | périmètre limité aux paiements, identifiants masqués, aucune vue sur les conversations |
| Journal d'audit | actions sensibles sans contenu personnel (jamais de texte de conversation, de document ou de mot de passe) |
| Données | suppression de compte en cascade ; trace comptable anonymisée ; année de naissance facultative pour adapter l'expérience des mineurs |

Points à traiter avant l'ouverture publique (étape 8) : vérification de l'e-mail / du numéro (nécessite un prestataire
d'envoi), réinitialisation de mot de passe, export des données (« Télécharger mes données »), sauvegardes automatiques
de la base (voir `docs/07-deploiement.md`).

## 4. Mobile et réseaux faibles

- Conception « mobile d'abord » : navigation basse à 5 entrées, cibles tactiles ≥ 44 px, texte ≥ 15 px, contraste
  vérifié sur les couleurs de la charte, thème sombre.
- **Compression des photos côté téléphone** avant envoi (redimensionnement ≤ 1600 px, JPEG ~82 %) : une photo de
  4–8 Mo passe en général sous 400 Ko, décisif en 3G. Le fichier d'origine est conservé si la compression n'apporte rien.
- Réponses du tuteur **en flux** : le premier mot apparaît en moins d'une seconde, même si la réponse complète prend
  plusieurs secondes.
- PWA installable + service worker minimal : page « hors ligne » claire quand le réseau coupe. Aucune page connectée ni
  donnée personnelle n'est mise en cache.
- Formulaires classiques (import, correction, paiement) fonctionnent même si le JavaScript n'est pas encore chargé.
- Poids : CSS unique, pas de police externe, icônes vectorielles, pas de bibliothèque de composants lourde.

## 5. Liste de contrôle manuelle (téléphone Android, à faire ensemble)

1. Installer la PWA depuis Chrome (« Ajouter à l'écran d'accueil »), ouvrir hors ligne → page « Tu es hors ligne ».
2. Chrome → Outils de développement → onglet Réseau → « Slow 3G » : inscription, question au tuteur, import d'une photo
   de cours (observer la taille envoyée), correction d'un devoir par photo.
3. Couper le réseau pendant une réponse du tuteur : message d'erreur lisible, bouton pour réessayer.
4. Thème sombre, langue de l'interface en anglais, langue de réponse en mooré (vérifier la mention « en test »).
5. Essai expiré (compte créé il y a plus de 4 jours ou `TRIAL_DAYS=0` en préproduction) : fonctions IA bloquées, page
   Abonnement, paiement bac à sable, retour au Premium.
6. Supprimer le compte : retour à l'écran d'accueil, impossible de se reconnecter.
