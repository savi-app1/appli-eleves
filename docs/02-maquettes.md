# SAVI — Étape 2 : maquettes interactives

> Statut : **en attente de vos retours**. Les écrans sont construits dans la vraie application
> (pas dans un outil de dessin) : chaque validation devient directement du code réutilisé aux étapes suivantes.
> Toutes les données affichées sont des **exemples** (`src/lib/mock-data.ts`). Un bandeau noir le rappelle en haut de l'écran.

## Comment tester

1. Ouvrez l'URL de prévisualisation **sur votre téléphone Android** (Chrome) — c'est la cible prioritaire.
2. Testez aussi sur ordinateur : la mise en page s'adapte (colonne centrale max. 36 rem).
3. Chrome Android propose « Ajouter à l'écran d'accueil » : l'application s'installe comme une PWA.
4. Le bouton lune/soleil (en haut à droite) bascule le thème clair/sombre.
5. Dans *Profil → Langues et thème*, changez la langue de l'interface : l'anglais est complet ; mooré, dioula et
   fulfuldé n'ont volontairement que quelques mots (statut **bêta**) et retombent sur le français ailleurs.

## Parcours et écrans

| Écran | URL | Ce qu'il montre | Interactions de la maquette |
|---|---|---|---|
| Bienvenue (onboarding) | `/bienvenue` | 4 promesses de SAVI, essai 4 jours | Défilement des slides, accès inscription/connexion |
| Connexion | `/connexion` | E-mail **ou téléphone** + mot de passe | Formulaire visuel (relié à l'API à l'étape 3) |
| Inscription | `/inscription` | Prénom, identifiant, mot de passe, classe, pays, consentement, avertissement mineurs | Formulaire visuel |
| Accueil | `/accueil` | Bandeau d'essai avec **date de fin**, 4 tuiles principales, Examens & Progression, révision du jour, objectif hebdo, progression par matière, discussions récentes | Navigation vers tous les modules |
| Tuteur IA | `/tuteur` | Discussion, puce de niveau, langue des réponses, suggestions, **Explique autrement / Plus simple / Un exemple / Un exercice**, épinglage, nouvelle discussion | Réponses d'exemple affichées « en flux » (Pythagore, équations, photosynthèse, fractions) |
| Correction de devoir | `/correction` | 3 étapes : photo/fichier (caméra Android) → **texte reconnu modifiable** avec confiance → correction (étapes, erreurs, à améliorer, **note indicative seulement si barème**) | Prise de photo réelle (aperçu), bascule « barème » |
| Mes cours | `/cours` | Recherche, filtres par matière, import, documents (PDF/photo, statut d'analyse), actions Résumé/Quiz/Exercices/Question, **mode strict** avec sélection des documents | Recherche et filtres fonctionnels, sélection pour le mode strict |
| Quiz | `/quiz` → `/quiz/jouer` | Quiz mixte **QCM / Vrai-Faux / Réponse courte**, correction expliquée à chaque question, score final, récapitulatif des erreurs, historique | Quiz jouable de bout en bout |
| Examens & concours | `/examens` → `/examens/blanc` | Sélecteurs pays / examen / matière / niveau, sujets avec **source et date de vérification**, badge « exemple », examen blanc **chronométré** | Filtres fonctionnels, chrono réel, questions jouables |
| Progression | `/progression` | Moyenne, compteurs, progression par matière avec tendance, activité 7 jours, points forts/difficultés, objectifs, séances de révision proposées | — |
| Profil | `/profil` | Carte profil, abonnement, historique, langues/thème, confidentialité, export, **suppression de compte**, déconnexion | — |
| Historique | `/profil/historique` | Discussions **épinglées** et récentes | — |
| Langues et thème | `/profil/parametres` | **Trois réglages distincts** : langue de l'interface, langue des questions (auto), langue des réponses de l'IA ; statut de chaque langue ; option « ajouter une version en français » pour les langues bêta ; thème | Changement de langue réel, thème réel |
| Abonnement | `/abonnement` | Essai en cours avec date/heure de fin, formules 1 000 / 10 000 FCFA marquées **« à confirmer »**, boutons de paiement **verrouillés** tant que le prestataire n'est pas configuré, fonctions incluses | — |

## Choix de conception à valider

1. **Navigation basse à 5 onglets** : Accueil · Tuteur · Cours · Quiz · Profil. La progression et les examens
   sont accessibles depuis l'accueil et le profil. Alternative : remplacer « Quiz » par « Progrès ».
2. **Palette** : vert `#0E7C3A` + noir + blanc + gris clair uniquement (les tuiles bleues/violettes/orange du
   premier prototype ont été abandonnées pour respecter l'identité SAVI). Les 4 tuiles se distinguent par
   vert plein / noir / vert pâle / blanc.
3. **Tutoiement** de l'élève dans toute l'interface (conservé du prototype).
4. **Bandeau d'essai** toujours visible sur l'accueil, avec la date de fin en clair.
5. **Correction** : la note n'apparaît que si l'élève indique qu'il y a un barème ; sinon correction expliquée seule.
6. **Examens** : badge « exemple » tant qu'un sujet n'a pas de source officielle vérifiée.

## Ce qui n'est pas encore réel (volontairement)

- Pas de compte ni de base de données : les boutons Connexion/Inscription mènent directement à l'accueil.
- Les réponses du tuteur, la correction et les résumés sont des textes d'exemple.
- Le paiement est verrouillé : aucun lien, aucune simulation.
- Pas encore de mode hors ligne (service worker prévu à l'étape 3).

## Prochaine étape (3 — fondations) après votre validation

Base PostgreSQL (PGlite en local), schéma Drizzle, inscription/connexion réelles avec sessions,
cloisonnement des données, quotas, validation des fichiers, stockage privé, CI GitHub Actions.
