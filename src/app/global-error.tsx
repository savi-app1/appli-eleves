"use client";

/** Erreur dans la mise en page racine : rendu autonome, sans dépendances. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, background: "#F4F6F5", color: "#17202A" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>SAVI est momentanément indisponible</h1>
          <p style={{ color: "#667085", fontSize: 14 }}>Réessaie dans un instant. {error.digest ? `Code : ${error.digest}` : ""}</p>
          <button type="button" onClick={reset} style={{ background: "#0E7C3A", color: "#fff", border: 0, borderRadius: 12, padding: "12px 20px", fontWeight: 600, fontSize: 15 }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
