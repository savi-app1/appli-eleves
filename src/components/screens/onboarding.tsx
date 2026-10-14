"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpenCheck, Camera, FolderOpen, MessageCircleQuestion } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/shell/logo";
import { cn } from "@/lib/utils";

const icons = [MessageCircleQuestion, Camera, FolderOpen, BookOpenCheck];

export function Onboarding({ slides, labels }: { slides: { title: string; body: string }[]; labels: { skip: string; next: string; haveAccount: string; trialNote: string } }) {
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;
  const Icon = icons[i] ?? icons[0];
  return (
    <div className="flex flex-1 flex-col pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LogoMark size={34} />
          <span className="text-2xl font-extrabold tracking-tight text-green">SAVI</span>
        </div>
        {!last ? (
          <Link href="/inscription" className="text-sm font-semibold text-muted">
            {labels.skip}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div key={i} className="animate-fade-up flex flex-col items-center">
          <div className="mb-8 flex size-36 items-center justify-center rounded-[40px] bg-green-soft text-green">
            <Icon className="size-16" strokeWidth={1.6} />
          </div>
          <h1 className="text-2xl font-extrabold leading-tight text-ink">{slides[i].title}</h1>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{slides[i].body}</p>
        </div>
      </div>

      <div className="mb-6 flex justify-center gap-2" aria-hidden>
        {slides.map((_, k) => (
          <span key={k} className={cn("h-2 rounded-full transition-all", k === i ? "w-6 bg-green" : "w-2 bg-line")} />
        ))}
      </div>

      {last ? (
        <div className="space-y-3">
          <ButtonLink href="/inscription" size="lg" full>
            {labels.next}
          </ButtonLink>
          <ButtonLink href="/connexion" variant="outline" size="lg" full>
            {labels.haveAccount}
          </ButtonLink>
          <p className="text-center text-xs text-muted">{labels.trialNote}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Button size="lg" full onClick={() => setI(i + 1)}>
            Suivant
          </Button>
          <Link href="/connexion" className="block text-center text-sm font-semibold text-green">
            {labels.haveAccount}
          </Link>
        </div>
      )}
    </div>
  );
}
