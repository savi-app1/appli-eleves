"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, Paperclip, Pin, PinOff, Plus, RefreshCw, Send, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockTutorReply, type Intent } from "@/lib/mock-tutor";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

let counter = 0;
const uid = () => `m${++counter}`;

/** Rendu minimal du gras **texte** et des sauts de ligne (sans dépendance Markdown). */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
      )}
    </span>
  );
}

export function TutorChat({ user }: { user: { firstName: string; level: string } }) {
  const t = useTranslations("tutor");
  const tl = useTranslations("languagesNames");
  const labels = {
    title: t("title"),
    newChat: t("newChat"),
    placeholder: t("placeholder"),
    send: t("send"),
    welcome: t("welcome", { name: user.firstName }),
    levelChip: t("levelChip", { level: user.level }),
    answerLangChip: t("answerLangChip", { language: tl("fr").toLowerCase() }),
    suggestions: [0, 1, 2, 3].map((i) => t(`suggestions.${i}`)),
    thinking: t("thinking"),
    disclaimer: t("disclaimer"),
    exampleNotice: t("exampleNotice"),
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
  const [messages, setMessages] = useState<Msg[]>(() => [{ id: uid(), role: "assistant", text: labels.welcome }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function streamAnswer(text: string) {
    const id = uid();
    setBusy(true);
    const t0 = window.setTimeout(() => {
      setMessages((m) => [...m, { id, role: "assistant", text: "", streaming: true }]);
      const words = text.split(" ");
      let i = 0;
      const tick = () => {
        i += 3;
        const partial = words.slice(0, i).join(" ");
        setMessages((m) => m.map((x) => (x.id === id ? { ...x, text: partial, streaming: i < words.length } : x)));
        if (i < words.length) timers.current.push(window.setTimeout(tick, 45));
        else setBusy(false);
      };
      tick();
    }, 600);
    timers.current.push(t0);
  }

  function ask(question: string, intent?: Intent) {
    const q = question.trim();
    if (!q || busy) return;
    if (!intent) {
      setMessages((m) => [...m, { id: uid(), role: "user", text: q }]);
      setLastQuestion(q);
    } else {
      const label = labels.actions[intent];
      setMessages((m) => [...m, { id: uid(), role: "user", text: label }]);
    }
    setInput("");
    streamAnswer(mockTutorReply(q, intent).text);
  }

  const showSuggestions = messages.length === 1;

  return (
    <div className="-mx-4 -mt-4 flex min-h-[calc(100dvh-7.5rem)] flex-col">
      {/* En-tête de la discussion */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-bg px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-extrabold text-ink">{labels.title}</h1>
            <Badge tone="green"><Sparkles className="size-3" /> {labels.levelChip}</Badge>
          </div>
          <div className="truncate text-xs text-muted">{labels.answerLangChip}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setPinned((p) => !p)}
            aria-pressed={pinned}
            aria-label={pinned ? labels.actions.unpin : labels.actions.pin}
            className={cn("flex size-9 items-center justify-center rounded-full hover:bg-surface-2", pinned ? "text-green" : "text-muted")}
          >
            {pinned ? <PinOff className="size-[18px]" /> : <Pin className="size-[18px]" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setMessages([{ id: uid(), role: "assistant", text: labels.welcome }]);
              setLastQuestion(null);
              setPinned(false);
            }}
            aria-label={labels.newChat}
            className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 px-4 py-4">
        <p className="rounded-xl bg-warning-soft px-3 py-2 text-center text-xs text-ink">{labels.exampleNotice}</p>
        {messages.map((m) => (
          <div key={m.id} className={cn("animate-fade-up flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-[var(--shadow-card)]",
                m.role === "user" ? "rounded-br-md bg-green text-white" : "rounded-bl-md border border-line bg-surface text-ink",
              )}
            >
              {m.text ? <RichText text={m.text} /> : null}
              {m.streaming && !m.text ? (
                <span className="flex items-center gap-1 py-1" aria-label={labels.thinking}>
                  <span className="typing-dot size-2 rounded-full bg-muted" />
                  <span className="typing-dot size-2 rounded-full bg-muted" />
                  <span className="typing-dot size-2 rounded-full bg-muted" />
                </span>
              ) : null}
            </div>
          </div>
        ))}

        {showSuggestions ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {labels.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-line bg-surface px-3.5 py-2 text-left text-sm text-ink hover:bg-surface-2"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {lastQuestion && !busy ? (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pt-1">
            {(
              [
                ["explainAgain", RefreshCw],
                ["simpler", Wand2],
                ["example", Lightbulb],
                ["exercise", Sparkles],
              ] as const
            ).map(([intent, Icon]) => (
              <button
                key={intent}
                type="button"
                onClick={() => ask(lastQuestion, intent)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-soft px-3.5 py-2 text-sm font-semibold text-green-ink"
              >
                <Icon className="size-4" /> {labels.actions[intent]}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {/* Zone de saisie, collée au-dessus de la navigation basse */}
      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-20 border-t border-line bg-bg/95 px-4 pt-2 pb-2 backdrop-blur">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <button type="button" aria-label={labels.attach} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2">
            <Paperclip className="size-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            placeholder={labels.placeholder}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-base text-ink placeholder:text-muted focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
          />
          <Button type="submit" aria-label={labels.send} className="size-11 shrink-0 rounded-full px-0" disabled={!input.trim() || busy}>
            <Send className="size-5" />
          </Button>
        </form>
        <p className="mt-1.5 text-center text-[11px] text-muted">{labels.disclaimer}</p>
      </div>
    </div>
  );
}
