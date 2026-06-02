# 🚀 Agilize 2.0 - Guia de Execução

## Visão Geral
Sistema completo de gestão de demandas com workflow obrigatório: **Solicitante → Gestor_Unidade → STI → Dev → QA → Ops**

## Pré-requisitos
- Node.js 18+ instalado
- Docker & Docker Compose instalado
- Git (opcional)
- Npm ou Yarn

## Estrutura do Projeto
```
agilize/
├── agilize-backend/       # API REST Node.js + Express
│   ├── src/
│   │   ├── index.js       # Servidor principal
│   │   ├── models/        # Lógica de negócio
│   │   ├── controllers/   # Handlers HTTP
│   │   ├── routes/        # Endpoints da API
│   │   ├── middleware/    # Auth, validação, etc
│   │   └── db/            # Migrations, seeds, conexão
│   ├── package.json
│   ├── docker-compose.yml
│   └── Dockerfile
│
└── agilize-frontend/      # Frontend React + Vite
    ├── src/
    │   ├── pages/         # Páginas (Login, Dashboard)
    │   ├── services/      # Chamadas API
    │   ├── components/    # Componentes reutilizáveis
    │   └── styles/        # Tailwind CSS
    ├── package.json
    ├── vite.config.js
    └── index.html
```

## 🚀 Opção 1: Execução com Docker (Recomendado)

### 1. Iniciar os Serviços
```bash
cd agilize-backend

# Iniciar MySQL, Redis e Backend
docker-compose up -d

# Logs
docker-compose logs -f backend
```

Aguarde até ver mensagem: `Servidor rodando na porta 3000`

### 2. Executar Migrations e Seeds
```bash
npm run migrate
npm run seed
```

### 3. Iniciar o Frontend (em outro terminal)
```bash
cd agilize-frontend
npm install
npm run dev
```

Acesse: **http://localhost:5173**

---

## 🏃 Opção 2: Execução Local (Sem Docker)

### Backend

#### Passo 1: Instalar dependências
```bash
cd agilize-backend
npm install
```

#### Passo 2: Configurar variáveis de ambiente
Crie arquivo `.env` baseado em `.env.example`:
```bash
NODE_ENV=development
PORT=3000
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRE=30m

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=seu_password
DB_NAME=agilize
DB_PORT=3306

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=seu@email.com
MAIL_PASSWORD=sua_senha
```

#### Passo 3: Preparar Banco de Dados
```bash
# MySQL deve estar rodando localmente
# Criar banco
mysql -u root -p -e "CREATE DATABASE agilize CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Executar migrations
npm run migrate

# Popular com dados de teste
npm run seed
```

#### Passo 4: Iniciar servidor
```bash
npm run dev
```

Output esperado:
```
✓ Servidor rodando na porta 3000
✓ Conectado ao MySQL
✓ Conectado ao Redis
```

### Frontend

#### Passo 1: Instalar dependências
```bash
cd agilize-frontend
npm install
```

#### Passo 2: Iniciar Vite dev server
```bash
npm run dev
```

Acesse: **http://localhost:5173**

---

## 📝 Credenciais de Teste

Use uma dessas contas para testar:

| Perfil | Email | Senha | Função |
|--------|-------|-------|--------|
| Solicitante | jorge@agilize.com.br | senha123 | Criar demandas |
| Gestor Unidade | maria@agilize.com.br | senha123 | Validar demandas |
| Analista STI | joao@agilize.com.br | senha123 | Revisar STI |
| Dev | pedro@agilize.com.br | senha123 | Desenvolver |
| QA | ana@agilize.com.br | senha123 | Homologar |
| Admin | admin@agilize.com.br | senha123 | Gestão geral |

---

## 🔄 Fluxo de Teste do Sistema

### 1. Login como Solicitante
```
Email: jorge@agilize.com.br
Senha: senha123
```

### 2. Criar Nova Demanda
- Título: "Implementar novo dashboard"
- Descrição: "Desenvolvimento de um dashboard com métricas em tempo real..."
- Tipo: NOVO_SISTEMA
- Prioridade: ALTA
- Unidade: TI-Sistemas

### 3. Enviar para Gestor
- Clique em "Enviar para Validação"
- Status muda para: `PENDENTE_GESTOR`

### 4. Login como Gestor
```
Email: maria@agilize.com.br
Senha: senha123
```

### 5. Validar Demanda
- Veja demandas pendentes no Dashboard
- Parecer: "Demanda bem justificada, aprovo para STI"
- Status muda para: `VALIDADA_GESTOR`

### 6. Encaminhar para STI
- Clique "Enviar para STI"
- Status: `FILA_STI`

### 7. Visualizar Histórico
- Clique na demanda
- Veja timeline com todas as transições

---

## 🔌 Endpoints da API

### Autenticação
```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/logout
```

### Demandas
```
GET    /api/v1/demandas               # Listar (filtros: status, prioridade)
POST   /api/v1/demandas               # Criar nova
GET    /api/v1/demandas/:id           # Obter uma

# Workflow
POST   /api/v1/demandas/:id/enviar-gestor
POST   /api/v1/demandas/:id/validar-gestor
POST   /api/v1/demandas/:id/rejeitar
POST   /api/v1/demandas/:id/devolver
POST   /api/v1/demandas/:id/enviar-sti

# Histórico
GET    /api/v1/demandas/:id/historico
```

### Exemplo de Requisição
```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jorge@agilize.com.br","senha":"senha123"}'

# Criar Demanda
curl -X POST http://localhost:3000/api/v1/demandas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "titulo": "Novo Sistema",
    "descricao": "Descrição completa do sistema...",
    "tipo_demanda": "NOVO_SISTEMA",
    "prioridade": "ALTA",
    "id_unidade": 1,
    "id_departamento": 1
  }'
```

---

## 🐛 Troubleshooting

### Porta 3000 já em uso
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Erro de conexão MySQL
```bash
# Verificar se MySQL está rodando
# Windows: Services -> MySQL80
# Linux: sudo systemctl start mysql
# Docker: docker-compose ps
```

### Erro de CORS
- Verificar se backend está em `http://localhost:3000`
- Frontend deve estar em `http://localhost:5173`
- `.env` backend configurado corretamente

### Limpar e Reiniciar
```bash
# Backend
npm run migrate:rollback
npm run migrate
npm run seed

# Frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs Backend
```bash
# Docker
docker-compose logs -f backend

# Local
npm run dev
```

### Acessar MySQL
```bash
mysql -u root -p agilize
SELECT * FROM tb_demandas;
SELECT * FROM tb_historico_decisoes;
```

---

## 🏗️ Arquitetura Implementada

```
┌─────────────────────┐
│   Frontend React    │ http://localhost:5173
│  (Login, Dashboard) │
└──────────┬──────────┘
           │ (HTTP/HTTPS)
           ▼
┌─────────────────────┐
│  Backend Express    │ http://localhost:3000
│  (API REST)         │
├─────────────────────┤
│ Controllers & Routes│
│ Models & Logic      │
│ Middleware (Auth)   │
└──────────┬──────────┘
           │
    ┌──────┴──────┬──────────┐
    ▼             ▼          ▼
┌────────┐   ┌────────┐   ┌─────────┐
│ MySQL  │   │ Redis  │   │Notificações
│ 3306   │   │ 6379   │   │(Nodemailer)
└────────┘   └────────┘   └─────────┘
```

---

## 📦 Dependências Principais

### Backend
- **express**: Framework HTTP
- **mysql2**: Driver MySQL
- **knex**: Query builder & migrations
- **jsonwebtoken**: Autenticação JWT
- **bcryptjs**: Hash de senhas
- **joi**: Validação de schemas
- **redis**: Cache & sessions
- **nodemailer**: Envio de emails

### Frontend
- **react**: Biblioteca UI
- **react-router-dom**: Roteamento
- **axios**: Cliente HTTP
- **tailwindcss**: CSS framework
- **vite**: Build tool

---

## ✅ Checklist de Validação

- [ ] Backend iniciando sem erros
- [ ] Frontend carregando em http://localhost:5173
- [ ] Login funcionando com credenciais de teste
- [ ] Dashboard mostrando demandas
- [ ] Criar nova demanda
- [ ] Enviar para gestor
- [ ] Login como gestor e validar
- [ ] Encaminhar para STI
- [ ] Histórico mostrando todas as transições
- [ ] Logout funcionando

---

## 📞 Suporte

Para mais informações sobre:
- **API**: Ver [ENDPOINTS_API.md](../docs/ENDPOINTS_API.md)
- **Regras de Negócio**: Ver [REGRAS_NEGOCIO.md](../docs/REGRAS_NEGOCIO.md)
- **Permissões**: Ver [PERMISSOES_DETALHADO.md](../docs/PERMISSOES_DETALHADO.md)

---

**Última atualização**: 2024
**Versão**: 2.0
**Status**: ✅ Pronto para testes
