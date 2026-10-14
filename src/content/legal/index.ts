/**
 * Textes juridiques — VERSIONS PROVISOIRES.
 * Ces brouillons structurent les engagements déjà implémentés techniquement (données collectées, durée de
 * conservation, suppression, mineurs). Ils devront être relus et complétés par l'entité juridique responsable
 * de SAVI (nom, adresse, contact, droit applicable) avant toute mise en production. Les parties entre crochets
 * sont à compléter.
 */
export interface LegalSection {
  title: string;
  paragraphs: string[];
}
export interface LegalDoc {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_PLACEHOLDER = "[à compléter par l'entité responsable de SAVI]";

export const terms: LegalDoc = {
  title: "Conditions d'utilisation",
  updatedAt: "2026-10-14 (brouillon)",
  intro: "Ces conditions encadrent l'utilisation de l'application SAVI. Version provisoire, en attente de validation juridique.",
  sections: [
    { title: "1. Le service", paragraphs: ["SAVI est une application d'aide à l'apprentissage : tuteur assisté par intelligence artificielle, correction de devoirs, organisation de cours, quiz et préparation aux examens.", "Les explications et corrections produites par l'intelligence artificielle sont une aide pédagogique. Elles peuvent contenir des erreurs : une note indiquée par SAVI n'a aucune valeur officielle."] },
    { title: "2. Compte", paragraphs: ["Un compte est personnel. Tu es responsable de la confidentialité de ton mot de passe.", "Si tu as moins de 15 ans, l'accord d'un parent ou d'un tuteur légal est nécessaire pour créer un compte."] },
    { title: "3. Essai gratuit et abonnement", paragraphs: ["Chaque nouveau compte bénéficie d'un essai gratuit de 4 jours, calculé à partir de la date d'inscription et affiché dans l'application.", "À la fin de l'essai, les fonctions assistées par IA nécessitent un abonnement. L'accès à tes documents, ton historique et ton profil reste possible.", `Tarifs, moyens de paiement, renouvellement et remboursement : ${LEGAL_PLACEHOLDER}.`] },
    { title: "4. Usage acceptable", paragraphs: ["Il est interdit d'utiliser SAVI pour tricher lors d'une évaluation officielle, pour harceler, ou pour tenter d'accéder aux données d'autres utilisateurs.", "Des limites d'usage raisonnables s'appliquent pour protéger le service."] },
    { title: "5. Contenus importés", paragraphs: ["Tu restes propriétaire des documents que tu importes. Tu garantis avoir le droit de les utiliser.", "SAVI les utilise uniquement pour te fournir le service (résumés, quiz, réponses en mode strict)."] },
    { title: "6. Contact", paragraphs: [`Éditeur, adresse et contact : ${LEGAL_PLACEHOLDER}.`] },
  ],
};

export const privacy: LegalDoc = {
  title: "Politique de confidentialité",
  updatedAt: "2026-10-14 (brouillon)",
  intro: "Cette politique explique quelles données SAVI collecte, pourquoi, et comment tu gardes le contrôle. Version provisoire, en attente de validation juridique.",
  sections: [
    { title: "1. Données collectées", paragraphs: ["À l'inscription : un prénom, un e-mail ou un numéro de téléphone, un mot de passe (stocké uniquement sous forme hachée), ta classe et ton pays.", "À l'usage : tes conversations avec le tuteur, les documents et photos que tu importes, tes résultats de quiz et d'examens blancs.", "Techniques : des compteurs anonymisés contre les abus (l'adresse IP n'est pas conservée en clair) et un journal de sécurité qui ne contient jamais le contenu de tes conversations."] },
    { title: "2. Ce que nous ne faisons pas", paragraphs: ["Nous ne vendons pas tes données. Nous ne demandons pas de données inutiles (pas de nom complet, d'adresse postale ni de date de naissance exacte).", "Les administrateurs de SAVI n'ont pas d'accès libre à tes conversations privées. Un accès ponctuel ne peut avoir lieu que pour une raison de sécurité ou à ta demande, et il est journalisé."] },
    { title: "3. Intelligence artificielle", paragraphs: ["Pour répondre à tes questions, le contenu nécessaire (ta question, les extraits de documents sélectionnés) est transmis à un fournisseur d'IA depuis nos serveurs. Les clés d'accès ne quittent jamais nos serveurs.", `Fournisseur(s) utilisé(s) et pays d'hébergement : ${LEGAL_PLACEHOLDER}.`] },
    { title: "4. Conservation et suppression", paragraphs: ["Tes données sont conservées tant que ton compte existe. Tu peux supprimer ton compte à tout moment depuis Profil → Supprimer mon compte : toutes tes données personnelles, conversations, documents et résultats sont alors effacés définitivement.", "Les sessions de connexion expirent automatiquement après 30 jours d'inactivité."] },
    { title: "5. Mineurs", paragraphs: ["SAVI s'adresse notamment aux élèves. Pour les moins de 15 ans, l'accord d'un parent ou tuteur est requis. Un parent peut demander la suppression du compte de son enfant."] },
    { title: "6. Tes droits et contact", paragraphs: [`Accès, rectification, suppression, opposition : écris à ${LEGAL_PLACEHOLDER}. Autorité de contrôle compétente : ${LEGAL_PLACEHOLDER} (par exemple la CIL au Burkina Faso).`] },
  ],
};

export const legalNotice: LegalDoc = {
  title: "Mentions légales",
  updatedAt: "2026-10-14 (brouillon)",
  intro: "Informations sur l'éditeur et l'hébergeur de SAVI. Version provisoire.",
  sections: [
    { title: "Éditeur", paragraphs: [`Dénomination, forme juridique, adresse, e-mail de contact : ${LEGAL_PLACEHOLDER}.`] },
    { title: "Hébergement", paragraphs: [`Hébergeur de l'application et de la base de données : ${LEGAL_PLACEHOLDER} (à renseigner après le choix d'hébergement).`] },
    { title: "Propriété intellectuelle", paragraphs: ["Le nom SAVI, le logo et l'interface sont la propriété de l'éditeur. Les contenus importés par les utilisateurs restent leur propriété."] },
  ],
};
