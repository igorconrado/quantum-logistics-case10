# 00 — Overview

## Identidade

- **Nome:** quantum_logistics_case10
- **Repositório:** github.com/igorconrado/quantum_logistics_case10
- **Autor:** Igor Conrado (conradoigor78@gmail.com)
- **Licença:** MIT
- **Branch atual:** `main`
- **Último commit:** c384500 "fix: resolve server port conflict and proxy timeout issues"

## Propósito (2 frases)

Aplicação web de otimização híbrida clássico-quântica para o Traveling Salesman Problem (TSP) no contexto de logística brasileira, baseada no Case 10 da KPMG/TDC Net Danish Quantum Cases. Traduz o TSP em formulação QUBO e resolve via simulador Qiskit (NumPyMinimumEigensolver ou QAOA), comparando com algoritmos clássicos (brute force, nearest neighbor, NetworkX/Christofides) sobre as 27 capitais brasileiras e seus bairros.

## Estado atual

- **Funciona?** Sim, localmente. Frontend Next.js + backend Flask rodam em paralelo com proxy de `/api/*` do Next para `http://localhost:5001`.
- **Quebrado?** Não há falhas conhecidas. O último commit fixou conflitos de porta e timeout de proxy.
- **Em construção?** Estável. Features futuras listadas no README (multi-vehicle, QAOA tuning, hardware real IBM, time windows) NÃO estão implementadas.
- **Testes:** existem `test_*.py` na raiz (5 arquivos). Não há testes no frontend. Não há CI configurada.
- **Deploy:** não está em produção. Há `@vercel/analytics` instalado no frontend, mas nenhum `vercel.json` nem config de deploy.

## Mapeamento com Hughes et al. ("Quantum Computing for the Quantum Curious", 2021)

**IMPORTANTE — este é o ponto mais delicado para discussão com o orientador:**

O projeto **NÃO implementa** os algoritmos canônicos cobertos no Hughes (BB84, Deutsch-Jozsa, teleportação, Grover, Bloch sphere, operações Pauli/Hadamard explícitas). O Hughes é um texto introdutório focado em fundamentos (superposição, entrelaçamento, medição, circuitos pequenos).

O que o projeto faz é um passo adiante: **otimização combinatória variacional** (QUBO → Ising → QAOA/eigensolver), tema que o Hughes apenas tangencia. A ponte conceitual é:

| Conceito Hughes                   | Presença no projeto                                              |
| --------------------------------- | ---------------------------------------------------------------- |
| Qubits e superposição             | Implícito — QAOA opera sobre superposição de estados-solução     |
| Entrelaçamento                    | Implícito no ansatz QAOA                                         |
| Medição / colapso                 | Implícito no `MinimumEigenOptimizer` ao ler a solução binária    |
| Hadamard, Pauli, CNOT             | Não aparecem no código do projeto (encapsulados dentro do Qiskit)|
| BB84 (Cap. de criptografia)       | **Não implementado**                                             |
| Deutsch-Jozsa                     | **Não implementado**                                             |
| Teleportação                      | **Não implementado**                                             |
| Grover                            | **Não implementado**                                             |
| Bloch sphere / visualização       | **Não implementado** (nenhuma viz de estado quântico no UI)      |

O que **está** implementado e é o coração "quântico" do projeto:

1. **Formulação QUBO do TSP** ([backend/quantum_model.py:15](backend/quantum_model.py#L15)) — variáveis binárias `x[i,t]`, constraints como penalidades, objetivo quadrático.
2. **Minimum Eigensolver** ([backend/quantum_solver.py:114](backend/quantum_solver.py#L114)) — `NumPyMinimumEigensolver` (exato, clássico sobre a matriz Hamiltoniana). Nome "quantum_exact" no código.
3. **QAOA** ([backend/quantum_solver.py:121](backend/quantum_solver.py#L121)) — `qiskit_algorithms.QAOA` com otimizador COBYLA e `reps=1`. Importado sob demanda. Este sim é o algoritmo variacional quântico genuíno (ansatz trotterizado do Hamiltoniano de custo).

**Honestidade técnica para o artigo:** o modo padrão (`use_exact=True`) resolve o problema por diagonalização clássica da matriz Hamiltoniana — não há vantagem quântica real. A demonstração quântica legítima é o caminho QAOA, mas rodando em simulador local (Qiskit Aer), nunca em hardware IBM Q.

## Árvore de diretórios (até 3 níveis, sem node_modules, .next, .git, venv, __pycache__)

```
quantum_logistics_case10/
├── LICENSE
├── README.md                        (14 KB)
├── CONTRIBUTING.md
├── GITHUB_SETUP.md
├── IMPLEMENTATION_GUIDE.md
├── requirements.txt                 (Python deps)
├── server.py                        (Flask entry point, 389 linhas)
├── .env                             (ORS_API_KEY em texto plano — NÃO commitado)
├── .env.example
├── .gitignore
├── test_api.py
├── test_capitals.py
├── test_depot_selection.py
├── test_implementation.py
├── test_point_selection.py
├── snapshots/                       (6 PNGs de screenshots)
│   ├── 01_initial_light.png
│   ├── 02_initial_dark.png
│   ├── 03_points_generated.png
│   ├── 04_route_calculated_light.png
│   ├── 05_route_calculated_dark.png
│   └── 06_comparison_dark.png
├── backend/
│   ├── __init__.py
│   ├── geo.py                       (Haversine + 27 capitais + CITIES_DATA, 693 linhas)
│   ├── classic_solver.py            (brute force + nearest neighbor + NetworkX, 266 linhas)
│   ├── quantum_model.py             (QUBO builder, 164 linhas)
│   ├── quantum_solver.py            (NumPyMinimumEigensolver / QAOA, 199 linhas)
│   └── routing.py                   (OpenRouteService integration, 542 linhas)
└── frontend_base/                   (Next.js 16 app)
    ├── package.json                 (deps)
    ├── package-lock.json            (npm — lockfile real, 147KB)
    ├── pnpm-lock.yaml               (existe mas é stub vazio)
    ├── next.config.mjs              (proxy rewrites /api → :5001)
    ├── tsconfig.json
    ├── postcss.config.mjs
    ├── components.json              (shadcn config)
    ├── .env.local                   (NEXT_PUBLIC_API_URL=http://localhost:5001)
    ├── app/
    │   ├── layout.tsx               (RootLayout + ThemeProvider + @vercel/analytics)
    │   ├── page.tsx                 (Dashboard root)
    │   └── globals.css              (tema Ibmec light/dark)
    ├── components/
    │   ├── theme-provider.tsx
    │   ├── theme-toggle.tsx
    │   ├── dashboard/
    │   │   ├── header.tsx
    │   │   ├── config-panel.tsx     (controles de rota/algoritmo)
    │   │   ├── route-map.tsx        (Leaflet)
    │   │   ├── results-panel.tsx    (métricas + histórico)
    │   │   ├── distance-matrix.tsx
    │   │   ├── performance-chart.tsx (Recharts)
    │   │   ├── help-modal.tsx
    │   │   └── mobile-nav.tsx
    │   └── ui/                      (~50 componentes shadcn)
    ├── hooks/
    │   ├── use-mobile.ts
    │   └── use-toast.ts
    ├── lib/
    │   ├── api.ts                   (fetch wrappers)
    │   ├── route-context.tsx        (estado global React Context)
    │   ├── types.ts                 (City, RouteConfig, capitais, TSPs em JS)
    │   ├── i18n.tsx                 (pt-BR / en-US)
    │   ├── use-api-usage.ts         (quota ORS)
    │   └── utils.ts
    ├── public/                      (ícones, SVGs)
    └── styles/
        └── globals.css
```

## Tamanho aproximado

Contagem feita por `find ... | xargs wc -l` em 2026-04-24:

| Categoria                       | Arquivos | LOC    |
| ------------------------------- | -------- | ------ |
| Python (backend + server + tests) | 12       | 2.973  |
| TypeScript React (.tsx)         | ~70      | 9.307  |
| TypeScript (.ts)                | ~8       | 868    |
| CSS                             | 2        | 522    |
| **Total código-fonte**          | ~102     | ~13.670 |

Exclui: `venv/`, `frontend_base/node_modules/`, `frontend_base/.next/`, `__pycache__/`, lockfiles.

Peso real em disco dominado por `venv/` (~500 MB, Qiskit + numpy/scipy/matplotlib) e `node_modules/` — ambos em `.gitignore`.
