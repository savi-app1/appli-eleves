/**
 * Tuteur d'EXEMPLE pour la validation des écrans (étape 2).
 * Produit des réponses pédagogiques fixes selon le sujet détecté.
 * Sera remplacé par le fournisseur d'IA réel (étape 4) — même interface de message.
 */
export type Intent = "explainAgain" | "example" | "exercise" | "simpler";

const topics: { match: RegExp; name: string; answer: string; again: string; simpler: string; example: string; exercise: string }[] = [
  {
    match: /pythagore|hypot[eé]nuse|triangle rectangle/i,
    name: "Pythagore",
    answer:
      "Dans un triangle rectangle, le côté le plus long s'appelle l'hypoténuse : c'est celui qui est en face de l'angle droit.\n\nLe théorème de Pythagore dit :\n**(hypoténuse)² = (côté 1)² + (côté 2)²**\n\nÉtapes pour l'utiliser :\n1. Repère l'angle droit et l'hypoténuse.\n2. Écris l'égalité avec les noms des côtés.\n3. Remplace par les longueurs connues.\n4. Calcule, puis prends la racine carrée.\n\nExemple : si les deux petits côtés mesurent 3 cm et 4 cm, alors hyp² = 9 + 16 = 25, donc hyp = 5 cm.",
    again:
      "Imagine trois carrés dessinés sur les trois côtés d'un triangle rectangle. L'aire du grand carré (sur l'hypoténuse) est exactement égale à la somme des aires des deux petits carrés. C'est ça, Pythagore : une histoire d'aires qui s'additionnent !",
    simpler:
      "Version simple : dans un triangle avec un angle droit, le grand côté au carré = petit côté au carré + autre petit côté au carré. Exemple : 3, 4 et 5 → 9 + 16 = 25. ✔",
    example:
      "Exemple : une échelle de 5 m est posée contre un mur ; son pied est à 3 m du mur. À quelle hauteur touche-t-elle le mur ?\n\nhauteur² = 5² − 3² = 25 − 9 = 16 → hauteur = 4 m.",
    exercise:
      "À toi ! Un triangle ABC est rectangle en B avec AB = 6 cm et BC = 8 cm.\n\n1. Quel est le nom de l'hypoténuse ?\n2. Calcule sa longueur.\n\nÉcris ta réponse, je la corrige. 😊",
  },
  {
    match: /[ée]quation|2x|résou|resou/i,
    name: "Équations",
    answer:
      "Pour résoudre 2x + 5 = 13, le but est d'isoler x.\n\n1. On enlève 5 des deux côtés : 2x = 13 − 5, donc 2x = 8.\n2. On divise les deux côtés par 2 : x = 8 ÷ 2 = 4.\n3. Vérification : 2 × 4 + 5 = 13. ✔\n\nRègle d'or : ce que tu fais d'un côté du « = », tu le fais aussi de l'autre.",
    again:
      "Pense à une balance en équilibre. 2x + 5 d'un côté, 13 de l'autre. Si tu retires 5 g d'un plateau, tu dois retirer 5 g de l'autre pour garder l'équilibre : il reste 2x = 8. Puis tu partages en deux : x = 4.",
    simpler:
      "2x + 5 = 13 → j'enlève 5 : 2x = 8 → je partage par 2 : x = 4. C'est tout !",
    example:
      "Autre exemple : 3x − 4 = 11.\n1. +4 des deux côtés : 3x = 15.\n2. ÷3 : x = 5.\nVérif : 3 × 5 − 4 = 11. ✔",
    exercise:
      "Exercice : résous 5x − 7 = 18.\n\nIndice : commence par ajouter 7 des deux côtés. Envoie-moi ta réponse !",
  },
  {
    match: /photosynth/i,
    name: "Photosynthèse",
    answer:
      "La photosynthèse, c'est la façon dont les plantes fabriquent leur nourriture.\n\nGrâce à la **chlorophylle** (le pigment vert des feuilles), la plante capte la lumière du soleil et transforme :\n- de l'eau (puisée par les racines)\n- et du dioxyde de carbone (CO₂, pris dans l'air)\n\nen **glucose** (du sucre, son énergie) et en **dioxygène** (O₂), qu'elle rejette dans l'air.\n\nÉquation simplifiée : eau + CO₂ + lumière → glucose + O₂.",
    again:
      "Imagine la feuille comme une petite cuisine solaire : les panneaux solaires sont la chlorophylle, les ingrédients sont l'eau et le CO₂, et le plat préparé est le sucre. La « fumée » qui sort, c'est l'oxygène que nous respirons !",
    simpler:
      "La plante utilise la lumière, l'eau et l'air (CO₂) pour fabriquer son sucre, et elle rejette de l'oxygène.",
    example:
      "Exemple : une plante placée dans le noir pendant une semaine jaunit et s'affaiblit, car sans lumière elle ne peut plus faire de photosynthèse donc plus fabriquer de sucre.",
    exercise:
      "Question : pourquoi met-on des plantes vertes dans un aquarium ? Réponds en une ou deux phrases en utilisant le mot « dioxygène ».",
  },
  {
    match: /fraction/i,
    name: "Fractions",
    answer:
      "Une fraction, c'est une part d'un tout. Dans 3/4 : le 4 (dénominateur) dit en combien de parts égales on coupe, le 3 (numérateur) dit combien on en prend.\n\nPour additionner des fractions, il faut le **même dénominateur** :\n1/2 + 1/4 = 2/4 + 1/4 = 3/4.\n\nPour multiplier, c'est direct : 2/3 × 3/5 = 6/15 = 2/5.",
    again:
      "Pense à une galette coupée en 4 parts. Manger 3/4, c'est prendre 3 parts sur les 4. Si tu coupes la galette en 8 à la place, 3/4 devient 6/8 : même quantité, parts plus petites.",
    simpler: "3/4 = 3 parts sur 4. Pour additionner des fractions, mets-les d'abord sur le même nombre de parts.",
    example: "Exemple : 2/3 + 1/6. On met tout en sixièmes : 2/3 = 4/6. Donc 4/6 + 1/6 = 5/6.",
    exercise: "Exercice : calcule 1/3 + 1/4. Indice : cherche un dénominateur commun à 3 et 4.",
  },
];

const fallback = {
  name: "Général",
  answer:
    "Bonne question ! Voici comment je te propose d'avancer :\n\n1. On identifie ce que l'énoncé demande exactement.\n2. On repère ce que tu sais déjà (définitions, formules du cours).\n3. On avance étape par étape, en vérifiant à chaque fois.\n\nPeux-tu me préciser la matière et la classe concernées, ou me recopier l'énoncé complet ? Je t'expliquerai pas à pas.",
  again: "D'accord, essayons autrement : dis-moi ce que tu as déjà compris, et je repars de là avec une autre approche.",
  simpler: "Version simple : lis l'énoncé, souligne les mots importants, écris ce que tu cherches, puis avance une étape à la fois.",
  example: "Voici un exemple proche : prenons un cas très concret avec des nombres simples, puis nous généraliserons ensemble.",
  exercise: "Petit exercice d'application : reformule l'énoncé avec tes propres mots, puis propose une première étape. Je te corrige ensuite.",
};

export function mockTutorReply(question: string, intent?: Intent): { topic: string; text: string } {
  const topic = topics.find((t) => t.match.test(question)) ?? fallback;
  const text = intent ? topic[intent === "explainAgain" ? "again" : intent] : topic.answer;
  return { topic: topic.name, text };
}
