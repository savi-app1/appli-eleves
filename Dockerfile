# SAVI — image de production (option VPS). Build : docker build -t savi .  ·  Voir docs/07-deploiement.md
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm run ocr:setup

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 TESSDATA_DIR=/app/.data/tessdata
RUN addgroup -S savi && adduser -S savi -G savi
COPY --from=build --chown=savi:savi /app/.next/standalone ./
COPY --from=build --chown=savi:savi /app/.next/static ./.next/static
COPY --from=build --chown=savi:savi /app/public ./public
COPY --from=build --chown=savi:savi /app/.data/tessdata ./.data/tessdata
COPY --from=build --chown=savi:savi /app/drizzle ./drizzle
COPY --from=build --chown=savi:savi /app/scripts/migrate.mjs ./scripts/migrate.mjs
# Les modules nécessaires aux migrations et à l'OCR ne sont pas tous tracés par le mode standalone.
COPY --from=build --chown=savi:savi /app/node_modules/pg ./node_modules/pg
COPY --from=build --chown=savi:savi /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=savi:savi /app/node_modules/tesseract.js ./node_modules/tesseract.js
COPY --from=build --chown=savi:savi /app/node_modules/tesseract.js-core ./node_modules/tesseract.js-core
COPY --from=build --chown=savi:savi /app/node_modules/unpdf ./node_modules/unpdf
USER savi
EXPOSE 3000
VOLUME ["/app/.data/uploads"]
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
