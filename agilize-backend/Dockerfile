FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Compila TypeScript → dist/
FROM node:18-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Imagem final — apenas dependências de produção + dist compilado
FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY knexfile.js .
# Migrations/seeds permanecem em .js e são lidos pelo CLI do Knex
COPY src/db ./src/db
# Não copia .env — variáveis vêm do orquestrador
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
