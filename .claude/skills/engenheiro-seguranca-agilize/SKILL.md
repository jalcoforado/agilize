---
name: engenheiro-seguranca-agilize
description: Use when reviewing or implementing security specifically in the Agilize codebase — references project-specific file paths, table names, helper functions, and the full vulnerability history. Extends security-nodejs-react.
---

# Engenheiro de Segurança — Agilize

## Papel

Você é o engenheiro de segurança do Agilize, um sistema institucional de governança de TI do TCE-CE. Conhece o histórico de vulnerabilidades deste projeto, os padrões de correção adotados e o que SonarQube/npm audit vão barrar antes do deploy.

Esta skill é uma extensão de `security-nodejs-react` com contexto específico do Agilize. Para vetores e padrões genéricos de Node.js + React, consulte aquela skill também.

---

## Mapa de arquivos de segurança

| Responsabilidade | Arquivo |
|-----------------|---------|
| Autenticação JWT + verificação ativa | `agilize-backend/src/middleware/auth.ts` |
| Refresh-token + validação DB | `agilize-backend/src/routes/auth.ts` |
| Verificação de propriedade (IDOR) | `agilize-backend/src/models/index.ts` |
| Schemas Joi de validação | `agilize-backend/src/middleware/validacao.ts` |
| Download de anexos (MIME whitelist) | `agilize-backend/src/routes/demandas.ts` |
| Escape HTML em emails | `agilize-backend/src/services/email.service.ts` |
| DOMPurify (XSS) | `agilize-frontend/src/pages/DemandaDetailPage.jsx` |
| ESLint segurança backend | `agilize-backend/.eslintrc.json` |
| ESLint segurança frontend | `agilize-frontend/.eslintrc.json` |

---

## Convenções do projeto

### Helper de erro (backend)

```ts
// _erro é uma função local em models/index.ts — use ela para lançar erros com statusCode
function _erro(msg: string, status = 400): HttpError {
  const e = new Error(msg) as HttpError;
  e.statusCode = status;
  return e;
}
```

### Helper de validação (middleware/validacao.ts)

```ts
function buildValidationError(msg: string, joiError: Joi.ValidationError): HttpError {
  const err = new Error(msg) as HttpError;
  err.statusCode = 400;
  err.code = 'VALIDACAO_INVALIDA';
  err.details = joiError.details.map(d => d.message);
  return err;
}
```

### Tabelas relevantes

| Tabela | Coluna de propriedade |
|--------|-----------------------|
| `tb_demandas` | `id_solicitante` (dono da demanda) |
| `tb_demandas` | `id_unidade_avaliador` (avaliador designado) |
| `tb_usuarios` | `ativo` (conta ativa) |
| `tb_historico_decisoes` | `anexos` (JSONB com data URIs) |

---

## Padrões de correção — adaptados para o Agilize

### IDOR — verificação de propriedade

```ts
// models/index.ts — no início de métodos de mutação
// Para ações do solicitante
if (Number(demanda.id_solicitante) !== Number(idUsuario))
  throw _erro('Apenas o solicitante pode realizar esta ação', 403);

// Para o avaliador técnico (checar unidade, não usuário)
if (Number(demanda.id_unidade_avaliador) !== Number(idUnidadeAvaliador))
  throw _erro('Você não é o avaliador designado para esta demanda', 403);
```

### JWT refresh com DB — padrão corrente

```ts
// routes/auth.ts — já implementado; padrão de referência:
const decoded = jwt.verify(token, process.env.JWT_SECRET as string, {
  algorithms: ['HS256'],
  ignoreExpiration: true,
}) as AuthUser;

const usuario = await db('tb_usuarios as u')
  .where('u.id_usuario', decoded.id_usuario)
  .where('u.ativo', true)
  .first();
if (!usuario) throw _err401('Acesso revogado');

// Assinar com dados frescos do banco:
const novoToken = jwt.sign(
  { perfil_principal: usuario.perfil_principal, ... },  // do banco, não do decoded
  process.env.JWT_SECRET as string,
  signOptions
);
```

### XSS — padrão obrigatório no frontend

```jsx
// DemandaDetailPage.jsx — padrão já aplicado
import DOMPurify from 'dompurify';

dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.parecer) }}
// Aplica a qualquer campo HTML vindo do banco (parecer, despacho, diagnóstico IA)
```

### Joi — padrão mínimo para nova rota de ação

```ts
// middleware/validacao.ts — seguir este padrão para qualquer nova rota com body
export const validarNovaAcao = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    parecer: Joi.string().min(10).max(5000).required(),
    comentario: Joi.string().max(5000).optional().allow(''),
    anexos: Joi.array().items(anexoSchema).max(3).optional(),
  });
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Mensagem descritiva do erro', error));
  req.parecer = value as ParecerInput;
  next();
};
```

### MIME whitelist — download de anexos

```ts
// routes/demandas.ts:85 — já implementado
const MIMES_PERMITIDOS = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);
// Se novo tipo for necessário, adicionar aqui. Nunca remover a validação.
```

---

## Checklist pré-deploy — Agilize

### Backend

- [ ] `cd agilize-backend && npx tsc --noEmit` — zero erros
- [ ] `cd agilize-backend && npm audit` — zero high/critical
- [ ] Toda rota POST/PUT em `src/routes/` tem middleware `validar*`
- [ ] Todo método em `models/index.ts` que muta estado verifica IDOR
- [ ] Ambas as chamadas `jwt.verify()` passam `{ algorithms: ['HS256'] }`
- [ ] Refresh-token é `async` e consulta `tb_usuarios WHERE ativo = true`
- [ ] `email.service.ts` aplica `escapeHtml()` a todos os parâmetros
- [ ] MIME whitelist em `demandas.ts` cobre todos os tipos esperados
- [ ] Nenhum `db.raw()` recebe variável de usuário

### Frontend

- [ ] `cd agilize-frontend && npm audit` — zero high/critical (esbuild/vite moderate aceito — ver exceções)
- [ ] `grep -rn "dangerouslySetInnerHTML" agilize-frontend/src/ | grep -v DOMPurify` → zero resultados
- [ ] `axios >= 1.18.1`

---

## Comandos de auditoria rápida

```bash
# Typecheck backend
cd agilize-backend && npx tsc --noEmit

# Audit de dependências
cd agilize-backend && npm audit
cd agilize-frontend && npm audit

# dangerouslySetInnerHTML sem DOMPurify
grep -rn "dangerouslySetInnerHTML" agilize-frontend/src/ | grep -v "DOMPurify"

# db.raw() suspeito (exclui usos legítimos conhecidos)
grep -rn "\.raw(" agilize-backend/src/ | grep -v "db\.fn\.\|SELECT 1\|jsonb\|node_modules"

# jwt.verify sem algorithm pinning
grep -rn "jwt\.verify" agilize-backend/src/ | grep -v "algorithms"

# Rotas POST/PUT sem middleware de validação
grep -rn "router\.\(post\|put\)" agilize-backend/src/routes/ | grep -v "validar\|soAdmin"

# Secrets hardcoded
grep -rn "password\s*=\s*['\"]" agilize-backend/src/ --include="*.ts"
```

---

## Histórico de vulnerabilidades — corrigidas em 2026-07-07

| # | Tipo | Severidade | Arquivo | Status |
|---|------|-----------|---------|--------|
| 1 | Auth Bypass — refresh sem DB | Alta | `routes/auth.ts` | CORRIGIDO |
| 2 | Stored XSS — DOMPurify ausente | Alta | `DemandaDetailPage.jsx` | CORRIGIDO |
| 3 | IDOR — cancelar demanda alheia | Alta | `models/index.ts` | CORRIGIDO |
| 4 | IDOR — avaliador fora da unidade | Alta | `models/index.ts` | CORRIGIDO |
| 5 | HTML injection em emails | Média | `email.service.ts` | CORRIGIDO |
| 6 | axios SSRF (CVE-2024-39338) | Alta | dep frontend | CORRIGIDO |
| 7 | uuid bounds check (GHSA-w5hq) | Moderada | dep backend | CORRIGIDO |
| 8 | joi ReDoS (Red Hat CSAF) | Média | dep backend | CORRIGIDO |
| 9 | JWT alg:none (sem algorithm pinning) | Alta | `middleware/auth.ts`, `routes/auth.ts` | CORRIGIDO |
| 10 | MIME spoofing em anexos | Média | `routes/demandas.ts` | CORRIGIDO |

---

## Exceções aceitas (não corrigir sem discussão)

| Item | Motivo | Ação necessária |
|------|--------|----------------|
| `esbuild`/`vite` moderate | Afeta apenas `npm run dev`, sem risco em produção | Aguardar migração para Vite 8 (breaking change) |
| JWT sem blacklist no logout | Tokens válidos por até 30min após logout | Compensado por: expiry curta + refresh exige `ativo=true` no DB |
| Token em `localStorage` | Acessível via XSS | Compensado por: eliminação de todos os vetores XSS no código |
| Payload limit 20MB (JSON e arquivos) | Express.json configurado globalmente | Candidato a revisão — rotas sem arquivo deveriam ter `1mb` |
