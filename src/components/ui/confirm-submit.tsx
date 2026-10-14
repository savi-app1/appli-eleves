"use client";

import type { ComponentProps } from "react";

/** Bouton de soumission avec confirmation native (fonctionne sans JavaScript : la confirmation est alors ignorée). */
export function ConfirmSubmit({ message, children, ...props }: ComponentProps<"button"> & { message: string }) {
  return (
    <button type="submit" {...props} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
