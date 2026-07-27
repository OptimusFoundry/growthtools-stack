FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

# Install deps first so they cache when source changes. Keeping dev deps (tsx,
# typescript, @types/node) in the image since we run TS directly via tsx — no
# separate build step.
COPY package.json package-lock.json* ./
RUN npm ci

# App sources.
COPY tsconfig.json ./
COPY *.ts ./
COPY fixtures ./fixtures

ENV NODE_ENV=production
ENV PORT=8090
EXPOSE 8090

# Using tsx so we don't ship a separate build step for this thin service.
CMD ["npx", "tsx", "server.ts"]
