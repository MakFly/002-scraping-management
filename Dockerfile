FROM node:20-alpine

# Définir les variables d'environnement
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV DOCKER_ENV=true

# Installer Chromium et les dépendances nécessaires
RUN apk update && \
    apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn \
    redis

# Créer un répertoire de travail
WORKDIR /usr/src/app

# Installer pnpm globalement
RUN npm install -g pnpm@10.6.2

# Copier les fichiers package.json et pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances
RUN pnpm install --frozen-lockfile

# Copier l'ensemble du code
COPY . .

# Construire le projet
RUN pnpm build

# Exposer le port 3000
EXPOSE 3000

# Démarrer l'application
CMD ["pnpm", "dev"]
