/**
 * Schéma PostgreSQL de SAVI (Drizzle ORM).
 *
 * Règles :
 *  - toute table de données personnelles porte `userId` ; les services filtrent TOUJOURS par l'utilisateur de la session ;
 *  - les identifiants sont des UUID générés côté base ;
 *  - les dates sont en `timestamptz` ;
 *  - aucune colonne ne stocke de secret en clair (mots de passe et jetons de session sont hachés).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ Comptes */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    firstName: text("first_name").notNull(),
    level: text("level").notNull().default("3e"),
    country: text("country").notNull().default("BF"),
    role: text("role", { enum: ["student", "admin"] }).notNull().default("student"),
    uiLocale: text("ui_locale").notNull().default("fr"),
    questionLocale: text("question_locale").notNull().default("auto"),
    answerLocale: text("answer_locale").notNull().default("fr"),
    alsoFrench: boolean("also_french").notNull().default(true),
    theme: text("theme", { enum: ["light", "dark", "system"] }).notNull().default("system"),
    /** Année de naissance facultative : uniquement pour adapter l'expérience des mineurs. */
    birthYear: integer("birth_year"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email).where(sql`${t.email} IS NOT NULL`),
    uniqueIndex("users_phone_unique").on(t.phone).where(sql`${t.phone} IS NOT NULL`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 du jeton remis au navigateur : le jeton lui-même n'est jamais stocké. */
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sessions_token_hash_unique").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------- Abonnements */

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["trial", "active", "expired", "cancelled"] }).notNull().default("trial"),
  /** Calculée côté serveur à l'inscription : now() + TRIAL_DAYS. */
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
  plan: text("plan", { enum: ["monthly", "yearly"] }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  provider: text("provider"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const payments = pgTable(
  "payments",
  {
    id: id(),
    /** Null après suppression du compte : la trace comptable (sans donnée personnelle) est conservée. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    provider: text("provider").notNull(),
    /** Référence SAVI communiquée au prestataire et à l'élève (ex. SAVI-7K3M9PQ2). */
    reference: text("reference").notNull().unique(),
    /** Identifiant de transaction chez le prestataire (égal à la référence tant qu'il est inconnu). */
    providerRef: text("provider_ref").notNull(),
    plan: text("plan", { enum: ["monthly", "yearly"] }).notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("XOF"),
    status: text("status", { enum: ["pending", "confirmed", "failed", "refunded"] }).notNull().default("pending"),
    /** Numéro de transaction déclaré par l'élève (paiement par lien, confirmation manuelle). */
    payerNote: text("payer_note"),
    declaredAt: timestamp("declared_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    /** Extrait minimal de la notification vérifiée (statut, montant, identifiant) — jamais de donnée personnelle. */
    rawPayload: jsonb("raw_payload"),
    /** Administrateur ayant confirmé manuellement, le cas échéant. */
    confirmedBy: uuid("confirmed_by"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    /** Fin de période Premium résultant de ce paiement. */
    periodEnd: timestamp("period_end", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("payments_provider_ref_unique").on(t.provider, t.providerRef), index("payments_user_idx").on(t.userId), index("payments_status_idx").on(t.status)],
);

/* ------------------------------------------------- Sécurité, quotas, audit */

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});

export const usageCounters = pgTable(
  "usage_counters",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    kind: text("kind").notNull(), // tutor_messages | gradings | uploads_mb | quiz_generations…
    count: integer("count").notNull().default(0),
  },
  (t) => [uniqueIndex("usage_counters_unique").on(t.userId, t.day, t.kind)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // auth.register | auth.login | auth.logout | account.delete | payment.confirmed…
    meta: jsonb("meta"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_user_idx").on(t.userId)],
);

/* --------------------------------------------------------- Contenu élève */

export const subjects = pgTable(
  "subjects",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    emoji: text("emoji").notNull().default("📘"),
    createdAt: createdAt(),
  },
  (t) => [index("subjects_user_idx").on(t.userId)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subject: text("subject"),
    pinned: boolean("pinned").notNull().default(false),
    strictMode: boolean("strict_mode").notNull().default(false),
    documentIds: jsonb("document_ids").$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("conversations_user_idx").on(t.userId, t.updatedAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: text("content").notNull(),
    questionLocale: text("question_locale"),
    answerLocale: text("answer_locale"),
    model: text("model"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    /** Sources citées en mode strict : [{documentId, chunkId, page}] */
    sources: jsonb("sources"),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    chapter: text("chapter"),
    title: text("title").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    pages: integer("pages"),
    status: text("status", { enum: ["processing", "ready", "failed"] }).notNull().default("processing"),
    failureReason: text("failure_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("documents_user_idx").on(t.userId, t.createdAt)],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: id(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    page: integer("page"),
    content: text("content").notNull(),
    /** Index plein texte français, maintenu automatiquement par PostgreSQL. */
    tsv: tsvector("tsv").generatedAlwaysAs((): ReturnType<typeof sql> => sql`to_tsvector('french_unaccent', content)`),
  },
  (t) => [index("chunks_document_idx").on(t.documentId, t.idx), index("chunks_tsv_idx").using("gin", t.tsv)],
);

/** Contenus générés à partir d'un document (fiche de révision, exercices) — conservés pour relecture hors connexion coûteuse. */
export const documentOutputs = pgTable(
  "document_outputs",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["summary", "exercises"] }).notNull(),
    content: text("content").notNull(),
    model: text("model"),
    createdAt: createdAt(),
  },
  (t) => [index("document_outputs_doc_idx").on(t.documentId, t.kind, t.createdAt)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subject: text("subject"),
    storageKey: text("storage_key"),
    mime: text("mime"),
    recognizedText: text("recognized_text"),
    confidence: integer("confidence"),
    hasScale: boolean("has_scale").notNull().default(false),
    analysis: jsonb("analysis"),
    gradeValue: numeric("grade_value"),
    gradeOutOf: numeric("grade_out_of"),
    status: text("status", { enum: ["uploaded", "recognized", "graded", "failed"] }).notNull().default("uploaded"),
    createdAt: createdAt(),
  },
  (t) => [index("submissions_user_idx").on(t.userId, t.createdAt)],
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subject: text("subject"),
    source: text("source", { enum: ["document", "subject", "revision", "exam"] }).notNull().default("subject"),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    topic: text("topic"),
    level: text("level"),
    /** durée imposée (examen blanc) ; null = quiz libre */
    minutes: integer("minutes"),
    questions: jsonb("questions").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("quizzes_user_idx").on(t.userId, t.createdAt)],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
    answers: jsonb("answers").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    durationS: integer("duration_s"),
    createdAt: createdAt(),
  },
  (t) => [index("quiz_attempts_user_idx").on(t.userId, t.createdAt)],
);

export const goals = pgTable(
  "goals",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    targetDate: date("target_date"),
    progress: integer("progress").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("goals_user_idx").on(t.userId)],
);

/* --------------------------------------------------- Examens (catalogue) */

export const examPapers = pgTable(
  "exam_papers",
  {
    id: id(),
    country: text("country").notNull(),
    exam: text("exam").notNull(),
    subject: text("subject").notNull(),
    level: text("level").notNull(),
    year: integer("year"),
    minutes: integer("minutes").notNull().default(120),
    source: text("source").notNull(),
    verifiedAt: date("verified_at"),
    sample: boolean("sample").notNull().default(true),
    questions: jsonb("questions").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("exam_papers_lookup_idx").on(t.country, t.exam, t.subject)],
);

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    paperId: uuid("paper_id").notNull().references(() => examPapers.id, { onDelete: "cascade" }),
    answers: jsonb("answers").notNull(),
    score: numeric("score").notNull(),
    total: numeric("total").notNull(),
    durationS: integer("duration_s"),
    createdAt: createdAt(),
  },
  (t) => [index("exam_attempts_user_idx").on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
