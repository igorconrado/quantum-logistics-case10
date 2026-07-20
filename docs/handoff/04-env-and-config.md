# 04 — Environment & Config

## Variáveis de ambiente referenciadas no código

Busca executada com `grep -rn "process.env\|import.meta.env\|os.getenv\|os.environ" .` (excluindo venv/node_modules).

| Nome                    | Onde é usada                                                                | Exemplo de valor (mascarado)                                  | Obrigatória? | Escopo            |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------ | ----------------- |
| `ORS_API_KEY`           | [backend/routing.py:24](backend/routing.py#L24) — `os.getenv("ORS_API_KEY", "")` | `eyJvcmciOiI1YjNj...` (JWT-like ORS token)                    | Opcional     | Backend (Python)  |
| `PORT`                  | [server.py:364](server.py#L364) — `int(os.environ.get('PORT', 5001))`      | `5001`                                                        | Opcional (default 5001) | Backend           |
| `FLASK_ENV`             | Lido implicitamente pelo Flask (não há leitura explícita no código)         | `development`                                                 | Opcional     | Backend           |
| `FLASK_DEBUG`           | Lido implicitamente pelo Flask                                              | `1`                                                           | Opcional     | Backend           |
| `HOST`                  | Documentado em `.env.example` mas **não lido no código** (server.py hardcoda `host='0.0.0.0'`) | `0.0.0.0`                                                     | N/A          | —                 |
| `NEXT_PUBLIC_API_URL`   | [frontend_base/lib/api.ts:1](frontend_base/lib/api.ts#L1) — `process.env.NEXT_PUBLIC_API_URL \|\| ""` | `http://localhost:5001`                                       | Opcional (default "")  | Frontend (Next.js, exposto ao cliente) |

**Notas:**

- Não há outras `process.env.*` no frontend. O `NEXT_PUBLIC_API_URL` é a única var de config do lado cliente.
- A chave ORS é a única credencial. É opcional: sem ela, o app funciona usando Haversine, apenas a feature "Real Roads" fica desabilitada (visível no `/api/routing-status`).
- O `.env` local **contém uma ORS_API_KEY real exposta** (commit-safe-check: `.env` está no `.gitignore`, então não vazou via git, mas está em texto plano no disco — recomendável rotacionar se preciso).

## `.env.example` (conteúdo real no repo)

```bash
# OpenRouteService API Key
# Get your free API key at: https://openrouteservice.org
# Free tier: 2000 requests/day
ORS_API_KEY=your_api_key_here

# Flask Configuration (optional)
FLASK_ENV=development
FLASK_DEBUG=1

# Server Configuration (optional)
HOST=0.0.0.0
PORT=5001
```

## `.env` (produção/local — NÃO commitado)

O arquivo existe em disco com uma ORS_API_KEY válida. Estrutura idêntica ao exemplo. Valor do token omitido deste dump por segurança.

## `frontend_base/.env.local`

Uma linha:
```
NEXT_PUBLIC_API_URL=http://localhost:5001
```

**Em produção** este valor precisa apontar para a URL pública do backend (ver [05-vercel-deploy.md](05-vercel-deploy.md)).

## `.env.example` sugerido para deploy (montado a partir dos grep)

Para handoff da outra instância, sugere-se consolidar assim:

```bash
# ============================================================================
# BACKEND (Python/Flask) — .env na raiz
# ============================================================================
# Chave OpenRouteService. Opcional: sem ela "Real Roads" fica desabilitado.
# Free tier: 2000 requisições/dia. https://openrouteservice.org/dev/#/signup
ORS_API_KEY=

# Porta do Flask. Default 5001.
PORT=5001

# Flask runtime (opcionais; não lidas explicitamente pelo código)
FLASK_ENV=production
FLASK_DEBUG=0

# ============================================================================
# FRONTEND (Next.js) — frontend_base/.env.local
# ============================================================================
# URL pública do backend. Em dev, aponta para localhost:5001.
# Em produção, URL HTTPS do backend hospedado (Railway/Render/Fly/etc).
NEXT_PUBLIC_API_URL=http://localhost:5001
```

## Configs especiais

### `frontend_base/next.config.mjs`

```js
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,          // compila mesmo com erros de tipo (⚠️)
  },
  images: {
    unoptimized: true,                 // desabilita optimizador de imagens (sem Sharp)
  },
  async rewrites() {
    return [{
      source: "/api/:path*",
      destination: "http://localhost:5001/api/:path*",  // proxy dev
    }]
  },
}
```

- **`ignoreBuildErrors: true`** — o build passa mesmo com TS errors. Comum em apps gerados por ferramentas low-code; em contexto acadêmico, vale rodar `tsc --noEmit` e consertar antes do deploy.
- **`images.unoptimized: true`** — necessário se o host não rodar Node (ex.: export estático). Mantém compatibilidade com `next export` embora Next 16 desencoraje.
- **`rewrites()` hardcoda `localhost:5001`** — vai quebrar em produção. Solução: trocar por template literal com `process.env.BACKEND_URL` ou remover e depender só de `NEXT_PUBLIC_API_URL` em `lib/api.ts`.

### `frontend_base/tsconfig.json`

- `target: ES6`, `module: esnext`, `moduleResolution: bundler`, `strict: true`.
- `noEmit: true`, `jsx: react-jsx`, `incremental: true`.
- Alias `@/*` → `./*` (para `@/components`, `@/lib`, etc).
- `ignoreBuildErrors` do `next.config` contorna erros, mas `strict: true` ainda vale em editor.

### `frontend_base/postcss.config.mjs`

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

Usa o plugin Tailwind v4 (novo formato PostCSS). **Não há `tailwind.config.js`** — tudo configurado via `@theme` dentro de `app/globals.css` (padrão Tailwind 4).

### `frontend_base/components.json`

Configuração shadcn/ui:
```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
  "iconLibrary": "lucide"
}
```

Define onde novos componentes shadcn serão adicionados via `npx shadcn add ...`.

### `frontend_base/app/globals.css`

Contém variáveis CSS para tema Ibmec:
- Light mode (default): `--primary: #EAAA00` (dourado Ibmec), `--accent: #002A54` (azul Ibmec), `--background: #ffffff`.
- Dark mode: swap das mesmas variáveis para paleta escura.
- Importa `tailwindcss`, `tw-animate-css`, `leaflet/dist/leaflet.css`.
- Define `@custom-variant dark (&:is(.dark *))` para classe dark no root.

### Não existem

- `vercel.json` — **ausente**. Precisa ser criado para deploy (ver [05-vercel-deploy.md](05-vercel-deploy.md)).
- `Dockerfile`, `docker-compose.yml` — ausentes.
- `pyproject.toml`, `poetry.lock`, `setup.py` — ausentes. Apenas `requirements.txt`.
- `.eslintrc`, `eslint.config.js`, `prettier.config.js` — ausentes. Next fornece defaults.
- CI configs (`.github/workflows/*`, `.gitlab-ci.yml`) — ausentes. Não há pipeline.
- `.nvmrc`, `.node-version` — ausentes.

## Resumo de segurança

- **Secrets no `.env`:** apenas `ORS_API_KEY`. Rotate-able em openrouteservice.org se vazar.
- **Nenhum secret no código.** Nenhum hardcoded API key.
- **Analytics do Vercel:** `@vercel/analytics` é carregado em `app/layout.tsx`. Envia pageviews para o projeto Vercel quando deployado. Sem PII, mas vale disclosure.
- **ORS Authorization header:** em [backend/routing.py:145](backend/routing.py#L145) e :296 o token é enviado direto via `Authorization: <token>` (formato aceito pelo ORS). Nunca exposto ao frontend — só ao backend.
- **CORS:** `flask_cors.CORS(app)` libera tudo. Em produção, restringir para o domínio do frontend.
