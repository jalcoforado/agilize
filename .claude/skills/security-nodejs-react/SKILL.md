---
name: security-nodejs-react
description: Use when reviewing or implementing security in any Node.js + Express + React project — XSS, IDOR, auth bypass, injection, JWT, CORS, rate limiting, file uploads, dependency auditing.
---

# Security — Node.js + Express + React

## Core principle

Every user action is potentially malicious until proven otherwise. Validate at the boundary, sanitize at the output, verify ownership before every mutation.

---

## Vulnerability vectors

### Frontend — React

| Vector | Risk | Required pattern |
|--------|------|-----------------|
| `dangerouslySetInnerHTML` without sanitization | Stored XSS — executes JS in every user's browser | `DOMPurify.sanitize(content)` before rendering |
| Rich text editor output (Tiptap, Quill, etc.) | User can inject `<script>`, `onerror`, `javascript:` | Sanitize on **read**, never trust stored HTML |
| Token in `localStorage` | Accessible via XSS — if XSS exists, token leaks | Eliminate XSS first; localStorage is acceptable with no XSS |
| Unversioned dependencies | CVEs silently accumulate | `npm audit` before every PR |

### Backend — Node.js + Express

| Vector | Risk | Required pattern |
|--------|------|-----------------|
| Mutation without ownership check | IDOR — any user acts on another's resource | Verify `resource.owner_id === requester_id` before every write |
| Stateless JWT refresh without DB validation | Auth bypass — deactivated/demoted users keep access indefinitely | Refresh handler must query DB `WHERE id = ? AND active = true`, re-read role |
| JWT without algorithm pinning | Algorithm confusion / `alg: none` forgery | Always pass `{ algorithms: ['HS256'] }` to `jwt.verify()` |
| User input in HTML email templates | HTML injection — phishing via trusted sender | `escapeHtml()` on all user-derived params; validate `linkAcao` to `https?://` only |
| Routes without input validation | Arbitrary types/sizes reach the model | Every POST/PUT route needs a validation middleware (Joi or Zod) |
| `db.raw()` with user variable | SQL injection | Never — use parameterized query builder; `.raw()` only for static expressions |
| CORS `origin: true` in production | Any origin makes authenticated requests | `origin: process.env.FRONTEND_URL` in production |
| File attachment MIME type from data URI | Attacker claims any MIME type | Whitelist allowed types; never trust the string from the data URI |
| Oversized JSON payload limit | DoS via memory exhaustion | Set `express.json({ limit: '1mb' })` by default; override only for file routes |

---

## Fix patterns — copy and adapt

### XSS

```jsx
import DOMPurify from 'dompurify';

// Only accepted pattern for rendering HTML from DB
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
```

### JWT algorithm pinning

```ts
// Both verify() calls in the project must include algorithms
const decoded = jwt.verify(token, process.env.JWT_SECRET as string, {
  algorithms: ['HS256'],
}) as AuthUser;

// refresh-token: add ignoreExpiration alongside
const decoded = jwt.verify(token, secret, {
  algorithms: ['HS256'],
  ignoreExpiration: true,
}) as AuthUser;
```

### JWT refresh — re-validate from DB

```ts
router.post('/refresh-token', async (req, res, next) => {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'], ignoreExpiration: true });

  const user = await db('users')
    .where({ id: decoded.id, active: true })
    .first();
  if (!user) throw _err('Access revoked', 401);

  const newToken = jwt.sign({
    role: user.role,       // from DB — not from the old token
    id: user.id,
  }, secret, { expiresIn: '30m' });
});
```

### IDOR ownership check

```ts
// At the top of any model method that mutates state
if (Number(resource.owner_id) !== Number(requesterId))
  throw error('You do not own this resource', 403);
```

### HTML injection in emails

```ts
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Validate link protocol before injection
const safeLink = /^https?:\/\//.test(params.link ?? '') ? params.link! : '';

html = html.replace(/\{\{title\}\}/g, escapeHtml(params.title));
```

### File attachment — MIME whitelist

```ts
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]);

const [, mime, b64] = match;
if (!ALLOWED_MIMES.has(mime))
  return res.status(400).json({ message: 'Tipo de arquivo não permitido' });
```

### bcrypt — minimum safe rounds

```ts
const BCRYPT_ROUNDS = 12; // minimum for 2024+; increase as hardware improves
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

---

## Pre-deploy checklist

### Backend
- [ ] `tsc --noEmit` — zero errors
- [ ] `npm audit` — zero high/critical (document any accepted moderate)
- [ ] All POST/PUT routes have validation middleware
- [ ] All model mutation methods verify ownership (IDOR)
- [ ] `jwt.verify()` passes `{ algorithms: ['HS256'] }` in every call
- [ ] Refresh-token handler is `async` and queries DB for `active = true`
- [ ] No `db.raw()` receives user input
- [ ] CORS uses `FRONTEND_URL` env var in production
- [ ] Rate limiting active on auth endpoints
- [ ] No hardcoded secrets in source
- [ ] `console.log` does not print tokens, passwords, or PII
- [ ] File downloads whitelist MIME types

### Frontend
- [ ] `npm audit` — zero high/critical
- [ ] Every `dangerouslySetInnerHTML` wraps content in `DOMPurify.sanitize()`
- [ ] `grep -rn "dangerouslySetInnerHTML" src/ | grep -v DOMPurify` → no results

---

## Audit commands

```bash
# Type check
npx tsc --noEmit

# Dependency audit
npm audit

# dangerouslySetInnerHTML without DOMPurify
grep -rn "dangerouslySetInnerHTML" src/ | grep -v "DOMPurify"

# Suspicious db.raw() calls
grep -rn "\.raw(" src/ | grep -v "db\.fn\.\|SELECT 1\|node_modules"

# jwt.verify without algorithm pinning
grep -rn "jwt\.verify" src/ | grep -v "algorithms"

# Hardcoded secrets
grep -rn "password\s*=\s*['\"]" src/ --include="*.ts"

# POST/PUT routes without validation middleware
grep -rn "router\.\(post\|put\)" src/routes/ | grep -v "validar\|validate\|schema\|admin"
```

---

## Known architectural limitations (document, don't fix without discussion)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No JWT blacklist | Logout does not invalidate token server-side — valid for up to `JWT_EXPIRE` after logout | Short expiry (30m); refresh requires active DB record |
| Token in `localStorage` | Accessible via XSS | Compensated by eliminating all XSS vectors |

---

## ESLint enforcement layer

Keep these rules active to catch regressions before code review:

```json
{
  "rules": {
    "react/no-danger": "error",
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "sonarjs/cognitive-complexity": ["warn", 15]
  }
}
```
