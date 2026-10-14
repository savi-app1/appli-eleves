import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const svg = (pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#0E7C3A"/>
  <g transform="translate(${pad},${pad}) scale(${(512 - 2 * pad) / 512})">
    <path d="M332 180c-12.8-25.6-40-40-75.2-40-44.8 0-76.8 24-76.8 60.8 0 32.8 22.4 49.6 68.8 60.8l28.8 7.2c28.8 7.2 40 16 40 32 0 20-19.2 32.8-48 32.8-31.2 0-52-13.6-59.2-38.4"
      fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="376" cy="136" r="32" fill="#9FE2B8"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon.svg", svg(0));
await sharp(Buffer.from(svg(0))).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(svg(0))).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(svg(0))).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(svg(72))).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
console.log("icons generated");
