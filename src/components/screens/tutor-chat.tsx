"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertTriangle, BookOpen, History, Lightbulb, Paperclip, Pin, PinOff, Plus, RefreshCw, Send, ShieldCheck, Sparkles, Square, Wand2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TutorUIMessage } from "@/server/tutor/service";
import type { SourceRef } from "@/server/ai/schemas";
import { togglePinAction } from "@/server/learning/actions";
import { cn } from "@/lib/utils";

type Intent = "explainAgain" | "simpler" | "example" | "exercise";

export interface TutorChatProps {
  user: { firstName: string; level: string };
  answerLanguage: string;
  demo: boolean;
  initial: {
    conversationId: string | null;
    messages: TutorUIMessage[];
    pinned: boolean;
    strict: boolean;
    documents: { id: string; title: string }[];
    prefill: string;
  };
}

/** Rendu léger : gras **texte**, listes, et citations [n] mises en évidence (sans dépendance Markdown). */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
        const isBullet = /^\s*[-•]\s+/.test(line);
        const content = parts.map((p, i) => {
          if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
          if (/^\[\d+\]$/.test(p)) return <sup key={i} className="ml-0.5 rounded bg-green-soft px-1 text-[10px] font-bold text-green-ink">{p.slice(1, -1)}</sup>;
          return <span key={i}>{isBullet && i === 0 ? p.replace(/^\s*[-•]\s+/, "") : p}</span>;
        });
        if (!line.trim()) return <div key={li} className="h-1" />;
        return isBullet ? (
          <div key={li} className="flex gap-2 pl-1"><span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-current opacity-60" /><span className="whitespace-pre-wrap">{content}</span></div>
        ) : (
          <p key={li} className="whitespace-pre-wrap">{content}</p>
        );
      })}
    </div>
  );
}

function textOf(m: TutorUIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function parseError(err: Error | undefined): string | null {
  if (!err) return null;
  try {
    const j = JSON.parse(err.message) as { error?: string };
    return j.error ?? "unknown";
  } catch {
    return /401|unauthenticated/i.test(err.message) ? "unauthenticated" : "unknown";
  }
}

export function TutorChat({ user, answerLanguage, demo, initial }: TutorChatProps) {
  const t = useTranslations("tutor");
  const tc = useTranslations("common");
  const router = useRouter();
  const labels = {
    title: t("title"),
    newChat: t("newChat"),
    placeholder: t("placeholder"),
    send: t("send"),
    welcome: t("welcome", { name: user.firstName }),
    levelChip: t("levelChip", { level: user.level }),
    answerLangChip: t("answerLangChip", { language: answerLanguage.toLowerCase() }),
    suggestions: [0, 1, 2, 3].map((i) => t(`suggestions.${i}`)),
    thinking: t("thinking"),
    disclaimer: t("disclaimer"),
    attach: t("attach"),
    actions: {
      explainAgain: t("actions.explainAgain"),
      example: t("actions.example"),
      exercise: t("actions.exercise"),
      simpler: t("actions.simpler"),
      pin: t("actions.pin"),
      unpin: t("actions.unpin"),
    },
  };

  const [conversationId, setConversationId] = useState(initial.conversationId);
  const [strict, setStrict] = useState(initial.strict && initial.documents.length > 0);
  const documentIds = useMemo(() => initial.documents.map((d) => d.id), [initial.documents]);
  const [pinned, setPinned] = useState(initial.pinned);
  const [pinPending, startPin] = useTransition();
  const [input, setInput] = useState(initial.prefill);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Seul le corps préparé à l'envoi est transmis (pas tout l'historique : économie de données sur réseau faible).
  const [transport] = useState(
    () =>
      new DefaultChatTransport<TutorUIMessage>({
        api: "/api/tuteur",
        prepareSendMessagesRequest: ({ body }) => ({ body: body ?? {} }),
      }),
  );

  const { messages, sendMessage, status, error, stop, clearError, setMessages } = useChat<TutorUIMessage>({
    id: initial.conversationId ?? "nouvelle",
    messages: initial.messages,
    transport,
    onFinish: ({ message }) => {
      const id = message.metadata?.conversationId;
      if (id) {
        setConversationId((cur) => {
          if (cur !== id) window.history.replaceState(null, "", `/tuteur?c=${id}`);
          return id;
        });
      }
      router.refresh();
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const errorCode = parseError(error);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  async function ask(question: string, intent?: Intent) {
    const q = question.trim();
    if (busy) return;
    if (!intent && !q) return;
    clearError();
    setInput("");
    textareaRef.current?.focus();
    await sendMessage(
      { text: intent ? labels.actions[intent] : q, metadata: intent ? { intent } : undefined },
      { body: { conversationId, text: q, intent: intent ?? null, strict, documentIds: strict ? documentIds : [] } },
    );
  }

  function newChat() {
    stop();
    setConversationId(null);
    setPinned(false);
    setMessages([]);
    setInput("");
    window.history.replaceState(null, "", "/tuteur");
  }

  function togglePin() {
    if (!conversationId) return;
    const next = !pinned;
    setPinned(next);
    startPin(() => togglePinAction(conversationId, next).catch(() => setPinned(!next)));
  }

  const lastAssistant = messages.length > 0 && messages[messages.length - 1].role === "assistant";
  const showSuggestions = messages.length === 0 && !busy;
  const sourcesFor = (m: TutorUIMessage): SourceRef[] => (m.metadata?.sources ?? []) as SourceRef[];

  return (
    <div className="-mx-4 -mt-4 flex min-h-[calc(100dvh-7.5rem)] flex-col">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-bg px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-extrabold text-ink">{labels.title}</h1>
            <Badge tone="green"><Sparkles className="size-3" /> {labels.levelChip}</Badge>
          </div>
          <div className="truncate text-xs text-muted">{labels.answerLangChip}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link href="/profil/historique" aria-label={t("history")} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2">
            <History className="size-[18px]" />
          </Link>
          <button
            type="button"
            onClick={togglePin}
            disabled={!conversationId || pinPending}
            aria-pressed={pinned}
            aria-label={pinned ? labels.actions.unpin : labels.actions.pin}
            className={cn("flex size-9 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-40", pinned ? "text-green" : "text-muted")}
          >
            {pinned ? <PinOff className="size-[18px]" /> : <Pin className="size-[18px]" />}
          </button>
          <button type="button" onClick={newChat} aria-label={labels.newChat} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2">
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      {/* Bandeaux d'état */}
      {demo ? (
        <div className="flex items-center gap-2 bg-warning-soft px-4 py-1.5 text-xs text-ink" title={t("demoHint")}>
          <AlertTriangle className="size-3.5 shrink-0" /> {t("demoChip")}
        </div>
      ) : null}
      {strict ? (
        <div className="flex items-center justify-between gap-2 bg-green-soft px-4 py-1.5 text-xs text-green-ink">
          <span className="flex min-w-0 items-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0" />
            <span className="truncate font-semibold">{t("strictChip", { count: initial.documents.length })}</span>
            <span className="hidden truncate sm:inline">· {initial.documents.map((d) => d.title).join(", ")}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <Link href="/cours" className="font-semibold underline-offset-2 hover:underline">{t("strictChoose")}</Link>
            <button type="button" onClick={() => setStrict(false)} className="flex items-center gap-0.5 font-semibold" aria-label={t("strictOff")}><X className="size-3.5" /></button>
          </span>
        </div>
      ) : null}

      {/* Messages */}
      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.length === 0 ? (
          <div className="animate-fade-up flex justify-start">
            <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed text-ink shadow-[var(--shadow-card)]">
              {labels.welcome}
              {strict ? <p className="mt-2 text-xs text-muted">{t("strictInfo")}</p> : null}
            </div>
          </div>
        ) : null}

        {messages.map((m) => {
          const text = textOf(m);
          const sources = m.role === "assistant" ? sourcesFor(m) : [];
          return (
            <div key={m.id} className={cn("animate-fade-up flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-[var(--shadow-card)]",
                  m.role === "user" ? "rounded-br-md bg-green text-white" : "rounded-bl-md border border-line bg-surface text-ink",
                )}
              >
                {text ? <RichText text={text} /> : null}
                {m.role === "assistant" && !text && busy ? (
                  <span className="flex items-center gap-1 py-1" aria-label={labels.thinking}>
                    <span className="typing-dot size-2 rounded-full bg-muted" />
                    <span className="typing-dot size-2 rounded-full bg-muted" />
                    <span className="typing-dot size-2 rounded-full bg-muted" />
                  </span>
                ) : null}
                {sources.length > 0 && text ? (
                  <div className="mt-2.5 border-t border-line pt-2">
                    <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted"><BookOpen className="size-3" /> {t("sources")}</div>
                    <ul className="space-y-0.5 text-xs text-muted">
                      {sources.map((s) => (
                        <li key={s.n} className="truncate">
                          <Link href={`/cours/${s.documentId}`} className="hover:text-ink">
                            <span className="font-bold text-green-ink">[{s.n}]</span> {s.title}{s.page ? ` · ${t("page", { page: s.page })}` : ""}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {status === "submitted" ? (
          <div className="animate-fade-up flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 shadow-[var(--shadow-card)]">
              <span className="flex items-center gap-1 py-1" aria-label={labels.thinking}>
                <span className="typing-dot size-2 rounded-full bg-muted" />
                <span className="typing-dot size-2 rounded-full bg-muted" />
                <span className="typing-dot size-2 rounded-full bg-muted" />
              </span>
            </div>
          </div>
        ) : null}

        {errorCode ? (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-ink">
            <div className="flex items-center gap-2 font-bold text-danger"><AlertTriangle className="size-4" /> {t("errorTitle")}</div>
            <p className="mt-1">{tc.has(`errors.${errorCode}`) ? tc(`errors.${errorCode}`) : tc("errors.unknown")}</p>
            <div className="mt-2 flex gap-2">
              {errorCode === "premium_required" ? (
                <Link href="/abonnement" className="rounded-full bg-green px-3 py-1.5 text-xs font-bold text-white">{tc("subscribe")}</Link>
              ) : errorCode === "unauthenticated" ? (
                <Link href="/connexion?next=/tuteur" className="rounded-full bg-green px-3 py-1.5 text-xs font-bold text-white">{tc("retry")}</Link>
              ) : (
                <button type="button" onClick={() => clearError()} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink">{tc("close")}</button>
              )}
            </div>
          </div>
        ) : null}

        {showSuggestions ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {labels.suggestions.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line bg-surface px-3.5 py-2 text-left text-sm text-ink hover:bg-surface-2">
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {lastAssistant && !busy ? (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pt-1">
            {(
              [
                ["explainAgain", RefreshCw],
                ["simpler", Wand2],
                ["example", Lightbulb],
                ["exercise", Sparkles],
              ] as const
            ).map(([intent, Icon]) => (
              <button key={intent} type="button" onClick={() => ask("", intent)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-soft px-3.5 py-2 text-sm font-semibold text-green-ink">
                <Icon className="size-4" /> {labels.actions[intent]}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {/* Saisie */}
      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-20 border-t border-line bg-bg/95 px-4 pt-2 pb-2 backdrop-blur">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <Link href="/correction" aria-label={labels.attach} title={labels.attach} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2">
            <Paperclip className="size-5" />
          </Link>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={labels.placeholder}
            aria-label={labels.placeholder}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-base text-ink placeholder:text-muted focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
          />
          {busy ? (
            <Button type="button" variant="black" aria-label={t("stop")} className="size-11 shrink-0 rounded-full px-0" onClick={() => stop()}>
              <Square className="size-4" />
            </Button>
          ) : (
            <Button type="submit" aria-label={labels.send} className="size-11 shrink-0 rounded-full px-0" disabled={!input.trim()}>
              <Send className="size-5" />
            </Button>
          )}
        </form>
        <p className="mt-1.5 text-center text-[11px] text-muted">{labels.disclaimer}</p>
      </div>
    </div>
  );
}
