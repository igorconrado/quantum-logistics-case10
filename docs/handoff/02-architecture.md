# 02 — Architecture

## Visão geral

Duas aplicações independentes em processos separados:

```
┌────────────────────────┐       HTTP JSON        ┌──────────────────────┐
│  Next.js 16 (front)    │  ───────────────────►  │  Flask 3 (backend)   │
│  localhost:3000         │   /api/* rewrite       │  localhost:5001      │
│  React 19 + TS         │  ◄───────────────────  │  Python 3.13 + Qiskit│
└────────────────────────┘                        └──────────────────────┘
           │                                                  │
           │ Leaflet tiles                                    │ HTTPS
           ▼                                                  ▼
     OpenStreetMap                                    OpenRouteService API
    (tiles públicos)                                   (rotas reais, opt-in)
```

O frontend chama o backend por fetch relativo (`/api/...`). Em dev, `next.config.mjs` define `rewrites()` que reescreve `/api/:path*` para `http://localhost:5001/api/:path*`. Em produção isso quebra (ver [05-vercel-deploy.md](05-vercel-deploy.md)).

## Estrutura de pastas — o que vive onde

### Raiz

| Caminho              | Conteúdo                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| `server.py`          | Ponto de entrada Flask. Define 9 rotas HTTP. 389 linhas.                  |
| `backend/`           | Toda a lógica de domínio (geo, solvers, routing). Importado por server.py.|
| `frontend_base/`     | App Next.js inteiro isolado.                                              |
| `test_*.py`          | Testes manuais avulsos (não pytest-idiomáticos).                          |
| `snapshots/`         | PNGs de screenshots usados no README.                                     |
| `venv/`              | Virtualenv Python (não commitado).                                        |

### backend/

| Arquivo              | Responsabilidade                                                          |
| -------------------- | ------------------------------------------------------------------------- |
| `geo.py`             | `Location`, Haversine, `DistanceMatrix`, dados das 27 capitais + bairros, `generate_route()`. |
| `classic_solver.py`  | `solve_tsp_brute_force`, `solve_tsp_nearest_neighbor`, `solve_tsp_networkx`, `solve_classic` (auto). |
| `quantum_model.py`   | `build_tsp_qubo()` constrói `QuadraticProgram` com n² variáveis e 2n constraints. |
| `quantum_solver.py`  | `solve_quantum()` converte QUBO → Ising → eigensolver, decodifica `x[i,t]` em rota. |
| `routing.py`         | Integração OpenRouteService: `get_real_route`, `get_distance_matrix_real`, cache MD5 em memória, key opcional. |

### frontend_base/

| Caminho                     | Conteúdo                                                             |
| --------------------------- | -------------------------------------------------------------------- |
| `app/layout.tsx`            | Root layout: Inter/Geist fonts, `ThemeProvider`, `<Analytics/>`.     |
| `app/page.tsx`              | Dashboard: envolve em `I18nProvider` + `RouteProvider`, layout 3 colunas (config / map / results). |
| `app/globals.css`           | Tema Ibmec (dourado #EAAA00 + azul #002A54), light/dark via next-themes. |
| `components/dashboard/`     | Componentes do dashboard (ver tabela abaixo).                        |
| `components/ui/`            | ~50 primitives shadcn (Button, Dialog, Select, Tooltip, etc).        |
| `lib/api.ts`                | Wrapper de fetch para endpoints do backend. Tipos das requests/responses. |
| `lib/route-context.tsx`     | **Estado global via React Context** (ver seção "Estado global").     |
| `lib/types.ts`              | Tipos `City`, `RouteConfig`, etc. Lista de 27 capitais duplicada em JS. Também contém TSP em JS puro (`bruteForceTSP`, `nearestNeighborTSP`, `quantumTSP` simulado) — **não usados** em runtime. |
| `lib/i18n.tsx`              | Dicionário pt-BR / en-US, `useTranslation()`.                        |
| `lib/use-api-usage.ts`      | Hook de tracking de quota ORS em localStorage (daily reset).         |
| `hooks/`, `lib/utils.ts`    | Helpers genéricos (cn, use-mobile, use-toast).                       |

## Pontos de entrada

- **Backend:** `server.py` (`if __name__ == "__main__": app.run(...)` em [server.py:362](server.py#L362)).
- **Frontend:** Next.js usa `app/layout.tsx` + `app/page.tsx` automaticamente. Sem `pages/`, sem `_app.tsx` legado.

## Fluxo de dados principal (do clique do usuário até rota renderizada)

Exemplo: usuário escolhe modo "intercidades", clica **Gerar Pontos**, depois **Calcular Rota**.

1. **UI: Config Panel.** Usuário ajusta `RouteConfig` ([lib/types.ts:33](frontend_base/lib/types.ts#L33)): `mode`, `algorithmType`, `classicalMethod` ou `quantumMethod`, `useRealRoads`, `numPoints`. Mutações chamam `updateConfig()` do `RouteContext`.
2. **Load Points.** `loadPoints()` ([lib/route-context.tsx:183](frontend_base/lib/route-context.tsx#L183)):
   - Modo `intercities`: amostra aleatória de `BRAZIL_CAPITALS` (const em `lib/types.ts`, NÃO vem do backend).
   - Modo `intracidade`: chama `GET /api/city-neighborhoods/:cityKey` ([lib/api.ts:106](frontend_base/lib/api.ts#L106)) que bate em [server.py:95](server.py#L95). Backend retorna hub + bairros daquela capital a partir de `CITIES_DATA` ([backend/geo.py:574](backend/geo.py#L574)).
   - `setSelectedCities()` popula o estado; primeiro item marcado `isHub: true`.
3. **Render Map.** `RouteMap` re-renderiza; `MapController` chama `map.fitBounds(...)` com os lat/lng. Cada cidade vira `<CircleMarker>` (hub dourado raio 14, demais azul raio 10) com `<LeafletTooltip>`.
4. **Calculate Route.** Usuário clica "Calcular Rota". `calculateRoute()` ([lib/route-context.tsx:249](frontend_base/lib/route-context.tsx#L249)):
   - Converte `selectedCities` → `BackendLocation[]` (`{id, name, lat, lon}`).
   - Chama `POST /api/calculate` com `{locations, algorithm, use_real_roads}`.
5. **Backend: /api/calculate** ([server.py:184](server.py#L184)):
   - Valida: ≥ 2 pontos, `quantum` ⇒ ≤ 4 pontos, ORS key se `use_real_roads`.
   - Se real roads → `get_distance_matrix_real(locations)` ([backend/routing.py:243](backend/routing.py#L243)) faz `POST https://api.openrouteservice.org/v2/matrix/driving-car` e cache MD5.
   - Se não → `DistanceMatrix(locations).matrix` (Haversine puro).
   - Se `algorithm == "classical"` → `solve_classic(matrix)` que escolhe brute force (n ≤ 8) ou NetworkX approximation.
   - Se `algorithm == "quantum"` → `solve_quantum(matrix, use_exact=True)`:
     1. `build_tsp_qubo(matrix)` → `QuadraticProgram`.
     2. `QuadraticProgramToQubo().convert(qp)` → penalidades absorvidas no objetivo.
     3. `MinimumEigenOptimizer(NumPyMinimumEigensolver())` ou `QAOA(COBYLA(), reps=1)`.
     4. Decodifica vetor binário n² → rota `[0, ..., 0]`.
   - Se real roads e rota válida → `get_route_with_geometry()` chama `POST /v2/directions/driving-car/geojson` para obter polilinhas reais. Fallback: segmenta em pares consecutivos se a rota inteira falhar.
6. **Response JSON:**
   ```json
   {
     "success": true,
     "route": [0, 3, 1, 2, 0],
     "total_distance": 2345.7,
     "time_ms": 12.3,
     "method": "brute_force",
     "used_real_roads": false,
     "route_geometry": [[lon,lat],...]   // só se real roads
     "total_duration_min": 180.5          // só se real roads
   }
   ```
7. **Parse e render.** `parseApiResult` ([lib/route-context.tsx:70](frontend_base/lib/route-context.tsx#L70)) mapea índices → `City[]`, multiplica por `COST_PER_KM=0.635` para custo de combustível. `setResults()` dispara re-render:
   - `ResultsPanel` mostra cartões métricos (distância, custo, tempo, duração).
   - `RouteMap` desenha `<Polyline>` com `routeGeometry` (traço cheio se real roads) ou sequência Haversine (tracejado).

## Componentes principais

### Frontend — dashboard

| Componente          | Caminho                                          | O que faz                                                                 | Props / entradas                   | Saídas                              |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| `DashboardHeader`   | `components/dashboard/header.tsx`                | Barra superior: logo, status API, seletor idioma, toggle tema, help modal.| Nenhuma (consome `useRoute`)       | Eventos de toggle tema/idioma       |
| `ConfigPanel`       | `components/dashboard/config-panel.tsx`          | Controles de modo/algoritmo/real-roads, lista draggable de waypoints, botões Calcular/Comparar. | `useRoute()` context               | Chama `updateConfig`, `loadPoints`, `calculateRoute`, `calculateComparison` |
| `RouteMap`          | `components/dashboard/route-map.tsx`             | Mapa Leaflet SSR-desabilitado, markers + polyline da rota otimizada, toggle satélite/OSM, click-to-add. | `useRoute()` context               | Chama `addCustomCity` ao clicar no mapa |
| `ResultsPanel`      | `components/dashboard/results-panel.tsx`         | Cards de métricas, card de comparação quantum/classical, sequência otimizada, export CSV/print, aba histórico. | `useRoute()` context               | Gera CSV em blob local              |
| `DistanceMatrix`    | `components/dashboard/distance-matrix.tsx`       | Heatmap da matriz de distâncias Haversine entre pontos selecionados. Usa `generateDistanceMatrix` do `lib/types.ts` (compute no cliente, NÃO do backend). | `useRoute()` context               | Visualização pura                   |
| `PerformanceChart`  | `components/dashboard/performance-chart.tsx`     | LineChart Recharts do histórico de cálculos. Presente mas não incluído no page.tsx. | `useRoute()` context (history)     | Visualização pura                   |
| `HelpModal`         | `components/dashboard/help-modal.tsx`            | Modal com explicação de algoritmos/limites.                               | Trigger via header                 | —                                   |
| `MobileNav`         | `components/dashboard/mobile-nav.tsx`            | Bottom tabs em mobile (config/map/results/history).                       | `activeTab`, `onTabChange`         | Eventos de mudança de aba           |
| `ThemeProvider`     | `components/theme-provider.tsx`                  | Wrapper next-themes.                                                      | `attribute`, `defaultTheme`, etc.  | Aplica classe `.dark`               |
| `ThemeToggleSimple` | `components/theme-toggle.tsx`                    | Botão sol/lua.                                                            | —                                  | Toggle                              |

### Backend — funções

| Função                        | Arquivo/linha                              | Entrada                                              | Saída                                                                         |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `haversine(lat1,lon1,lat2,lon2)` | [backend/geo.py:28](backend/geo.py#L28)    | 4 floats (graus)                                     | distância em km                                                               |
| `DistanceMatrix(locations)`   | [backend/geo.py:74](backend/geo.py#L74)    | `List[Location]`                                     | `np.ndarray NxN`                                                              |
| `generate_route(city_key, algorithm_type, num_points)` | [backend/geo.py:588](backend/geo.py#L588) | string, "classical"/"quantum", int | `List[Location]` — hub + amostra aleatória de bairros                         |
| `build_tsp_qubo(distance_matrix, penalty=None)` | [backend/quantum_model.py:15](backend/quantum_model.py#L15) | matriz NxN, penalidade opcional | `QuadraticProgram` com n² vars binárias e 2n constraints                      |
| `solve_quantum(matrix, use_exact=True)` | [backend/quantum_solver.py:73](backend/quantum_solver.py#L73) | matriz NxN, bool                | `{route, total_distance, method, time_ms, success, [error]}`                  |
| `decode_quantum_solution(vector, n)` | [backend/quantum_solver.py:21](backend/quantum_solver.py#L21) | vetor binário n²                 | `List[int]` — rota fechada começando em 0                                     |
| `solve_classic(matrix, force_method=None)` | [backend/classic_solver.py:165](backend/classic_solver.py#L165) | matriz NxN                       | idem solve_quantum                                                            |
| `get_distance_matrix_real(locations)` | [backend/routing.py:243](backend/routing.py#L243) | `List[{lat,lon}]`                                  | `RealDistanceMatrix(distances, durations, success, error)` via ORS API        |
| `get_route_with_geometry(locations, indices)` | [backend/routing.py:415](backend/routing.py#L415) | locations + ordem               | `RealRoute(distance_km, duration_min, geometry, success)` — polilinhas reais   |

## API endpoints (Flask)

| Método | Endpoint                                  | Payload                                           | Resposta (campos principais)                                                      | Arquivo/linha                         |
| ------ | ----------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| GET    | `/`                                       | —                                                 | Render de `templates/index.html` (**arquivo não existe no repo** — quebraria)     | [server.py:33](server.py#L33)         |
| GET    | `/api/test-data`                          | —                                                 | `{success, locations: [{id,name,lat,lon}]}` — 8 pontos de SP                      | [server.py:39](server.py#L39)         |
| GET    | `/api/brazil-capitals`                    | —                                                 | `{success, locations: [...27 capitais]}`                                          | [server.py:57](server.py#L57)         |
| GET    | `/api/cities`                             | —                                                 | `{success, cities: [{id, key, name}]}`                                            | [server.py:75](server.py#L75)         |
| GET    | `/api/city-neighborhoods/<city_key>`      | path param                                        | `{success, city_name, hub:{...}, neighborhoods:[...]}`                            | [server.py:95](server.py#L95)         |
| POST   | `/api/generate-route`                     | `{city_key, algorithm, num_points}`               | `{success, city_name, locations, total_points, algorithm}`                        | [server.py:128](server.py#L128)       |
| POST   | `/api/calculate`                          | `{locations:[...], algorithm, use_real_roads}`    | `{success, route, total_distance, time_ms, method, used_real_roads, [route_geometry], [total_duration_min]}` | [server.py:184](server.py#L184) |
| GET    | `/api/routing-status`                     | —                                                 | `{success, real_roads_available, api_configured, message}`                        | [server.py:312](server.py#L312)       |
| POST   | `/api/set-api-key`                        | `{api_key}`                                       | `{success, message}` / `{success:false, error}`                                   | [server.py:324](server.py#L324)       |
| GET    | `/api/health`                             | —                                                 | `{status, service, real_roads_available}`                                         | [server.py:351](server.py#L351)       |

**Observação:** a rota `/` tenta renderizar `templates/index.html` que **não existe** no repo — esse endpoint está morto desde que o frontend foi migrado para Next.js. Tentar acessá-lo direto estoura 500. Não é um problema porque o Next.js serve a UI.

**Observação 2:** há discrepância README × código. README documenta `/api/test-data`, `/api/brazil-capitals`, `/api/cities`, `/api/city/<city_key>`, `/api/generate-route`, `/api/calculate`, `/api/routing-status`, `/api/set-api-key`. O endpoint real para buscar bairros é `/api/city-neighborhoods/<city_key>` — não `/api/city/<city_key>`.

## Estado global (frontend)

**Única fonte de verdade:** `RouteContext` em [frontend_base/lib/route-context.tsx](frontend_base/lib/route-context.tsx).

Montado no `DashboardContent` envolvendo também `I18nProvider` ([app/page.tsx:146](frontend_base/app/page.tsx#L146)).

**Não usa** Zustand, Redux, Jotai, Recoil, TanStack Query. Puro `createContext` + `useState` + `useCallback` + `useMemo`.

Estado guardado:

| Campo                  | Tipo                                | O que é                                                                                |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------------------- |
| `selectedCities`       | `City[]`                            | Lista ordenada dos pontos atuais (primeiro = hub).                                     |
| `config`               | `RouteConfig`                       | Modo, algoritmo, método, real roads, `numPoints`.                                      |
| `results`              | `RouteResult \| null`               | Último resultado do backend, parseado.                                                 |
| `comparison`           | `ComparisonResult`                  | `{classical, quantum, speedup, distanceDiff}` quando usuário aciona comparar.          |
| `isCalculating`        | `boolean`                           | Loading state global.                                                                  |
| `calculationProgress`  | `number`                            | Progresso fake (incremento aleatório) para feedback visual.                            |
| `history`              | `CalculationHistory[]`              | Últimos 10 cálculos em memória (não persistido).                                       |
| `apiStatus`            | `{online, hasApiKey}`               | Resultado de `GET /api/routing-status` ao montar.                                      |
| `apiUsage`             | `{used,limit,remaining,...}`        | Quota ORS local (localStorage, daily reset) — do hook `useApiUsage`.                   |
| `isLoadingPoints`      | `boolean`                           | Flag de loading de `loadPoints()`.                                                     |

**Persistência:** apenas `ors_api_usage` em localStorage (chave `STORAGE_KEY`). Histórico de cálculos e configuração atual NÃO sobrevivem a reload.

**Hook auxiliar:** `useTranslation()` vem de `I18nProvider` (`lib/i18n.tsx`), que mantém locale em `useState` (default `"pt-BR"`) e expõe dicionário flat com chaves como `"config.routeScope"`. Interpolação simples `{varName}` via regex.
