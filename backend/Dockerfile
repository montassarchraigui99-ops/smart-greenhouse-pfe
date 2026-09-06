# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
# Copie stricte des manifests pour exploitation du cache Docker
COPY package*.json ./
# Installation des dépendances de compilation pour better-sqlite3
RUN apk add --no-cache python3 make g++
# Install ciblant uniquement la production
RUN npm install --omit=dev

# Stage 2: Production Image
FROM node:20-alpine
WORKDIR /usr/src/app

# Application du standard de sécurité (non-root)
RUN chown -R node:node /usr/src/app
USER node

# Copie des Node_modules depuis le Builder
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
# Copie du code source
COPY --chown=node:node . .

# Set Environnement par défaut
ENV NODE_ENV=production
ENV PORT=5000

# Exposition
EXPOSE 5000

# Démarrage
CMD ["node", "server.js"]
