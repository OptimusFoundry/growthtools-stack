FROM node:22-slim

# Install Chromium dependencies for Remotion
RUN apt-get update && apt-get install -y \
    chromium \
    curl \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libdrm2 \
    libgbm1 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY tsconfig.json remotion.config.ts ./
COPY src/ src/

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/server.js"]
