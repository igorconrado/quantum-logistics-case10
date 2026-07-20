# 03 — Quantum Implementation

> **Parte mais importante para o orientador.** Este documento é deliberadamente honesto sobre o que é e o que **não é** computação quântica no projeto.

## Resumo de uma frase

O projeto implementa **uma única técnica** de computação quântica: a formulação QUBO do TSP executada por um `MinimumEigenOptimizer` do Qiskit, com dois backends selecionáveis — um eigensolver clássico exato (`NumPyMinimumEigensolver`, padrão) e um `QAOA` variacional com simulador local. Nenhum outro algoritmo canônico de QC (BB84, Deutsch-Jozsa, Grover, teleportação) está implementado.

## Mapeamento algoritmo × Hughes

Hughes, C., Isaacson, J., Perry, A., Sun, R. F., Turner, K. — *Quantum Computing for the Quantum Curious* (Springer, 2021, open access) — cobre:

| Hughes (capítulo / tema)                                     | Cobertura no projeto                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Cap. 1 — "What is a Qubit?"  (superposição, spin)             | Ausente no código. Pode ser citado como background teórico no artigo.                                   |
| Cap. 2 — "What is Quantum Entanglement?"                      | Ausente. O ansatz QAOA cria entrelaçamento, mas isso é invisível ao usuário/código do projeto.          |
| Cap. 3 — "Quantum Cryptography" (BB84)                        | **Não implementado.**                                                                                   |
| Cap. 4 — "Quantum Game Theory" (CHSH)                         | **Não implementado.**                                                                                   |
| Cap. 5 — "Quantum Teleportation"                              | **Não implementado.**                                                                                   |
| Cap. 6 — "Quantum Algorithms" (Deutsch-Jozsa)                 | **Não implementado.**                                                                                   |
| Cap. 7 — "The Quantum Computing Landscape"                    | Contexto geral; não requer código.                                                                      |
| *Extra além do Hughes* — **QAOA / QUBO / Ising**              | **É o único conteúdo quântico real do projeto.** Coberto em papers (Farhi 2014) e em textos mais avançados (Nielsen & Chuang, Kadowaki-Nishimori). |

**Recomendação para discussão:** se o artigo cita Hughes como referência principal, a contribuição precisa ser enquadrada como **extensão prática** além do Hughes, não como implementação do livro. O Hughes vai até a formulação do modelo de circuito; QAOA é um passo adiante que exige VQE/Ising/Pauli decomposition. Considere adicionar Farhi et al. 2014 ("A Quantum Approximate Optimization Algorithm") como referência primária do algoritmo de fato implementado.

## Algoritmo 1 — Formulação QUBO do TSP

- **Nome:** Quadratic Unconstrained Binary Optimization para TSP simétrico.
- **Capítulo Hughes:** *não há* — esta formulação não aparece no Hughes. Ver Lucas, A. (2014) "Ising formulations of many NP problems", Frontiers in Physics.
- **Onde está no código:** [backend/quantum_model.py:15](backend/quantum_model.py#L15) — função `build_tsp_qubo(distance_matrix, penalty=None)`.
- **Como foi implementado:** construção direta de um `qiskit_optimization.QuadraticProgram`:
  - Variáveis: `x_{i}_{t}` ∈ {0,1} para cada (cidade i, instante t). Total: **n²** variáveis para n pontos.
  - Constraints lineares hard:
    - *Cada cidade visitada uma vez:* `Σ_t x[i][t] = 1` para todo i (n constraints).
    - *Cada instante tem uma cidade:* `Σ_i x[i][t] = 1` para todo t (n constraints).
  - Objetivo quadrático: `Σ_{i≠j, t} d[i,j] · x[i,t] · x[j,(t+1) mod n]` (tempo circular, retorno ao depósito).
  - Penalty: se `None`, usa `max(d) · n · 2`. Aplicada na conversão via `QuadraticProgramToQubo().convert(qp)` em [backend/quantum_solver.py:108](backend/quantum_solver.py#L108).
- **Decisões de modelagem:**
  - **Tempo circular (`(t+1) % n`):** a rota é forçada a ser um ciclo Hamiltoniano; não há variável separada para "retorno ao depósito".
  - **Simetria não explorada:** a matriz de distâncias é simétrica mas o código adiciona ambos `(i,j)` e `(j,i)` via normalização de chave — OK, mas dobra o número de termos escritos antes do Qiskit consolidar.
  - **Depósito fixo (índice 0):** imposto no decoder (`decode_quantum_solution` rota-o até começar em 0), não no QUBO. Isso deixa o QUBO simétrico sob rotação de índices temporais, o que pode criar degenerescência — o eigensolver encontra uma das soluções equivalentes e o decoder normaliza.
- **Limitações conhecidas:**
  - Número de variáveis cresce quadraticamente (**n²**), o que já é a codificação compacta padrão mas ainda cara. Para n=4: 16 vars; n=5: 25 vars. Encoding alternativo (permutation-based) reduziria, mas inviabiliza QUBO direto.
  - Penalidade default é heurística; se `max(d) · n · 2` for pequeno demais para alguns casos patológicos o solver pode retornar solução infactível.

## Algoritmo 2 — Minimum Eigensolver (modo "quantum_exact")

- **Nome:** `NumPyMinimumEigensolver` via `MinimumEigenOptimizer`.
- **Capítulo Hughes:** nenhum — é um solver clássico de eigenvalue problem. Aparece no projeto com o label "quantum_exact" mas **não é quântico**.
- **Onde está no código:** [backend/quantum_solver.py:113-115](backend/quantum_solver.py#L113).
- **Como funciona:** o QUBO → Ising Hamiltoniano (Qiskit faz automático). `NumPyMinimumEigensolver` diagonaliza a matriz Hamiltoniana (tamanho 2^(n²) × 2^(n²)) e retorna o autovetor de menor autovalor. A "rota quântica" é lida desse autovetor.
- **Decisão de modelagem:** usado como padrão (`use_exact=True` em [server.py:247](server.py#L247)) porque é determinístico e rápido para n ≤ 4. Para demo e benchmarks, é uma referência exata (gabarito).
- **Limitação crítica (já documentada no README):**
  - Matriz Hamiltoniana tem 2^(n²) elementos → RAM requirements exponencial.
  - n=4 → 2^16 = 65k elementos (~512 KB, OK).
  - n=5 → 2^25 = 33M elementos (~256 MB teórico; na prática o código aborta; README diz que tentou alocar 7.5 GB e crashou).
  - n ≥ 6 → inviável em qualquer máquina comum.
  - Código faz hard-fail para `n > 4` em [backend/quantum_solver.py:92](backend/quantum_solver.py#L92) retornando `success: false`.
- **Honestidade:** chamar isso de "quantum" na UI é confuso — é diagonalização clássica do Hamiltoniano. Fica OK se o artigo enquadrar como "referência ótima da formulação quântica".

## Algoritmo 3 — QAOA (modo "quantum_qaoa")

- **Nome:** Quantum Approximate Optimization Algorithm (Farhi, Goldstone, Gutmann, 2014).
- **Capítulo Hughes:** nenhum (mesma nota que antes).
- **Onde está no código:** [backend/quantum_solver.py:118-123](backend/quantum_solver.py#L118). Importado sob demanda (lazy) porque compilar o circuito é caro.
- **Como foi implementado:**
  ```python
  from qiskit_algorithms import QAOA
  from qiskit_algorithms.optimizers import COBYLA
  qaoa = QAOA(optimizer=COBYLA(), reps=1)
  ```
  - `reps=1` → ansatz de profundidade p=1 (um par de operadores de custo/mixer). É o mínimo razoável e NÃO está parametrizado via UI.
  - `COBYLA` → otimizador clássico derivada-livre para os parâmetros (γ, β). Escolha padrão OK para p=1.
  - **Backend de execução:** não há `Estimator`/`Sampler` primitive passado explicitamente. O QAOA do Qiskit Algorithms 0.4.0 usa o default (tipicamente `StatevectorEstimator` em simulação local). **Não** usa `qiskit-aer` explicitamente apesar de estar no requirements. **Não** usa IBM Quantum Runtime — zero chamadas a hardware ou cloud.
- **Decisões de modelagem:**
  - `reps=1` mantém execução em segundos para n=3..4. Aumentar `reps` melhoraria qualidade mas explodiria tempo de simulação.
  - Não há seed fixa nem estatísticas de múltiplas runs — o resultado é não-determinístico e pode variar entre cliques.
- **Limitações:**
  - Mesma limitação de RAM do eigensolver quando usa statevector simulation.
  - Não há retry, não há medição do sucesso (approximation ratio).
  - UI expõe QAOA como opção em [frontend_base/lib/types.ts:31](frontend_base/lib/types.ts#L31) (`quantum_qaoa`) mas o backend ignora a distinção — o seletor de método quântico no frontend não é repassado ao `/api/calculate` (o payload é apenas `algorithm: "classical" | "quantum"`), então QAOA real-world **só é executado se alguém chamar `solve_quantum(..., use_exact=False)` diretamente em Python**. O caminho web sempre usa o eigensolver exato ([server.py:247](server.py#L247)).
  - **Isso é um bug/omissão de produto importante para mencionar ao orientador.**

## IBM Quantum Platform (hardware real)?

**Não.** Zero integração.

- Sem dependência `qiskit-ibm-runtime`.
- Sem token IBM Q no `.env`.
- Sem menção a `QiskitRuntimeService` no código.
- README tem checkbox "Deployment to quantum hardware (IBM Quantum)" marcado como **não feito** em "Future Enhancements".

Tudo roda em **simulador local** (default do Qiskit Algorithms — statevector em NumPy). Qiskit Aer está instalado mas não usado explicitamente.

## Representação dos estados quânticos

- **No código Python:** o estado lógico é tratado como **vetor de variáveis binárias** `x[i,t]` ∈ {0,1} de tamanho n². O vetor de solução pós-otimização é lido em `result.x` como array numérico (≥0.5 → 1). Não há manipulação direta de amplitudes, nem matriz densidade, nem representação Dirac.
- **No frontend:** **zero** representação de estado quântico. O usuário vê apenas a rota resultado (lista de índices), nunca bitstrings, probabilidades, ou distribuições de medição.
- **Para o artigo:** se for relevante mostrar o estado quântico, recomenda-se adicionar visualização de:
  1. O vetor-solução ótimo como bitstring n² (ex.: `"0100 0010 1000 0001"` para n=4).
  2. Distribuição de contagens amostrais do QAOA (exigiria mudar de statevector para `Sampler` + `shots`).

## Visualizações implementadas

| Visualização                       | Implementada? | Onde                                                                   |
| ---------------------------------- | ------------- | ---------------------------------------------------------------------- |
| Bloch sphere                       | **Não**       | —                                                                      |
| Circuito quântico desenhado        | **Não**       | —                                                                      |
| Histograma de medições             | **Não**       | —                                                                      |
| Mapa Leaflet com rota otimizada    | Sim           | `components/dashboard/route-map.tsx` — markers, polyline, OSM/satélite |
| Heatmap da matriz de distâncias    | Sim           | `components/dashboard/distance-matrix.tsx` (Haversine client-side)     |
| LineChart de histórico de runs     | Sim (código) mas **não montado no dashboard** | `components/dashboard/performance-chart.tsx` está importável mas não é renderizado em `page.tsx` |
| Cards de métricas (dist/custo/tempo) | Sim         | `components/dashboard/results-panel.tsx`                               |
| Card de comparação quântico×clássico | Sim         | `results-panel.tsx` — mostra speedup textual                           |

## Comparação quântico × clássico (como é feita na UI)

Botão "Comparar Quântico vs Clássico" em [config-panel.tsx:502](frontend_base/components/dashboard/config-panel.tsx#L502) chama `calculateComparison()` que faz **duas chamadas `POST /api/calculate` em paralelo** (`Promise.all`): uma com `algorithm: "classical"`, outra com `"quantum"`, sobre o **mesmo conjunto de pontos e mesma matriz**.

Métricas de comparação calculadas no frontend ([route-context.tsx:319](frontend_base/lib/route-context.tsx#L319)):

- `speedup = classical.timeMs / quantum.timeMs`
- `distanceDiff = classical.totalDistance - quantum.totalDistance`

**Problema metodológico para o artigo:** o "tempo" do classical inclui permutações em Python puro; o do quantum inclui overhead de construção do QUBO, conversão para Ising, e diagonalização da matriz 2^(n²). Para n=3 ou 4, o quântico tipicamente aparece **mais lento** (não é speedup real). O README já traz isso na tabela de benchmarks (quantum ~19-61 ms vs classical ~0.02 ms para n=3-4). Útil como demonstração de overhead, não de vantagem quântica.

**Limite UI:** a comparação é bloqueada se `selectedCities.length > ALGORITHM_LIMITS.quantum_numpy` (=4), com dialog explicando o porquê ([config-panel.tsx:522](frontend_base/components/dashboard/config-panel.tsx#L522)).

## Pontos de discussão com o orientador

1. **Reframe do artigo:** chamar o trabalho de "implementação dos conceitos do Hughes" é impreciso. Mais honesto: "extensão aplicada de otimização variacional (QAOA) sobre um caso logístico brasileiro, motivada pelos fundamentos introduzidos em Hughes et al.". Adicionar Farhi 2014 e Lucas 2014 como referências primárias do algoritmo.
2. **QAOA inacessível pela UI:** a opção `quantum_qaoa` no dropdown **não aciona QAOA no backend**; só o eigensolver exato. Corrigir é trivial (passar `quantum_method` no payload e usar em `solve_quantum`), mas precisa ser feito antes do artigo se a comparação QAOA fizer parte dos resultados.
3. **Tamanho do problema:** com n ≤ 4, o TSP é trivial (6 permutações para n=4 se fixado o depósito) — não há caso real onde QAOA/eigensolver vença brute force. O resultado só é cientificamente interessante em n ≥ 6, que o simulador não aguenta. Alternativas para o artigo: mostrar convergência de QAOA vs p (profundidade), estudar qualidade da solução vs nearest-neighbor, ou rodar em hardware IBM (requer mudança arquitetural).
4. **Reprodutibilidade:** QAOA sem seed fixa produz resultados diferentes a cada clique. Para o artigo precisará de `seed_transpiler` e `seed_simulator` fixos, e média sobre N runs.
5. **Pertinência quântica:** o NumPyMinimumEigensolver é clássico. Rotulá-lo como "quantum" na interface é pedagogicamente problemático. Considerar renomear no UI para "exact (classical eigensolver)" ou deixar claro que serve de ground truth.
