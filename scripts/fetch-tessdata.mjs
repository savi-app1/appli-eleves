// Télécharge les données de reconnaissance Tesseract (français + anglais) dans TESSDATA_DIR (défaut ./.data/tessdata).
// Source : dépôt officiel tesseract-ocr/tessdata_fast (licence Apache-2.0). ~ 1,5 Mo + 4 Mo.
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.env.TESSDATA_DIR ?? "./.data/tessdata";
const langs = (process.argv[2] ?? "fra,eng").split(",");
await mkdir(dir, { recursive: true });

for (const lang of langs) {
  const file = join(dir, `${lang}.traineddata`);
  try {
    const s = await stat(file);
    if (s.size > 100_000) {
      console.log(`✓ ${file} déjà présent`);
      continue;
    }
  } catch {}
  const url = `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/${lang}.traineddata`;
  const alt = `https://api.github.com/repos/tesseract-ocr/tessdata_fast/contents/${lang}.traineddata?ref=main`;
  let buf = null;
  for (const [u, headers] of [[url, {}], [alt, { accept: "application/vnd.github.raw+json" }]]) {
    try {
      const r = await fetch(u, { headers });
      if (r.ok) {
        buf = Buffer.from(await r.arrayBuffer());
        break;
      }
      console.warn(`  ${u} → HTTP ${r.status}`);
    } catch (e) {
      console.warn(`  ${u} → ${e.message}`);
    }
  }
  if (!buf) {
    console.error(`✗ Impossible de télécharger ${lang}.traineddata. Télécharge-le manuellement depuis ${url} vers ${file}.`);
    process.exitCode = 1;
    continue;
  }
  await writeFile(file, buf);
  console.log(`✓ ${file} (${Math.round(buf.length / 1024)} Ko)`);
}
