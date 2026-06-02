#!/bin/bash
set -e

echo "=== Agilize 2.0 — Deploy de Produção ==="

# 1. Verificar .env.production
if [ ! -f .env.production ]; then
  echo "❌ Arquivo .env.production não encontrado."
  echo "   Copie .env.production.example e preencha os valores."
  exit 1
fi

# 2. Build das imagens
echo "▶ Build das imagens Docker..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 3. Subir serviços de infraestrutura primeiro
echo "▶ Subindo PostgreSQL e Redis..."
docker-compose -f docker-compose.prod.yml up -d postgres redis

# 4. Aguardar banco saudável
echo "▶ Aguardando PostgreSQL ficar pronto..."
until docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "${DB_USER:-agilize_user}" -d "${DB_NAME:-agilize_db}"; do
  sleep 2
done

# 5. Migrations
echo "▶ Executando migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend \
  sh -c "NODE_ENV=production node_modules/.bin/knex migrate:latest"

# 6. Subir backend e frontend
echo "▶ Subindo backend e frontend..."
docker-compose -f docker-compose.prod.yml up -d backend frontend

# 7. Health check
echo "▶ Verificando health check..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Backend respondendo (HTTP $HTTP_STATUS)"
else
  echo "⚠️  Backend retornou HTTP $HTTP_STATUS — verifique os logs:"
  echo "   docker-compose -f docker-compose.prod.yml logs backend"
fi

echo ""
echo "=== Deploy concluído ==="
echo "   Frontend: http://localhost:80"
echo "   Backend:  http://localhost:3000"
echo "   Logs:     docker-compose -f docker-compose.prod.yml logs -f"
