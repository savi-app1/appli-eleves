"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Bouton de formulaire serveur : affiche l'état « en cours » pendant l'action (générations IA, imports). */
export function SubmitButton({ pendingLabel, children, ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending || props.disabled} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
