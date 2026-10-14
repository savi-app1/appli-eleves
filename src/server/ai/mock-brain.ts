/**
 * « Cerveau » SIMULÉ pour le mode démonstration (aucune clé d'API).
 *
 * Il imite le fournisseur d'IA au niveau du protocole (même interface que Claude, OpenAI…) pour que tout
 * le reste de l'application — flux de réponse, enregistrement, mode strict, quotas, quiz, corrections —
 * s'exécute exactement comme en production. Les réponses sont construites par des règles simples :
 * elles sont PLAUSIBLES mais PAS INTELLIGENTES. L'interface signale toujours ce mode à l'utilisateur.
 */
import type { LanguageModelV4CallOptions, LanguageModelV4Prompt } from "@ai-sdk/provider";
import { INTENT_INSTRUCTIONS } from "./prompts";
import { STRICT_MISSING_SENTENCE, type Grading, type QuizInput } from "./schemas";

export type MockTask = "tutor" | "summary" | "exercises" | "quiz" | "grading";

/* ----------------------------------------------------------- utilitaires */

function fold(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const STOP = new Set("avec dans pour cette comme sont elle elles nous vous leur leurs mais donc alors tout tous toute toutes plus moins entre quand est une des les que qui quoi dont sous".split(" "));
function keywords(s: string): string[] {
  return Array.from(new Set(fold(s).replace(/[^a-z0-9àâçéèêëîïôûùüÿñæœ\s]/gi, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w))));
}
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9«])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 320);
}
function textOf(part: { type: string; text?: string }): string {
  return part.type === "text" && typeof part.text === "string" ? part.text : "";
}
function systemText(prompt: LanguageModelV4Prompt): string {
  return prompt.filter((m) => m.role === "system").map((m) => m.content as string).join("\n");
}
function userTexts(prompt: LanguageModelV4Prompt): string[] {
  return prompt.filter((m) => m.role === "user").map((m) => (m.content as Array<{ type: string; text?: string }>).map(textOf).join(" ").trim());
}
function after(marker: string, text: string): string {
  const i = text.indexOf(marker);
  return i >= 0 ? text.slice(i + marker.length).trim() : text;
}
function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

/* --------------------------------------------------- banque de notions */

interface Topic {
  match: RegExp;
  name: string;
  subject: string;
  answer: string;
  explainAgain: string;
  simpler: string;
  example: string;
  exercise: string;
  quiz: QuizInput["questions"];
}

const TOPICS: Topic[] = [
  {
    match: /pythagore|hypot[eé]nuse|triangle rectangle/i,
    name: "Théorème de Pythagore",
    subject: "Mathématiques",
    answer:
      "Dans un triangle rectangle, le côté le plus long s'appelle l'**hypoténuse** : c'est celui qui est en face de l'angle droit.\n\nLe théorème de Pythagore dit :\n**(hypoténuse)² = (côté 1)² + (côté 2)²**\n\nÉtapes pour l'utiliser :\n1. Repère l'angle droit et l'hypoténuse.\n2. Écris l'égalité avec les noms des côtés.\n3. Remplace par les longueurs connues.\n4. Calcule, puis prends la racine carrée.\n\nExemple : si les deux petits côtés mesurent 3 cm et 4 cm, alors hyp² = 9 + 16 = 25, donc hyp = 5 cm.\n\nVeux-tu essayer avec un triangle de côtés 6 cm et 8 cm ?",
    explainAgain:
      "Autre façon de voir : imagine trois carrés dessinés sur les trois côtés d'un triangle rectangle. L'aire du grand carré (sur l'hypoténuse) est **exactement égale** à la somme des aires des deux petits carrés. Pythagore, c'est une histoire d'aires qui s'additionnent !\n\nAvec 3 cm et 4 cm : petits carrés de 9 cm² et 16 cm², grand carré de 25 cm², donc le grand côté mesure 5 cm.",
    simpler:
      "Version simple : dans un triangle qui a un angle droit, **grand côté × grand côté = petit côté × petit côté + autre petit côté × autre petit côté**.\n\nExemple : 3, 4 et 5 → 3 × 3 + 4 × 4 = 9 + 16 = 25 = 5 × 5. ✔",
    example:
      "Exemple : une échelle de 5 m est posée contre un mur ; son pied est à 3 m du mur. À quelle hauteur touche-t-elle le mur ?\n\n1. Le mur, le sol et l'échelle forment un triangle rectangle ; l'échelle (5 m) est l'hypoténuse.\n2. hauteur² = 5² − 3² = 25 − 9 = 16.\n3. hauteur = √16 = **4 m**.",
    exercise:
      "À toi ! Un triangle ABC est rectangle en B avec AB = 6 cm et BC = 8 cm.\n\n1. Quel est le nom de l'hypoténuse ?\n2. Calcule sa longueur.\n\nÉcris ta réponse ici, je la corrige. 😊",
    quiz: [
      { type: "mcq", prompt: "Dans un triangle ABC rectangle en A, quelle égalité est vraie ?", options: ["AB² = AC² + BC²", "BC² = AB² + AC²", "AC² = AB² + BC²", "BC = AB + AC"], answer: 1, explanation: "L'hypoténuse est le côté opposé à l'angle droit : ici [BC]. Donc BC² = AB² + AC².", topic: "Égalité de Pythagore" },
      { type: "truefalse", prompt: "Un triangle de côtés 3 cm, 4 cm et 5 cm est rectangle.", answer: true, explanation: "3² + 4² = 9 + 16 = 25 = 5² : l'égalité est vérifiée, donc le triangle est rectangle (réciproque).", topic: "Réciproque de Pythagore" },
      { type: "short", prompt: "Dans un triangle rectangle, les deux côtés de l'angle droit mesurent 6 cm et 8 cm. Combien mesure l'hypoténuse (en cm) ?", accepted: ["10", "10 cm", "10cm"], explanation: "hyp² = 36 + 64 = 100, donc hyp = √100 = 10 cm.", topic: "Calcul de l'hypoténuse" },
      { type: "mcq", prompt: "Si BC = 10 cm et AB = 6 cm dans un triangle rectangle en A, que vaut AC ?", options: ["4 cm", "8 cm", "16 cm", "√136 cm"], answer: 1, explanation: "AC² = BC² − AB² = 100 − 36 = 64, donc AC = 8 cm.", topic: "Calcul d'un côté de l'angle droit" },
      { type: "truefalse", prompt: "Le théorème de Pythagore s'applique à tous les triangles.", answer: false, explanation: "Il ne s'applique qu'aux triangles rectangles.", topic: "Conditions d'application" },
    ],
  },
  {
    match: /[ée]quation|2x|r[ée]sou/i,
    name: "Équations du premier degré",
    subject: "Mathématiques",
    answer:
      "Pour résoudre **2x + 5 = 13**, le but est d'isoler x.\n\n1. On enlève 5 des deux côtés : 2x = 13 − 5, donc 2x = 8.\n2. On divise les deux côtés par 2 : x = 8 ÷ 2 = **4**.\n3. Vérification : 2 × 4 + 5 = 13. ✔\n\nRègle d'or : ce que tu fais d'un côté du « = », tu le fais aussi de l'autre.",
    explainAgain:
      "Pense à une **balance** en équilibre : 2x + 5 d'un côté, 13 de l'autre. Si tu retires 5 d'un plateau, tu dois retirer 5 de l'autre pour garder l'équilibre : il reste 2x = 8. Puis tu partages chaque plateau en deux : x = 4.",
    simpler: "2x + 5 = 13 → j'enlève 5 : 2x = 8 → je partage par 2 : **x = 4**. C'est tout !",
    example: "Autre exemple : 3x − 4 = 11.\n1. +4 des deux côtés : 3x = 15.\n2. ÷3 : x = **5**.\nVérification : 3 × 5 − 4 = 11. ✔",
    exercise: "Exercice : résous 5x − 7 = 18.\n\nIndice : commence par ajouter 7 des deux côtés. Envoie-moi ta réponse !",
    quiz: [
      { type: "short", prompt: "Résous l'équation 2x + 5 = 13. Donne la valeur de x.", accepted: ["4", "x=4", "x = 4"], explanation: "2x = 13 − 5 = 8, donc x = 8 ÷ 2 = 4.", topic: "Résolution d'équation" },
      { type: "truefalse", prompt: "La solution de 3x − 1 = 2 est x = 1.", answer: true, explanation: "3x = 3, donc x = 1. Vérification : 3 × 1 − 1 = 2. ✔", topic: "Vérification d'une solution" },
      { type: "mcq", prompt: "Pour résoudre x − 7 = 12, que fait-on ?", options: ["On soustrait 7 des deux côtés", "On ajoute 7 des deux côtés", "On divise par 7", "On multiplie par 12"], answer: 1, explanation: "Pour isoler x, on ajoute 7 des deux côtés : x = 19.", topic: "Opérations sur une égalité" },
      { type: "mcq", prompt: "Quelle est la solution de 4x = 20 ?", options: ["x = 80", "x = 16", "x = 5", "x = 24"], answer: 2, explanation: "On divise les deux membres par 4 : x = 5.", topic: "Résolution d'équation" },
      { type: "truefalse", prompt: "Quand on fait passer un terme de l'autre côté du signe « = », il garde le même signe.", answer: false, explanation: "Il change de signe : +7 devient −7 et inversement.", topic: "Changement de signe" },
    ],
  },
  {
    match: /fraction|num[ée]rateur|d[ée]nominateur/i,
    name: "Fractions",
    subject: "Mathématiques",
    answer:
      "Une fraction, c'est une part d'un tout. Dans **3/4** : le 4 (**dénominateur**) dit en combien de parts égales on coupe, le 3 (**numérateur**) dit combien on en prend.\n\nPour additionner des fractions, il faut le **même dénominateur** :\n1/2 + 1/4 = 2/4 + 1/4 = 3/4.\n\nPour multiplier, c'est direct : 2/3 × 3/5 = 6/15 = 2/5.",
    explainAgain: "Pense à une galette coupée en 4 parts. Manger 3/4, c'est prendre 3 parts sur 4. Si tu coupes la galette en 8 à la place, 3/4 devient 6/8 : même quantité, parts plus petites. C'est pour ça qu'on peut changer de dénominateur sans changer la valeur.",
    simpler: "3/4 = 3 parts sur 4. Pour additionner des fractions, mets-les d'abord sur le **même nombre de parts**.",
    example: "Exemple : 2/3 + 1/6. On met tout en sixièmes : 2/3 = 4/6. Donc 4/6 + 1/6 = **5/6**.",
    exercise: "Exercice : calcule 1/3 + 1/4. Indice : cherche un dénominateur commun à 3 et 4.",
    quiz: [
      { type: "mcq", prompt: "Que vaut 1/2 + 1/4 ?", options: ["2/6", "3/4", "1/6", "2/4"], answer: 1, explanation: "1/2 = 2/4, donc 2/4 + 1/4 = 3/4.", topic: "Addition de fractions" },
      { type: "short", prompt: "Simplifie la fraction 6/15.", accepted: ["2/5"], explanation: "On divise numérateur et dénominateur par 3 : 6/15 = 2/5.", topic: "Simplification" },
      { type: "truefalse", prompt: "3/4 et 6/8 représentent la même quantité.", answer: true, explanation: "6/8 = (3×2)/(4×2) = 3/4.", topic: "Fractions égales" },
      { type: "mcq", prompt: "Que vaut 2/3 × 3/5 ?", options: ["5/8", "6/15", "2/5", "6/15 et 2/5 sont égaux"], answer: 3, explanation: "2/3 × 3/5 = 6/15, qui se simplifie en 2/5 : les deux écritures sont égales.", topic: "Multiplication de fractions" },
    ],
  },
  {
    match: /photosynth|chlorophylle/i,
    name: "La photosynthèse",
    subject: "SVT",
    answer:
      "La photosynthèse, c'est la façon dont les plantes fabriquent leur nourriture.\n\nGrâce à la **chlorophylle** (le pigment vert des feuilles), la plante capte la lumière du soleil et transforme :\n- de l'eau (puisée par les racines)\n- et du dioxyde de carbone (CO₂, pris dans l'air)\n\nen **glucose** (du sucre, son énergie) et en **dioxygène** (O₂), qu'elle rejette dans l'air.\n\nÉquation simplifiée : eau + CO₂ + lumière → glucose + O₂.",
    explainAgain: "Imagine la feuille comme une petite cuisine solaire : les panneaux solaires sont la chlorophylle, les ingrédients sont l'eau et le CO₂, et le plat préparé est le sucre. La « fumée » qui sort, c'est l'oxygène que nous respirons !",
    simpler: "La plante utilise la **lumière**, l'**eau** et l'**air** (CO₂) pour fabriquer son sucre, et elle rejette de l'oxygène.",
    example: "Exemple : une plante placée dans le noir pendant une semaine jaunit et s'affaiblit, car sans lumière elle ne peut plus faire de photosynthèse, donc plus fabriquer de sucre.",
    exercise: "Question : pourquoi met-on des plantes vertes dans un aquarium ? Réponds en une ou deux phrases en utilisant le mot « dioxygène ».",
    quiz: [
      { type: "mcq", prompt: "Quel pigment permet à la plante de capter la lumière ?", options: ["L'hémoglobine", "La chlorophylle", "La mélanine", "L'amidon"], answer: 1, explanation: "La chlorophylle, pigment vert des feuilles, capte l'énergie lumineuse.", topic: "Chlorophylle" },
      { type: "truefalse", prompt: "La photosynthèse rejette du dioxyde de carbone.", answer: false, explanation: "Elle consomme du CO₂ et rejette du dioxygène (O₂).", topic: "Échanges gazeux" },
      { type: "short", prompt: "Quel sucre est fabriqué par la photosynthèse ?", accepted: ["glucose", "le glucose", "du glucose"], explanation: "La plante fabrique du glucose à partir d'eau et de CO₂ grâce à la lumière.", topic: "Produits de la photosynthèse" },
      { type: "mcq", prompt: "Où la plante puise-t-elle l'eau nécessaire ?", options: ["Dans l'air par les feuilles", "Dans le sol par les racines", "Dans la lumière", "Dans le CO₂"], answer: 1, explanation: "Les racines absorbent l'eau et les sels minéraux du sol.", topic: "Rôle des racines" },
    ],
  },
  {
    match: /discours (direct|indirect|rapport)|rapport[ée]/i,
    name: "Le discours rapporté",
    subject: "Français",
    answer:
      "Le **discours direct** rapporte les paroles telles quelles, entre guillemets : Awa dit : « Je viendrai demain. »\n\nLe **discours indirect** les intègre dans la phrase, sans guillemets, avec un mot de liaison : Awa dit qu'elle viendra le lendemain.\n\nAu passage à l'indirect, trois choses changent :\n1. les **pronoms** (je → elle) ;\n2. les **temps** si le verbe introducteur est au passé (présent → imparfait, futur → conditionnel) ;\n3. les **repères de temps** (demain → le lendemain, hier → la veille).",
    explainAgain: "Imagine que tu racontes à ta mère ce que ton ami a dit. Tu ne répètes pas mot pour mot avec sa voix (discours direct) : tu reformules à ta manière (discours indirect), donc « je » devient « il », et « demain » devient « le lendemain » parce que le moment a changé.",
    simpler: "Direct = on recopie les paroles entre guillemets. Indirect = on les raconte avec « que », en changeant les pronoms et parfois les temps.",
    example: "Direct : Issa a dit : « J'ai fini mes devoirs hier. »\nIndirect : Issa a dit qu'il avait fini ses devoirs la veille.\n(passé composé → plus-que-parfait ; hier → la veille ; je → il)",
    exercise: "Transforme au discours indirect : Le professeur a annoncé : « Nous ferons un contrôle demain. »",
    quiz: [
      { type: "mcq", prompt: "Au discours indirect, « demain » devient :", options: ["aujourd'hui", "le lendemain", "la veille", "hier"], answer: 1, explanation: "Les repères de temps changent : demain → le lendemain.", topic: "Repères temporels" },
      { type: "truefalse", prompt: "Au discours indirect, on garde les guillemets.", answer: false, explanation: "Les guillemets disparaissent ; les paroles sont intégrées à la phrase avec « que ».", topic: "Ponctuation du discours rapporté" },
      { type: "short", prompt: "Complète : Elle a dit : « Je suis fatiguée. » → Elle a dit qu'elle ... fatiguée.", accepted: ["était", "etait"], explanation: "Verbe introducteur au passé : le présent devient imparfait.", topic: "Concordance des temps" },
    ],
  },
];

const GENERIC_QUIZ: QuizInput["questions"] = [
  { type: "mcq", prompt: "Avant de résoudre un exercice, la première chose à faire est :", options: ["Écrire le résultat", "Lire tout l'énoncé et souligner ce qui est demandé", "Demander la réponse", "Recopier le cours"], answer: 1, explanation: "Comprendre la question évite la majorité des erreurs.", topic: "Méthode de travail" },
  { type: "truefalse", prompt: "Vérifier sa réponse en la remplaçant dans l'énoncé est une perte de temps.", answer: false, explanation: "La vérification permet de repérer les erreurs de calcul et de signe.", topic: "Vérification" },
  { type: "short", prompt: "Combien font 7 × 8 ?", accepted: ["56"], explanation: "7 × 8 = 56.", topic: "Calcul mental" },
  { type: "mcq", prompt: "Pour réviser efficacement, il vaut mieux :", options: ["Relire une fois la veille", "Réviser un peu chaque jour et se tester", "Apprendre par cœur sans comprendre", "Ne réviser que les matières faciles"], answer: 1, explanation: "La répétition espacée et l'auto-test sont les méthodes les plus efficaces.", topic: "Méthode de révision" },
];

function topicFor(text: string): Topic | undefined {
  return TOPICS.find((t) => t.match.test(text));
}

const GENERIC_ANSWER =
  "Bonne question ! Voici comment je te propose d'avancer :\n\n1. On identifie ce que l'énoncé demande exactement.\n2. On repère ce que tu sais déjà (définitions, formules du cours).\n3. On avance étape par étape, en vérifiant à chaque fois.\n\nPeux-tu me préciser la matière et la classe concernées, ou me recopier l'énoncé complet ? Je t'expliquerai pas à pas.";

/* ------------------------------------------------------------ tâches */

function tutorAnswer(prompt: LanguageModelV4Prompt): string {
  const system = systemText(prompt);
  const users = userTexts(prompt);
  const last = users[users.length - 1] ?? "";
  const intent = (Object.keys(INTENT_INSTRUCTIONS) as Array<keyof typeof INTENT_INSTRUCTIONS>).find((k) => INTENT_INSTRUCTIONS[k] === last);
  const question = intent ? [...users].reverse().find((u) => !Object.values(INTENT_INSTRUCTIONS).includes(u)) ?? "" : last;

  if (system.includes("MODE STRICT ACTIVÉ")) {
    const extracts = Array.from(system.matchAll(/\[(\d+)\] Source : (.*)\n([\s\S]*?)(?=\n\n\[\d+\] Source : |$)/g)).map((m) => ({ n: Number(m[1]), title: m[2], text: m[3].trim() }));
    const kws = keywords(question);
    const hits: { n: number; sentence: string }[] = [];
    for (const ex of extracts) {
      for (const s of sentences(ex.text)) {
        const score = kws.filter((k) => fold(s).includes(k)).length;
        if (score >= Math.max(1, Math.min(2, Math.floor(kws.length / 2)))) hits.push({ n: ex.n, sentence: s });
      }
    }
    if (hits.length === 0) {
      return `${STRICT_MISSING_SENTENCE}\n\nJ'ai cherché dans ${extracts.length || "tes"} extrait(s) sélectionné(s) sans trouver de passage sur « ${question.slice(0, 80)} ». Tu peux ajouter le chapitre concerné à tes cours, ou désactiver le mode strict pour une explication générale.`;
    }
    const top = pick(hits, 3);
    return `D'après tes documents :\n\n${top.map((h) => `- « ${h.sentence} » [${h.n}]`).join("\n")}\n\nEn résumé : ${top[0].sentence.replace(/\.$/, "")} — c'est la règle à retenir [${top[0].n}].\n\nVeux-tu que je te pose une question pour vérifier que c'est acquis ?`;
  }

  const topic = topicFor(question);
  if (intent) {
    if (topic) return topic[intent];
    return {
      explainAgain: "D'accord, essayons autrement : dis-moi ce que tu as déjà compris et je repars de là avec une autre approche (un schéma décrit en mots ou un exemple de la vie courante).",
      simpler: "Version simple : lis l'énoncé, souligne les mots importants, écris ce que tu cherches, puis avance **une étape à la fois**.",
      example: "Prenons un exemple très concret avec des nombres simples : au marché, 3 mangues coûtent 150 FCFA ; combien coûtent 5 mangues ? 150 ÷ 3 = 50 FCFA la mangue, donc 5 × 50 = 250 FCFA. On généralise ensuite.",
      exercise: "Petit exercice : reformule l'énoncé avec tes propres mots, puis propose une première étape. Envoie-moi ta réponse, je la corrige.",
    }[intent];
  }
  return topic ? topic.answer : GENERIC_ANSWER;
}

function summaryText(prompt: LanguageModelV4Prompt): string {
  const body = after("Document :", userTexts(prompt).join("\n"));
  const sents = sentences(body);
  const kws = pick(keywords(body).filter((k) => k.length >= 6), 8);
  const essentials = pick(sents, 6);
  return [
    "**L'essentiel**",
    ...(essentials.length ? essentials.map((s) => `- ${s}`) : ["- Le document ne contient pas assez de texte lisible pour une fiche détaillée."]),
    "",
    "**Définitions et mots-clés**",
    ...(kws.length ? kws.map((k) => `- **${k}**`) : ["- (aucun mot-clé détecté)"]),
    "",
    "**Formules, règles ou dates à retenir**",
    ...pick(sents.filter((s) => /\d|=|règle|théorème|loi|définition/i.test(s)), 3).map((s) => `- ${s}`),
    "",
    "**Pièges fréquents**",
    "- Confondre les notions voisines : relis les définitions ci-dessus.",
    "- Oublier de vérifier les conditions d'application d'une règle.",
    "",
    "**Pour t'auto-tester**",
    ...pick(sents, 3).map((s, i) => `${i + 1}. Explique avec tes mots : « ${s.slice(0, 90)}${s.length > 90 ? "…" : ""} »`),
  ].join("\n");
}

function exercisesText(prompt: LanguageModelV4Prompt): string {
  const body = after("Document :", userTexts(prompt).join("\n"));
  const sents = sentences(body);
  const s = (i: number) => sents[i % Math.max(1, sents.length)] ?? "la notion principale du document";
  return [
    `**Exercice 1 (facile)** — Recopie et complète avec tes mots : « ${s(0)} » Explique chaque terme important.`,
    `**Exercice 2 (moyen)** — Vrai ou faux ? Justifie : « ${s(1)} »`,
    `**Exercice 3 (moyen)** — Donne un exemple concret de ta vie quotidienne qui illustre : « ${s(2)} »`,
    `**Exercice 4 (difficile)** — Un camarade affirme le contraire de : « ${s(3)} ». Rédige une réponse argumentée pour le convaincre, en t'appuyant sur le cours.`,
    "",
    "**Corrigés**",
    `1. Les mots importants sont : ${pick(keywords(s(0)), 4).join(", ") || "ceux de la définition"}. Une bonne réponse les reprend dans une phrase complète.`,
    `2. Vrai : c'est exactement ce qu'affirme le document.`,
    `3. Tout exemple cohérent avec l'énoncé est accepté : l'essentiel est de nommer la notion et de montrer le lien.`,
    `4. Rappelle la règle du cours, donne un exemple, puis montre pourquoi l'affirmation contraire mène à une contradiction.`,
  ].join("\n");
}

function quizFromText(body: string, count: number): QuizInput["questions"] {
  const sents = sentences(body);
  const kwsAll = keywords(body).filter((k) => k.length >= 6);
  const out: QuizInput["questions"] = [];
  let i = 0;
  while (out.length < count && i < sents.length) {
    const s = sents[i++];
    const kws = keywords(s).filter((k) => k.length >= 6);
    const kind = out.length % 3;
    if (kind === 0 && kws.length) {
      const word = kws[0];
      const original = s.match(new RegExp(`\\p{L}*${word}\\p{L}*`, "iu"))?.[0] ?? word;
      const distractors = kwsAll.filter((k) => k !== word).slice(0, 3);
      if (distractors.length >= 2) {
        const options = [original, ...distractors].slice(0, 4);
        const shuffled = [...options].sort((a, b) => fold(a).localeCompare(fold(b)));
        out.push({ type: "mcq", prompt: `Quel mot complète la phrase : « ${s.replace(original, "______")} »`, options: shuffled, answer: shuffled.indexOf(original), explanation: `Le document dit : « ${s} »`, topic: original });
        continue;
      }
    }
    if (kind === 1) {
      const nums = s.match(/\d+/g);
      if (nums && out.length % 2 === 0) {
        const n = nums[0];
        const altered = s.replace(n, String(Number(n) + (Number(n) > 10 ? 7 : 2)));
        out.push({ type: "truefalse", prompt: altered, answer: false, explanation: `Faux : le document indique « ${s} »`, topic: kws[0] ?? "Lecture du cours" });
      } else {
        out.push({ type: "truefalse", prompt: s, answer: true, explanation: `Vrai : c'est exactement ce qu'indique le document.`, topic: kws[0] ?? "Lecture du cours" });
      }
      continue;
    }
    if (kws.length) {
      const word = kws[kws.length - 1];
      const original = s.match(new RegExp(`\\p{L}*${word}\\p{L}*`, "iu"))?.[0] ?? word;
      out.push({ type: "short", prompt: `Complète avec le mot manquant : « ${s.replace(original, "______")} »`, accepted: [original, word], explanation: `Le document dit : « ${s} »`, topic: original });
    }
  }
  return out;
}

function quizJson(prompt: LanguageModelV4Prompt): QuizInput {
  const user = userTexts(prompt).join("\n");
  const count = Math.min(20, Math.max(3, Number(user.match(/quiz de (\d+) questions/)?.[1] ?? 5)));
  const subject = user.match(/questions en ([^\n]+?) sur le thème/)?.[1]?.trim() ?? "Matière";
  const topicName = user.match(/sur le thème « ([^»]+) »/)?.[1]?.trim() ?? "Révision";
  const docIdx = user.indexOf("(document de l'élève) :");
  let questions: QuizInput["questions"] = [];
  if (docIdx >= 0) questions = quizFromText(user.slice(docIdx + 24), count);
  if (questions.length < Math.min(3, count)) {
    const t = topicFor(`${topicName} ${subject}`);
    questions = [...questions, ...(t ? t.quiz : GENERIC_QUIZ)];
  }
  while (questions.length < count) questions = [...questions, ...GENERIC_QUIZ];
  return { title: `${topicName} — ${subject}`, subject, questions: questions.slice(0, count) };
}

function solveLinear(text: string): { a: number; b: number; c: number; x: number } | null {
  const m = text.replace(/−|–/g, "-").match(/(-?\d*)\s*x\s*([+-])\s*(\d+)\s*=\s*(-?\d+)(?!\s*x)/);
  if (!m) return null;
  const a = m[1] === "" || m[1] === "-" ? (m[1] === "-" ? -1 : 1) : Number(m[1]);
  const b = (m[2] === "-" ? -1 : 1) * Number(m[3]);
  const c = Number(m[4]);
  if (a === 0) return null;
  return { a, b, c, x: (c - b) / a };
}

function gradingJson(prompt: LanguageModelV4Prompt): Grading {
  const user = userTexts(prompt).join("\n");
  const hasScale = /l'élève indique que le devoir est noté/.test(user);
  const outOf = Number(user.match(/noté sur (\d+)/)?.[1] ?? 20);
  const text = after("Devoir :", user).trim();
  const subject = user.match(/matière indiquée : ([^)]+)\)/)?.[1] ?? (/\d\s*x|équation|triangle|fraction/i.test(text) ? "Mathématiques" : "Non précisée");
  const demo = "Mode démonstration : analyse produite par des règles simples, pas par une IA. Branche une clé d'API pour une vraie correction.";

  if (/3x\s*-\s*7\s*=\s*2x\s*\+\s*5/.test(text.replace(/−|–/g, "-"))) {
    return {
      transcription: text,
      subject: "Mathématiques",
      summary: "Résoudre l'équation du premier degré 3x − 7 = 2x + 5.",
      steps: ["On regroupe les x d'un côté : 3x − 2x = 5 + 7.", "Attention au signe : −7 qui change de côté devient +7.", "On obtient x = 12.", "Vérification : 3 × 12 − 7 = 29 et 2 × 12 + 5 = 29. ✔"],
      errors: [{ where: "Ligne 2", what: "« 5 − 7 » au lieu de « 5 + 7 ».", why: "Quand on déplace un terme de l'autre côté de l'égalité, on change son signe." }],
      improve: ["Vérifie toujours ta solution en la remplaçant dans l'équation de départ.", "Écris une seule opération par ligne pour repérer les signes."],
      grade: hasScale ? { value: Math.round(outOf * 0.6 * 2) / 2, outOf, comment: "Méthode correcte, une erreur de signe." } : null,
      confidence: 92,
    };
  }
  const lin = solveLinear(text);
  if (lin) {
    const studentX = text.replace(/−|–/g, "-").match(/x\s*=\s*(-?\d+(?:[.,]\d+)?)\s*$/m)?.[1];
    const sx = studentX ? Number(studentX.replace(",", ".")) : null;
    const ok = sx !== null && Math.abs(sx - lin.x) < 1e-9;
    const sign = lin.b >= 0 ? "−" : "+";
    return {
      transcription: text,
      subject: "Mathématiques",
      summary: `Résoudre l'équation ${lin.a}x ${lin.b >= 0 ? "+" : "−"} ${Math.abs(lin.b)} = ${lin.c}.`,
      steps: [`On isole le terme en x : ${lin.a}x = ${lin.c} ${sign} ${Math.abs(lin.b)} = ${lin.c - lin.b}.`, `On divise par ${lin.a} : x = ${lin.c - lin.b} ÷ ${lin.a} = ${lin.x}.`, `Vérification : ${lin.a} × ${lin.x} ${lin.b >= 0 ? "+" : "−"} ${Math.abs(lin.b)} = ${lin.c}. ✔`],
      errors: ok || sx === null ? [] : [{ where: "Résultat final", what: `x = ${sx} au lieu de x = ${lin.x}.`, why: "Revois l'ordre des opérations : d'abord on déplace le nombre seul (en changeant son signe), ensuite on divise par le coefficient de x." }],
      improve: ["Écris une étape par ligne.", "Remplace ta valeur dans l'équation de départ pour vérifier."].concat(sx === null ? [`Je n'ai pas trouvé ta réponse finale sous la forme « x = … » ; écris-la clairement.`] : []),
      grade: hasScale ? { value: ok ? outOf : Math.round(outOf * 0.4 * 2) / 2, outOf, comment: ok ? "Résolution correcte." : "La méthode est engagée mais le résultat est faux." } : null,
      confidence: 80,
    };
  }
  return {
    transcription: text || "(aucun texte lisible)",
    subject,
    summary: text ? `${demo} Exercice à analyser : « ${text.slice(0, 120)}${text.length > 120 ? "…" : ""} »` : demo,
    steps: ["Lis l'énoncé en entier et souligne ce qui est demandé.", "Repère les données et la notion du cours concernée.", "Rédige la résolution une étape par ligne, puis vérifie le résultat."],
    errors: [],
    improve: ["Présente clairement la réponse finale.", "Indique les unités et justifie chaque étape."],
    grade: null,
    confidence: text.length > 40 ? 55 : 20,
  };
}

/* --------------------------------------------------------------- entrée */

export function detectTask(options: LanguageModelV4CallOptions): MockTask {
  const hinted = (options.providerOptions as { savi?: { task?: MockTask } } | undefined)?.savi?.task;
  if (hinted) return hinted;
  const user = userTexts(options.prompt).join("\n");
  if (/Corrige le devoir d'élève/.test(user)) return "grading";
  if (/Génère un quiz/.test(user)) return "quiz";
  if (/fiche de révision/.test(user)) return "summary";
  if (/4 exercices progressifs/.test(user)) return "exercises";
  return "tutor";
}

/** Produit la réponse simulée : texte (tuteur, fiche, exercices) ou JSON (quiz, correction). */
export function mockAnswer(options: LanguageModelV4CallOptions): string {
  const task = detectTask(options);
  switch (task) {
    case "quiz":
      return JSON.stringify(quizJson(options.prompt));
    case "grading":
      return JSON.stringify(gradingJson(options.prompt));
    case "summary":
      return summaryText(options.prompt);
    case "exercises":
      return exercisesText(options.prompt);
    default:
      return tutorAnswer(options.prompt);
  }
}
