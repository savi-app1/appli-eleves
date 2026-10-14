/**
 * Catalogue des examens et concours (sélection pays / examen / matière / niveau).
 * Les sujets officiels seront ajoutés après validation des sources par pays (provenance + date de vérification).
 * Pour l'instant, SAVI propose des examens blancs générés dans l'esprit de l'examen choisi (clairement signalés).
 */
export const EXAM_COUNTRIES = [
  { code: "BF", name: "Burkina Faso" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "ML", name: "Mali" },
  { code: "NE", name: "Niger" },
  { code: "SN", name: "Sénégal" },
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Bénin" },
] as const;

export const EXAMS = [
  { id: "cep", name: "CEP", fullName: "CEP (Certificat d'études primaires)", level: "CM2", minutes: 60, questions: 10 },
  { id: "bepc", name: "BEPC", fullName: "BEPC", level: "3e", minutes: 90, questions: 12 },
  { id: "bac", name: "Baccalauréat", fullName: "Baccalauréat", level: "Terminale", minutes: 120, questions: 15 },
  { id: "concours-fp", name: "Concours fonction publique", fullName: "Concours directs de la fonction publique", level: "Concours", minutes: 60, questions: 15 },
  { id: "concours-ens", name: "Concours d'entrée", fullName: "Concours d'entrée (ENS, ENAM, écoles de santé…)", level: "Concours", minutes: 60, questions: 15 },
] as const;

export const EXAM_SUBJECTS = ["Mathématiques", "Français", "Physique-Chimie", "SVT", "Histoire-Géographie", "Anglais", "Culture générale"] as const;

export type ExamId = (typeof EXAMS)[number]["id"];
