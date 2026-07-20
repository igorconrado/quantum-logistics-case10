# 01 — Stack

## Linguagens e versões

- **Python:** 3.13.7 instalado localmente. `requirements.txt` não fixa versão mínima de Python, mas Qiskit 2.x exige Python ≥ 3.9. Não há `.python-version` nem `pyproject.toml`.
- **TypeScript:** 5.x (`"typescript": "^5"` em devDependencies).
- **Node.js:** não há `.nvmrc` nem `engines` em `package.json`. Next.js 16 exige Node ≥ 20.
- **Target JS:** ES6 (`tsconfig.json:target`), `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `strict: true`.

## Framework principal

- **Frontend:** Next.js **16.0.10** (App Router, RSC habilitado via `components.json`).
- **Backend:** Flask **3.1.2** (do venv; `requirements.txt` exige `>=3.0.0`).
- **Arquitetura:** duas aplicações separadas. Next roda em `:3000` (dev), Flask em `:5001`. O Next proxia `/api/*` via `rewrites()` em `next.config.mjs` para `http://localhost:5001/api/*`.

## Gerenciador de pacotes

- **Frontend:** npm. O lockfile ativo é `package-lock.json` (147 KB). Há um `pnpm-lock.yaml` no repo mas é stub vazio (só contém header `lockfileVersion: '9.0'`) — provavelmente gerado por acidente; pode ser deletado.
- **Backend:** pip + venv clássico. Diretório `venv/` está na raiz, ignorado pelo git. Não há `pyproject.toml`, `poetry.lock`, nem `uv.lock`.

## Dependências Python (requirements.txt)

```
flask>=3.0.0
flask-cors>=4.0.0
qiskit>=0.45.0
qiskit-aer>=0.13.0
qiskit-algorithms>=0.3.0
qiskit-optimization>=0.6.0
networkx>=3.1
numpy>=1.24.0
pandas>=2.0.0
matplotlib>=3.7.0
requests>=2.31.0
python-dotenv>=1.0.0
```

Versões efetivamente instaladas no `venv/` (inspecionadas via dist-info):

- `qiskit==2.3.0`
- `qiskit-aer==0.17.2`
- `qiskit-algorithms==0.4.0`
- `qiskit-optimization==0.7.0`
- `flask==3.1.2`
- `flask-cors==6.0.2`
- `networkx==3.6.1`
- `numpy` (via scipy 1.17.0, pandas 3.0.0)
- `matplotlib==3.10.8`
- `requests==2.32.5`
- `python-dotenv==1.2.1`
- `docplex==2.31.254` (puxada transitivamente por qiskit-optimization)

**Nota:** `pandas` e `matplotlib` estão listados mas não são usados em runtime do servidor — pandas não aparece em nenhum import e matplotlib só seria usado em scripts de debug isolados.

## Dependências frontend (package.json)

### Produção

Framework e core:
- `next@16.0.10`
- `react@19.2.0`, `react-dom@19.2.0`
- `@vercel/analytics@1.3.1`

UI (shadcn + Radix):
- `@radix-ui/react-*` (28 pacotes — accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip)
- `lucide-react@^0.454.0` (ícones)
- `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.3.1`, `tailwindcss-animate@^1.0.7`
- `cmdk@1.0.4`, `sonner@^1.7.4`, `vaul@^1.1.2`, `input-otp@1.4.1`, `embla-carousel-react@8.5.1`
- `react-day-picker@9.8.0`, `date-fns@4.1.0`
- `react-hook-form@^7.60.0`, `@hookform/resolvers@^3.10.0`, `zod@3.25.76`
- `react-resizable-panels@^2.1.7`
- `@emotion/is-prop-valid@latest`

Mapa:
- `leaflet@1.9.4`
- `react-leaflet@5.0.0`

Animação e gráficos:
- `framer-motion@12.29.2`
- `recharts@2.15.4`

Tema:
- `next-themes@^0.4.6`

Misc:
- `autoprefixer@^10.4.20`

### Dev

- `typescript@^5`
- `@types/node@^22`, `@types/react@^19`, `@types/react-dom@^19`, `@types/leaflet@^1.9.8`
- `tailwindcss@^4.1.9`, `@tailwindcss/postcss@^4.1.9`, `postcss@^8.5`
- `tw-animate-css@1.3.3`

## Bibliotecas quânticas

- **Qiskit 2.3.0** (framework base)
- **Qiskit Aer 0.17.2** (simulador — importado mas não usado diretamente no código do solver; o solver usa `NumPyMinimumEigensolver` puro)
- **Qiskit Algorithms 0.4.0** (`NumPyMinimumEigensolver`, `QAOA`, `COBYLA` optimizer)
- **Qiskit Optimization 0.7.0** (`QuadraticProgram`, `QuadraticProgramToQubo`, `MinimumEigenOptimizer`)

**Não há** simulador quântico custom, nem `qiskit.js` no frontend. Toda a parte quântica roda em Python no backend.

## Scripts do package.json (frontend)

```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  "lint": "eslint .",
  "start": "next start"
}
```

| Script   | Uso                                                                                   |
| -------- | ------------------------------------------------------------------------------------- |
| `dev`    | Sobe servidor Next.js em `http://localhost:3000` com hot reload. Usa proxy `/api/*`.  |
| `build`  | Produz build de produção em `.next/`. **OBS:** `ignoreBuildErrors: true` em ts config — compila mesmo com erros de tipo. |
| `start`  | Roda o build em modo produção. Requer `build` antes.                                  |
| `lint`   | ESLint sobre o projeto. Não há `eslint.config.js` no diretório — usa defaults do Next. |

Não há script para testes, format, typecheck standalone, nem pre-commit hooks.

## Backend — comandos (sem scripts formais)

Ponto de entrada único: `python server.py`. Porta padrão `5001` (sobrescrita via `PORT` env var em [server.py:364](server.py#L364)).

Testes avulsos:
```bash
python test_api.py
python test_capitals.py
python test_depot_selection.py
python test_implementation.py
python test_point_selection.py
pytest test_*.py -v      # o README sugere, mas pytest não está em requirements.txt
```

Módulos individuais podem ser rodados standalone para teste (cada um tem um bloco `if __name__ == "__main__"`):
```bash
python backend/geo.py
python backend/classic_solver.py
python backend/quantum_model.py
python backend/quantum_solver.py
python backend/routing.py
```
