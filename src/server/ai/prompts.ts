import { LOCALE_INFO, type Locale } from "@/i18n/config";
import { STRICT_MISSING_SENTENCE, type SourceRef } from "./schemas";

export type Intent = "explainAgain" | "simpler" | "example" | "exercise";

export interface LearnerProfile {
  firstName: string;
  level: string;
  country: string;
  answerLocale: string;
  alsoFrench: boolean;
}

const LEVEL_LABELS: Record<string, string> = {
  primaire: "école primaire (CP à CM2)",
  "6e": "classe de 6e",
  "5e": "classe de 5e",
  "4e": "classe de 4e",
  "3e": "classe de 3e (préparation du BEPC)",
  "2nde": "classe de seconde",
  "1ere": "classe de première",
  tle: "classe de terminale (préparation du baccalauréat)",
  superieur: "enseignement supérieur",
  concours: "préparation d'un concours (fonction publique, grandes écoles)",
};

const COUNTRY_LABELS: Record<string, string> = {
  BF: "Burkina Faso", CI: "Côte d'Ivoire", ML: "Mali", NE: "Niger", SN: "Sénégal", TG: "Togo", BJ: "Bénin", GN: "Guinée", CM: "Cameroun", GH: "Ghana", NG: "Nigeria",
};

export function levelLabel(level: string) {
  return LEVEL_LABELS[level] ?? level;
}

function languageInstruction(answerLocale: string, alsoFrench: boolean): string {
  const info = LOCALE_INFO[answerLocale as Locale];
  if (!info || answerLocale === "fr") return "Réponds en français, dans un registre simple et correct.";
  const base = `Réponds en ${info.frenchName} (${info.nativeName}).`;
  if (info.status === "beta") {
    return `${base} Cette langue est en phase de test : utilise des phrases courtes, un vocabulaire courant, et si une notion technique n'a pas d'équivalent usuel, garde le terme français entre parenthèses.${
      alsoFrench ? " Après ta réponse, ajoute une section « En français : » avec la même explication en français." : ""
    }`;
  }
  return `${base}${alsoFrench ? " Ajoute ensuite une courte version en français." : ""}`;
}

/** Consignes communes à toutes les tâches pédagogiques. */
function baseRules(profile: LearnerProfile): string {
  return [
    `Tu es SAVI, un tuteur bienveillant et rigoureux pour les élèves, étudiants et candidats aux examens d'Afrique de l'Ouest.`,
    `L'élève s'appelle ${profile.firstName}, est en ${levelLabel(profile.level)} au ${COUNTRY_LABELS[profile.country] ?? profile.country}. Adapte le vocabulaire, la profondeur et les exemples à ce niveau et au programme francophone (BEPC, baccalauréat, concours).`,
    languageInstruction(profile.answerLocale, profile.alsoFrench),
    `Méthode : explique pas à pas, commence par l'idée essentielle, puis les étapes numérotées, puis un exemple concret tiré du quotidien (marché, FCFA, football, agriculture, transport…). Termine, quand c'est utile, par une courte question pour vérifier la compréhension.`,
    `Forme : paragraphes courts, listes numérotées pour les étapes, **gras** pour les mots-clés. Pas de LaTeX ni de code : écris les maths en texte (x², √25, 3/4, 2 × 5, 10 ÷ 2).`,
    `Honnêteté : si tu n'es pas sûr, dis-le. Ne donne jamais une note officielle. N'invente pas de sources, de dates d'examen ni de références de programme.`,
    `Sécurité : pas de conseils médicaux, juridiques ou financiers ; si l'élève exprime une détresse, encourage-le à parler à un adulte de confiance. Ne demande jamais d'informations personnelles.`,
  ].join("\n");
}

export function tutorSystemPrompt(profile: LearnerProfile, opts: { strict: boolean; sources: SourceRef[] }): string {
  const parts = [baseRules(profile)];
  if (opts.strict) {
    parts.push(
      `MODE STRICT ACTIVÉ. Tu dois répondre UNIQUEMENT à partir des extraits des documents de l'élève ci-dessous. Règles :`,
      `1. Si la réponse se trouve dans les extraits, réponds en t'appuyant dessus et cite les extraits utilisés avec leur numéro entre crochets, par exemple [1] ou [2].`,
      `2. Si la réponse ne s'y trouve pas, écris exactement la phrase : « ${STRICT_MISSING_SENTENCE} » puis, si c'est pertinent, dis en une phrase ce que l'élève pourrait chercher dans son cours. N'ajoute aucune connaissance extérieure.`,
      `3. Ne mélange jamais le contenu des extraits avec des informations venant d'ailleurs.`,
      opts.sources.length
        ? `Extraits disponibles :\n${opts.sources.map((s) => `[${s.n}] Source : ${s.title.replace(/\s+/g, " ")}${s.page ? ` — page ${s.page}` : ""}\n${s.excerpt}`).join("\n\n")}`
        : `Aucun extrait pertinent n'a été trouvé dans les documents sélectionnés pour cette question : applique la règle 2.`,
    );
  }
  return parts.join("\n\n");
}

export const INTENT_INSTRUCTIONS: Record<Intent, string> = {
  explainAgain: "Explique-moi autrement ta dernière réponse : utilise une approche différente (une analogie concrète, un schéma décrit avec des mots, ou la démarche inverse). Ne répète pas la même formulation.",
  simpler: "Réexplique la même chose de façon plus simple : phrases courtes, vocabulaire plus facile, un seul exemple très concret, sans perdre l'essentiel.",
  example: "Donne-moi un exemple concret et détaillé, résolu étape par étape, en lien avec ta dernière explication.",
  exercise: "Propose-moi un exercice d'application adapté à mon niveau, sans la solution. Dis-moi de t'envoyer ma réponse pour que tu la corriges.",
};

export function summaryPrompt(profile: LearnerProfile, title: string, text: string): { system: string; prompt: string } {
  return {
    system: baseRules(profile),
    prompt: `Rédige une fiche de révision à partir du document « ${title} » ci-dessous. Utilise UNIQUEMENT le contenu du document. Structure attendue :\n**L'essentiel** (5 à 8 points)\n**Définitions et mots-clés**\n**Formules, règles ou dates à retenir** (si présentes)\n**Pièges fréquents**\n**Pour t'auto-tester** (3 questions, sans les réponses)\n\nDocument :\n${text}`,
  };
}

export function exercisesPrompt(profile: LearnerProfile, title: string, text: string): { system: string; prompt: string } {
  return {
    system: baseRules(profile),
    prompt: `À partir du document « ${title} » ci-dessous, crée 4 exercices progressifs (du plus facile au plus difficile) adaptés au niveau de l'élève. Numérote-les, donne des énoncés complets et précis, puis une section séparée **Corrigés** avec la résolution détaillée de chaque exercice. Utilise uniquement les notions présentes dans le document.\n\nDocument :\n${text}`,
  };
}

export function quizPrompt(
  profile: LearnerProfile,
  opts: { subject: string; topic: string; count: number; text?: string; exam?: { name: string; minutes: number } },
): { system: string; prompt: string } {
  const source = opts.text
    ? `Base-toi UNIQUEMENT sur le texte suivant (document de l'élève) :\n${opts.text}`
    : `Base-toi sur le programme officiel de ${levelLabel(profile.level)} pour cette matière.`;
  const exam = opts.exam
    ? `Il s'agit d'un EXAMEN BLANC de type ${opts.exam.name} (durée ${opts.exam.minutes} min) : respecte le format et le niveau d'exigence habituels de cette épreuve, et varie les compétences évaluées.`
    : "";
  return {
    system: baseRules(profile),
    prompt: `Génère un quiz de ${opts.count} questions en ${opts.subject} sur le thème « ${opts.topic} ». ${exam}
Mélange les types : QCM (4 options, une seule bonne réponse, index 0 à 3), vrai/faux, et réponses courtes (donne plusieurs variantes acceptées : avec/sans unité, avec/sans « x = »).
Chaque question doit avoir une explication pédagogique courte qui permet de comprendre la bonne réponse. Renseigne « topic » avec la notion précise évaluée (2 à 4 mots). Les questions doivent être correctes, sans ambiguïté, et de difficulté adaptée au niveau de l'élève.
${source}`,
  };
}

export function gradingPrompt(profile: LearnerProfile, opts: { text: string; subject?: string; hasScale: boolean; outOf?: number }): { system: string; prompt: string } {
  return {
    system: baseRules(profile),
    prompt: `Corrige le devoir d'élève ci-dessous${opts.subject ? ` (matière indiquée : ${opts.subject})` : ""}.
1. transcription : retranscris fidèlement l'énoncé et la production de l'élève (corrige seulement les fautes évidentes de lecture).
2. summary : ce que demande l'exercice.
3. steps : la résolution correcte, étape par étape, telle qu'on l'attendrait d'un bon élève de ce niveau.
4. errors : chaque erreur de l'élève (where = ligne ou étape, what = l'erreur, why = la règle oubliée), liste vide s'il n'y en a pas.
5. improve : 2 ou 3 conseils concrets.
6. grade : ${
      opts.hasScale
        ? `l'élève indique que le devoir est noté${opts.outOf ? ` sur ${opts.outOf}` : ""} : donne une note INDICATIVE cohérente avec un barème raisonnable (outOf = ${opts.outOf ?? "le total du barème visible, sinon 20"}) et un commentaire d'une phrase.`
        : "aucun barème n'est fourni : mets grade à null (ne note pas)."
    }
7. confidence : ta confiance dans la lecture du devoir (0 à 100).

Devoir :
${opts.text}`,
  };
}
