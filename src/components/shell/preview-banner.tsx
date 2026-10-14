"use client";

import { X } from "lucide-react";
import { useSyncExternalStore } from "react";

const KEY = "savi-preview-banner-dismissed";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function PreviewBanner({ text }: { text: string }) {
  // Masqué pendant le rendu serveur et tant que la session n'a pas été lue : évite tout décalage d'hydratation.
  const dismissed = useSyncExternalStore(subscribe, () => sessionStorage.getItem(KEY) === "1", () => true);
  if (dismissed) return null;
  return (
    <div className="bg-black text-white">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-1.5 text-xs">
        <span>{text}</span>
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => {
            sessionStorage.setItem(KEY, "1");
            listeners.forEach((l) => l());
          }}
          className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
