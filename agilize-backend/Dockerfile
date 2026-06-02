FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY knexfile.js .
# Não copia .env — variáveis vêm do orquestrador
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
