/**
 * DONNÉES D'EXEMPLE — étape 2 (maquettes).
 * Ces données servent uniquement à valider les écrans. Elles seront remplacées
 * par la base de données et l'API à l'étape 3. Aucune donnée réelle d'élève.
 */
import { addDays } from "./utils";

export const MOCK_NOW = new Date("2026-10-14T09:00:00Z");

export const mockUser = {
  id: "u_demo",
  firstName: "Awa",
  level: "3e",
  levelKey: "3e" as const,
  country: "BF",
  createdAt: new Date("2026-10-12T08:30:00Z"),
  uiLocale: "fr",
  answerLocale: "fr",
  questionLocale: "auto",
  theme: "system" as const,
  streakDays: 3,
  weeklyGoal: { done: 2, total: 4 },
};

export type EntitlementStatus = "trial" | "premium" | "expired";

export const mockSubscription = {
  status: "trial" as EntitlementStatus,
  trialEndsAt: addDays(mockUser.createdAt, 4),
  currentPeriodEnd: null as Date | null,
};

export const mockPricing = {
  currency: "XOF",
  monthly: 1000,
  yearly: 10000,
  confirmed: false,
  trialDays: 4,
};

export const mockSubjects = [
  { id: "maths", name: "Mathématiques", emoji: "📐", score: 72, trend: +4, chapters: 6, documents: 4 },
  { id: "francais", name: "Français", emoji: "📝", score: 84, trend: +2, chapters: 4, documents: 3 },
  { id: "pc", name: "Physique-Chimie", emoji: "⚗️", score: 48, trend: -3, chapters: 3, documents: 2 },
  { id: "svt", name: "SVT", emoji: "🌱", score: 66, trend: +6, chapters: 3, documents: 1 },
  { id: "anglais", name: "Anglais", emoji: "🇬🇧", score: 61, trend: 0, chapters: 2, documents: 1 },
  { id: "hg", name: "Histoire-Géographie", emoji: "🌍", score: 70, trend: +1, chapters: 2, documents: 2 },
];

export const mockDocuments = [
  { id: "d1", subjectId: "maths", chapter: "Théorème de Pythagore", title: "Cours Pythagore — M. Ouédraogo.pdf", pages: 6, type: "pdf" as const, status: "ready" as const, addedAt: "2026-10-12" },
  { id: "d2", subjectId: "maths", chapter: "Équations du 1er degré", title: "Photo tableau — équations.jpg", pages: 1, type: "image" as const, status: "ready" as const, addedAt: "2026-10-12" },
  { id: "d3", subjectId: "maths", chapter: "Fractions", title: "Fiche fractions.pdf", pages: 3, type: "pdf" as const, status: "ready" as const, addedAt: "2026-10-13" },
  { id: "d4", subjectId: "maths", chapter: "Statistiques", title: "Exercices stats.pdf", pages: 4, type: "pdf" as const, status: "processing" as const, addedAt: "2026-10-14" },
  { id: "d5", subjectId: "francais", chapter: "Le discours rapporté", title: "Cours discours rapporté.pdf", pages: 5, type: "pdf" as const, status: "ready" as const, addedAt: "2026-10-12" },
  { id: "d6", subjectId: "francais", chapter: "La dissertation", title: "Méthode dissertation.pdf", pages: 8, type: "pdf" as const, status: "ready" as const, addedAt: "2026-10-13" },
  { id: "d7", subjectId: "pc", chapter: "Électricité", title: "Loi d'Ohm — photo cahier.jpg", pages: 2, type: "image" as const, status: "ready" as const, addedAt: "2026-10-13" },
  { id: "d8", subjectId: "svt", chapter: "La photosynthèse", title: "Photosynthèse.pdf", pages: 4, type: "pdf" as const, status: "ready" as const, addedAt: "2026-10-13" },
];

export const mockConversations = [
  { id: "c1", title: "Théorème de Pythagore : triangle rectangle", subject: "Mathématiques", updatedAt: "Aujourd'hui", pinned: true, preview: "Dans un triangle rectangle, le carré de l'hypoténuse…" },
  { id: "c2", title: "Photosynthèse : rôle de la chlorophylle", subject: "SVT", updatedAt: "Hier", pinned: true, preview: "La chlorophylle capte l'énergie lumineuse…" },
  { id: "c3", title: "Résoudre 2x + 5 = 13", subject: "Mathématiques", updatedAt: "Hier", pinned: false, preview: "On isole x en soustrayant 5 des deux côtés…" },
  { id: "c4", title: "Discours direct et indirect", subject: "Français", updatedAt: "Il y a 3 jours", pinned: false, preview: "Au discours indirect, les temps changent…" },
];

export const mockQuizHistory = [
  { id: "q1", title: "Pythagore — bases", subject: "Mathématiques", score: 4, total: 5, date: "Aujourd'hui", durationMin: 6 },
  { id: "q2", title: "Discours rapporté", subject: "Français", score: 7, total: 8, date: "Hier", durationMin: 9 },
  { id: "q3", title: "Loi d'Ohm", subject: "Physique-Chimie", score: 3, total: 6, date: "Il y a 2 jours", durationMin: 8 },
];

export type MockQuestion =
  | { id: string; type: "mcq"; prompt: string; options: string[]; answer: number; explanation: string }
  | { id: string; type: "truefalse"; prompt: string; answer: boolean; explanation: string }
  | { id: string; type: "short"; prompt: string; accepted: string[]; explanation: string };

export const mockQuiz: { title: string; subject: string; questions: MockQuestion[] } = {
  title: "Pythagore et équations — niveau 3e",
  subject: "Mathématiques",
  questions: [
    {
      id: "1", type: "mcq",
      prompt: "Dans un triangle ABC rectangle en A, quelle égalité est vraie ?",
      options: ["AB² = AC² + BC²", "BC² = AB² + AC²", "AC² = AB² + BC²", "BC = AB + AC"],
      answer: 1,
      explanation: "L'hypoténuse est le côté opposé à l'angle droit : ici [BC]. Le théorème de Pythagore s'écrit BC² = AB² + AC².",
    },
    {
      id: "2", type: "truefalse",
      prompt: "Un triangle de côtés 3 cm, 4 cm et 5 cm est rectangle.",
      answer: true,
      explanation: "3² + 4² = 9 + 16 = 25 = 5². L'égalité de Pythagore est vérifiée, donc le triangle est rectangle (réciproque du théorème).",
    },
    {
      id: "3", type: "short",
      prompt: "Résous l'équation 2x + 5 = 13. Donne la valeur de x.",
      accepted: ["4", "x=4", "x = 4"],
      explanation: "2x + 5 = 13 ⟹ 2x = 13 − 5 = 8 ⟹ x = 8 ÷ 2 = 4.",
    },
    {
      id: "4", type: "mcq",
      prompt: "Si BC = 10 cm et AB = 6 cm dans un triangle rectangle en A, que vaut AC ?",
      options: ["4 cm", "8 cm", "16 cm", "√136 cm"],
      answer: 1,
      explanation: "AC² = BC² − AB² = 100 − 36 = 64, donc AC = √64 = 8 cm.",
    },
    {
      id: "5", type: "truefalse",
      prompt: "La solution de l'équation 3x − 1 = 2 est x = 1.",
      answer: true,
      explanation: "3x = 2 + 1 = 3, donc x = 1. On vérifie : 3 × 1 − 1 = 2. ✔",
    },
  ],
};

export const mockExamCatalogue = {
  countries: [
    { code: "BF", name: "Burkina Faso" },
    { code: "CI", name: "Côte d'Ivoire" },
    { code: "ML", name: "Mali" },
    { code: "NE", name: "Niger" },
    { code: "SN", name: "Sénégal" },
    { code: "TG", name: "Togo" },
    { code: "BJ", name: "Bénin" },
  ],
  exams: [
    { id: "cep", name: "CEP (Certificat d'études primaires)", level: "CM2" },
    { id: "bepc", name: "BEPC", level: "3e" },
    { id: "bac", name: "Baccalauréat", level: "Terminale" },
    { id: "concours-fp", name: "Concours directs de la fonction publique", level: "Concours" },
    { id: "concours-ens", name: "Concours d'entrée (ENS, ENAM, écoles de santé…)", level: "Concours" },
  ],
  subjects: ["Mathématiques", "Français", "Physique-Chimie", "SVT", "Histoire-Géographie", "Anglais", "Culture générale"],
  papers: [
    { id: "p1", exam: "BEPC", subject: "Mathématiques", year: 2024, country: "BF", minutes: 120, questions: 12, source: "Sujet d'exemple SAVI (démonstration)", verifiedAt: "2026-10-14", sample: true },
    { id: "p2", exam: "BEPC", subject: "Français", year: 2024, country: "BF", minutes: 180, questions: 8, source: "Sujet d'exemple SAVI (démonstration)", verifiedAt: "2026-10-14", sample: true },
    { id: "p3", exam: "BEPC", subject: "Mathématiques", year: 2023, country: "BF", minutes: 120, questions: 12, source: "À compléter : annale officielle + source", verifiedAt: null, sample: true },
  ],
  pastAttempts: [
    { id: "a1", title: "BEPC blanc — Mathématiques 2024", score: 11.5, total: 20, date: "Il y a 4 jours" },
  ],
};

export const mockMockExamQuestions: MockQuestion[] = [
  { id: "e1", type: "mcq", prompt: "Le PGCD de 84 et 36 est :", options: ["6", "12", "18", "24"], answer: 1, explanation: "84 = 2²×3×7 et 36 = 2²×3². PGCD = 2²×3 = 12." },
  { id: "e2", type: "short", prompt: "Développe et réduis : (x + 3)(x − 3).", accepted: ["x²-9", "x² - 9", "x^2-9", "x^2 - 9", "x²−9"], explanation: "Identité remarquable (a + b)(a − b) = a² − b², donc x² − 9." },
  { id: "e3", type: "truefalse", prompt: "√50 = 5√2.", answer: true, explanation: "50 = 25 × 2, donc √50 = √25 × √2 = 5√2." },
  { id: "e4", type: "mcq", prompt: "Dans un triangle rectangle, cos(angle) = ", options: ["opposé / hypoténuse", "adjacent / hypoténuse", "opposé / adjacent", "hypoténuse / adjacent"], answer: 1, explanation: "CAH : cosinus = côté adjacent / hypoténuse." },
];

export const mockGrading = {
  recognizedText:
    "Exercice 2 : Résoudre l'équation 3x − 7 = 2x + 5\n\nRéponse de l'élève :\n3x − 7 = 2x + 5\n3x − 2x = 5 − 7\nx = −2",
  confidence: 92,
  subject: "Mathématiques",
  steps: [
    "On regroupe les termes en x d'un côté : 3x − 2x = 5 + 7.",
    "Attention au signe : en passant −7 de l'autre côté, il devient +7 (et non −7).",
    "On obtient x = 12.",
    "Vérification : 3 × 12 − 7 = 29 et 2 × 12 + 5 = 29. ✔",
  ],
  errors: [
    { where: "Ligne 2", what: "Erreur de signe : « 5 − 7 » au lieu de « 5 + 7 ».", why: "Quand on déplace un terme d'un côté à l'autre de l'égalité, on change son signe." },
  ],
  improve: ["Vérifie toujours ta solution en la remplaçant dans l'équation de départ.", "Écris une étape par ligne pour repérer les signes plus facilement."],
  grade: { value: 2.5, outOf: 4, comment: "Méthode correcte, une erreur de signe." },
};

export const mockProgress = {
  overall: 14.2,
  strengths: ["Conjugaison et discours rapporté", "Réciproque de Pythagore", "Lecture de graphiques"],
  difficulties: ["Signes dans les équations", "Loi d'Ohm : unités", "Équilibrage des équations chimiques"],
  goals: [
    { id: "g1", title: "Atteindre 15/20 en maths au BEPC blanc", progress: 72, due: "15 déc." },
    { id: "g2", title: "4 séances de révision par semaine", progress: 50, due: "Chaque semaine" },
  ],
  revisionSessions: [
    { id: "r1", title: "Équations : chasse aux erreurs de signe", subject: "Mathématiques", minutes: 15, why: "2 erreurs de signe repérées cette semaine" },
    { id: "r2", title: "Loi d'Ohm : U = R × I avec les bonnes unités", subject: "Physique-Chimie", minutes: 10, why: "Score de 3/6 au dernier quiz" },
  ],
  weekActivity: [2, 3, 0, 4, 1, 3, 2],
  stats: { questions: 27, quizzes: 9, gradings: 4, docs: 8 },
};
