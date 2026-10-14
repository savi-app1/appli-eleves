import type { LegalDoc } from "@/content/legal";

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink">{doc.title}</h1>
      <p className="mt-1 text-xs text-muted">Dernière mise à jour : {doc.updatedAt}</p>
      <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-sm text-ink">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.title} className="mt-5">
          <h2 className="text-base font-bold text-ink">{s.title}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-2 text-muted">{p}</p>
          ))}
        </section>
      ))}
    </>
  );
}
