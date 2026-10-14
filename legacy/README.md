# Archive de la première version de SAVI

Ce dossier conserve, **sans modification**, les deux fichiers de la première version
du projet (prototype statique créé avant la reconstruction). Ils ne sont plus utilisés
par l'application, mais sont gardés comme référence historique et visuelle.

| Fichier | Origine | Contenu |
|---|---|---|
| `prototype-v1-index.html` | ancien `index.html` à la racine | Prototype à 2 écrans : Accueil + Mes cours (texte collé, stocké dans `localStorage`). Les tuiles « Pose une question » et « Corriger un devoir » affichaient « bientôt disponible ». |
| `prototype-v2-complet.html` | ancien `README.md` à la racine (c'était en réalité une page HTML, pas un README) | Prototype à 7 écrans : Accueil, Chat, Quiz, Devoir, Cours, Progrès, Profil. Réponses du chat et correction **simulées** (texte fixe) ; quiz de 3 questions codé en dur ; bouton « Vraie réponse avec Claude » qui copiait un prompt et ouvrait claude.ai dans un nouvel onglet. |

## Ce qui a été réutilisé dans la nouvelle application

- **Identité visuelle** : vert principal `#0E7C3A`, fond gris clair `#F4F6F5`, texte `#17202A`,
  texte secondaire `#667085`, bordures `#E3E8E6`.
- **Textes et ton** : « Ton professeur intelligent », « Que veux-tu apprendre aujourd'hui ? »,
  libellés des tuiles (Pose une question / Corriger un devoir / Quiz & Exercices / Mes cours),
  tutoiement bienveillant adapté aux élèves.
- **Structure de l'accueil** : 4 tuiles d'action + carte « Révision du jour » + carte « Ma progression ».
- **Navigation basse** à 5 onglets (Accueil, Cours, Quiz, Progrès, Profil), pensée pour le pouce.
- **Exemples pédagogiques** : les 3 questions du quiz de démonstration et les prompts
  « 5 exercices progressifs » / « mini-examen de 10 questions » ont inspiré les premiers
  gabarits de génération d'exercices.

## Ce qui n'a pas été conservé (et pourquoi)

- Stockage dans `localStorage` : données perdues au changement de téléphone, aucune
  synchronisation, aucune sécurité → remplacé par un compte utilisateur et une base de données.
- Absence de backend : impossible d'appeler une IA sans exposer une clé API → remplacé
  par une API serveur sécurisée.
- Réponses simulées et redirection vers claude.ai → remplacées par un vrai tuteur IA intégré.
- Fichier unique HTML/CSS/JS : non testable, non traduisible, non évolutif → remplacé par
  une application structurée (TypeScript, composants, tests, internationalisation).
