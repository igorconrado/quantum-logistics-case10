# 05 — Vercel Deploy

> **Leia primeiro a seção "Arquitetura — por que Vercel sozinho não cobre o app inteiro"**. Pular para comandos sem entender isso leva a deploy quebrado.

## Arquitetura — por que Vercel sozinho não cobre o app inteiro

Vercel é otimizado para Next.js + serverless functions. Funciona perfeitamente para **o frontend** deste projeto. **Não** funciona bem para o backend Flask atual, pelos seguintes motivos:

1. **Tamanho do bundle do backend.** Qiskit + Qiskit Aer + NumPy/SciPy/NetworkX + docplex somam centenas de MB. Os limites de Vercel Python functions são ~250 MB descompactado. Fica apertado e frequentemente estoura.
2. **Cold start + tempo de execução.** Importar Qiskit leva segundos. QAOA em statevector pode levar 10+ s. Vercel mata funções serverless após 10 s (Hobby) ou 60 s (Pro). Usuário iria ver timeout.
3. **Estado em memória.** O cache de rotas (`_route_cache`, `_matrix_cache` em `backend/routing.py`) depende de processo persistente. Serverless descarta memória entre invocações.
4. **Render legacy.** `server.py:33` renderiza `templates/index.html` que nem existe mais — mas enquanto essa rota existir, Flask precisa do diretório `templates/`.

**Caminhos possíveis:**

| Estratégia                                                              | Prós                                                        | Contras                                                                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **A — Vercel (frontend) + Railway/Render/Fly.io (backend)**             | Sem refactor, arquitetura do app preservada.                | 2 deploys separados, 2 custos, configurar CORS e `NEXT_PUBLIC_API_URL`.                |
| **B — Só frontend no Vercel, backend mockado com dados estáticos**      | 1 deploy. Bom para demo de UI.                              | Perde parte quântica. Só serve se o objetivo for vitrine visual.                       |
| **C — Reescrever backend como Vercel Python serverless slim**           | 1 deploy só.                                                | Muito trabalho. Provavelmente precisa remover Qiskit/QAOA do endpoint (ou chamar IBM Quantum Runtime por HTTP, o que é outra reescrita). |
| **D — Containerizar tudo e ir pra Fly.io / Render** (sem Vercel)        | Um lugar só, fácil de manter paridade local/prod.           | Sai do escopo do pedido de "deploy no Vercel".                                         |

**Recomendação:** Estratégia **A**. Documentada abaixo em detalhe.

---

## Pré-requisitos

| Requisito                                         | Como instalar                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Conta Vercel                                      | https://vercel.com/signup (login com GitHub preferido)                                   |
| Vercel CLI                                        | `npm install -g vercel` (requer Node ≥ 20)                                               |
| Conta Railway **ou** Render **ou** Fly.io         | https://railway.app/ , https://render.com/ , https://fly.io/                             |
| CLI da plataforma do backend                      | Railway: `npm i -g @railway/cli`. Render usa só dashboard. Fly: `brew install flyctl`.   |
| Git + GitHub                                      | Já presente. Repo precisa estar pushado no GitHub (Vercel puxa de lá).                    |
| Node ≥ 20                                         | `brew install node` (macOS) ou nvm                                                       |
| Python 3.11+ no host do backend                   | Railway e Render detectam automaticamente via `requirements.txt`                         |

Verifique versões:
```bash
node --version      # ≥ 20
npm --version
vercel --version
python3 --version
git --version
```

---

## Estratégia A — Passo a passo (frontend no Vercel, backend no Railway)

Use Railway aqui porque é o caminho mais rápido; as notas para Render/Fly ficam no final.

### Passo 1 — Preparar o repositório

O repo atual tem frontend e backend misturados. Vercel precisa saber **qual subpasta é o Next.js**. Duas formas:

**1A.** No Vercel, definir "Root Directory" = `frontend_base` (recomendado, sem mexer no repo).

**1B.** Mover Next.js para a raiz (desnecessário para este deploy).

Mantenha `1A`. Apenas garanta que o repo esteja pushed:

```bash
git status                                # deve estar clean
git push origin main
```

### Passo 2 — Ajustar código para produção (antes do deploy)

São 3 edits pequenos. Todos em `frontend_base/`.

**2.1 — Remover o rewrite hardcoded de `next.config.mjs`.** O rewrite aponta para `localhost:5001`, que não existe em produção. A chamada já usa `NEXT_PUBLIC_API_URL` em `lib/api.ts`, então o rewrite é só para dev.

Edite `frontend_base/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  async rewrites() {
    // Só aplica rewrite em desenvolvimento. Em produção, lib/api.ts usa
    // NEXT_PUBLIC_API_URL direto.
    if (process.env.NODE_ENV === "development") {
      return [
        { source: "/api/:path*", destination: "http://localhost:5001/api/:path*" },
      ]
    }
    return []
  },
}

export default nextConfig
```

**2.2 — Garantir que `lib/api.ts` sempre use URL absoluta em produção.** Já faz isso via `process.env.NEXT_PUBLIC_API_URL`. Apenas confirme que não há chamada `fetch("/api/...")` bypassing o wrapper — uma busca rápida:
```bash
grep -rn "fetch(\"/api\|fetch('/api" frontend_base/
```
Se não retornar nada de dentro de `frontend_base/lib` e `frontend_base/components`, está OK. (Numa checagem rápida: o `lib/api.ts` é o único ponto de entrada.)

**2.3 — Criar `vercel.json` opcional.** Não é obrigatório quando Root Directory está definido, mas documenta:
```bash
cat > frontend_base/vercel.json <<'EOF'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "outputDirectory": ".next"
}
EOF
```

Commit:
```bash
git checkout -b chore/vercel-deploy
git add frontend_base/next.config.mjs frontend_base/vercel.json
git commit -m "chore: prepare frontend for Vercel deploy"
git push -u origin chore/vercel-deploy
```
Merge no `main` via PR (seguindo a regra de branching do seu CLAUDE.md global), ou direto se for solo.

### Passo 3 — Deploy do backend Flask no Railway

Railway detecta Python pelo `requirements.txt` na raiz. Mas precisa saber como iniciar. Adicione um `Procfile` na raiz do repo:

```bash
cat > Procfile <<'EOF'
web: gunicorn server:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
EOF
```

Adicione `gunicorn` ao `requirements.txt`:
```bash
echo "gunicorn>=21.0.0" >> requirements.txt
```

Commit:
```bash
git add Procfile requirements.txt
git commit -m "chore: add gunicorn and Procfile for Railway deploy"
git push
```

Depois, no Railway:

```bash
railway login                             # abre browser p/ autenticar
railway init                              # cria projeto a partir do repo atual
# Selecione "Empty Project" ou conecte ao GitHub repo
railway link                              # se o projeto já existir
railway up                                # primeiro deploy
```

Variáveis de ambiente no Railway (dashboard ou CLI):

```bash
railway variables set ORS_API_KEY=<sua_key_ors>
railway variables set FLASK_ENV=production
railway variables set FLASK_DEBUG=0
# PORT é definido automaticamente pelo Railway
```

Após o deploy, o Railway dá uma URL tipo `https://quantum-logistics-production.up.railway.app`. Teste:

```bash
curl https://<sua-url>.railway.app/api/health
# Esperado: {"status":"healthy","service":"quantum-logistics-api","real_roads_available":true}
```

**Gotcha:** o `/` serve `render_template('index.html')` que não existe. Ignore — só os `/api/*` importam.

### Passo 4 — Deploy do frontend no Vercel

Via dashboard (mais simples):

1. Acesse https://vercel.com/new
2. "Import Git Repository" → selecione o repo `quantum_logistics_case10`.
3. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detectado).
   - **Root Directory:** `frontend_base`  ← crítico, clique em "Edit" e selecione.
   - **Build Command:** deixe default (`next build`).
   - **Output Directory:** deixe default (`.next`).
   - **Install Command:** `npm install` (default).
4. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL` = `https://<sua-url>.railway.app`  (URL pública do backend do passo 3, sem trailing slash)
5. Clique **Deploy**. Build leva 1-3 min.

Via CLI (alternativa):

```bash
cd frontend_base
vercel login
vercel link                               # associa esta pasta a um projeto Vercel
# Vai perguntar: scope, projeto existente ou novo, root dir
vercel env add NEXT_PUBLIC_API_URL production
# Cole a URL do Railway quando pedir
vercel --prod                             # deploy em produção
```

### Passo 5 — Configurar CORS no backend

O `CORS(app)` em `server.py:30` já libera tudo (`*`). Em produção, restrinja:

```python
# em server.py, substituir CORS(app) por:
from flask_cors import CORS
CORS(app, resources={r"/api/*": {"origins": ["https://<seu-projeto>.vercel.app"]}})
```

Commit, push, Railway redeploya automaticamente.

### Passo 6 — Testar a integração

1. Abra `https://<seu-projeto>.vercel.app`.
2. Verifique no header se o badge de status API aparece como "Online" (verde).
3. Tente gerar pontos e calcular uma rota clássica (não precisa ORS).
4. Se "Real Roads" estiver ligado, verifique que `ORS_API_KEY` está setada no Railway.

Logs:
- Frontend: `vercel logs <url>` ou dashboard → Deployments → Runtime Logs.
- Backend: `railway logs` ou dashboard do Railway.

### Passo 7 — Domínio custom (opcional)

- Vercel: Settings → Domains → adicionar `quantumlogistics.seudominio.com.br`.
- Depois atualizar CORS no backend para incluir o domínio custom.

---

## Comandos condensados (zero-to-deploy)

Assumindo repo já clonado, `main` limpo, e credenciais prontas:

```bash
# 1. Prep do código
cd "/Users/igorconrado/Documents/projects/quantum computing/quantum_logistics_case10"

# Edite frontend_base/next.config.mjs (condicional rewrite) — ver Passo 2.1
# Crie frontend_base/vercel.json — ver Passo 2.3

# 2. Backend on Railway
cat > Procfile <<'EOF'
web: gunicorn server:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
EOF
echo "gunicorn>=21.0.0" >> requirements.txt

git checkout -b chore/deploy
git add Procfile requirements.txt frontend_base/next.config.mjs frontend_base/vercel.json
git commit -m "chore: prep for Vercel + Railway deploy"
git push -u origin chore/deploy
# Abra PR e merge em main

# 3. Deploy backend
npm install -g @railway/cli
railway login
railway init
railway up
railway variables set ORS_API_KEY=<sua_key> FLASK_ENV=production FLASK_DEBUG=0
railway open                              # abre URL no browser
# Copie a URL pública (ex.: https://xxx.up.railway.app)

# 4. Deploy frontend
cd frontend_base
npm install -g vercel
vercel login
vercel link                               # Root Directory = . (já está em frontend_base)
vercel env add NEXT_PUBLIC_API_URL production
# Cole https://xxx.up.railway.app
vercel --prod

# 5. Confirmação
curl https://xxx.up.railway.app/api/health
open https://<projeto>.vercel.app
```

---

## Alternativas ao Railway

### Render (web dashboard)

1. https://dashboard.render.com/ → "New +" → "Web Service".
2. Conecte o repo GitHub.
3. Root Directory: `.` (raiz do repo).
4. Environment: Python 3.
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `gunicorn server:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
7. Instance Type: **Starter** (free tier tem timeout agressivo; pode não aguentar QAOA).
8. Environment Variables: `ORS_API_KEY`, `FLASK_ENV=production`.

Vantagem: grátis para projetos pequenos, SSL automático. Desvantagem: free tier hiberna após inatividade (cold start longo).

### Fly.io (Docker-based)

Requer `Dockerfile` e `fly.toml`. Esforço maior mas mais controle:

```bash
brew install flyctl
fly launch                                # gera Dockerfile + fly.toml interativamente
fly secrets set ORS_API_KEY=<key>
fly deploy
```

Fly tem VM sempre ligada no plano Hobby ($5/mês), sem cold start.

### Se tentar forçar o backend no Vercel

Existe o plano "Vercel Python Functions". Mas:
- `requirements.txt` precisa ficar em `/api/` com função serverless por endpoint.
- Limite de 250 MB de código compactado vs Qiskit ~200 MB → apertado e provavelmente falha.
- Timeout 10 s (Hobby) / 60 s (Pro).

Não recomendado sem uma reescrita significativa.

---

## Checklist pós-deploy

- [ ] `https://<app>.vercel.app` carrega sem erros no console do browser.
- [ ] Badge "API Online" no header aparece verde.
- [ ] `GET /api/health` do backend retorna 200.
- [ ] Calcular rota clássica com 5 pontos funciona.
- [ ] Calcular rota quântica com 3 pontos funciona.
- [ ] Se tiver ORS key: toggle "Real Roads" funciona e desenha polilinha contínua.
- [ ] Logs do backend não mostram erros de CORS ou 401.
- [ ] Analytics do Vercel recebe pageviews.
- [ ] Custo mensal estimado < R$50 (Railway Hobby ~$5/mês + Vercel Hobby grátis).

## Gotchas frequentes

1. **`NEXT_PUBLIC_API_URL` não atualiza.** Variáveis `NEXT_PUBLIC_*` são congeladas em build time. Se mudar a env, precisa **redeploy** do Vercel (não só redeploy do backend).
2. **CORS error no browser.** Backend responde mas o frontend recusa. Atualize `CORS(app, origins=[...])` com o domínio exato do Vercel (incluindo `https://`).
3. **Timeout em rotas com Real Roads + muitos pontos.** A matriz ORS é O(n²) em requests; com n=10 são 45 calls. Aumente `timeout` no gunicorn (`--timeout 120`).
4. **`render_template('index.html')` erro 500 em `GET /`.** Esperado. Só use `/api/*`. Pode deletar a rota `/` do server.py se quiser limpar logs.
5. **`pnpm-lock.yaml` + `package-lock.json` conflitando.** Delete o `pnpm-lock.yaml` (stub vazio). Vercel fica confuso se encontrar dois lockfiles.
6. **Build falha por TS.** `ignoreBuildErrors: true` deve cobrir, mas se mudar isso, rode `npx tsc --noEmit` antes.
7. **Build falha por `leaflet` + SSR.** O `route-map.tsx` usa `dynamic(..., { ssr: false })`. Não mexer nesse padrão.

## Custos estimados (Abril 2026)

- **Vercel Hobby:** $0/mês (limite de 100 GB-hrs de compute, suficiente para demo).
- **Railway Hobby:** $5/mês starter ($0.01/GB-hr de execução depois).
- **OpenRouteService:** grátis até 2.000 req/dia.
- **Domain custom (opcional):** R$40-80/ano via Registro.br.

Total realista para demo acadêmica: **~$5/mês**.
