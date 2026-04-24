"use client"

import React, { createContext, useContext, useState, useCallback, useMemo } from "react"

export type Locale = "pt-BR" | "en-US"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const dictionaries: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    // Header
    "header.title": "Quantum Logistics",
    "header.subtitle": "Plataforma de Otimização de Rotas",
    "header.apiOnline": "API Online",
    "header.offlineMode": "Modo Offline",
    "header.apiStatus": "Status da API OpenRouteService",
    "header.processing": "Processando...",
    "header.help": "Ajuda e Documentação",
    "header.settings": "Configurações",
    "header.theme": "Alternar tema",

    // Config Panel
    "config.routeScope": "Escopo da Rota",
    "config.intercities": "Intercidades",
    "config.intracity": "Intracidade",
    "config.algorithm": "Algoritmo",
    "config.algorithmTooltip": "Quântico limitado a {quantumLimit} pontos. Clássico suporta até {classicalLimit} pontos.",
    "config.classical": "Clássico",
    "config.quantum": "Quântico",
    "config.useRealRoads": "Usar Estradas Reais",
    "config.realRoadsDesc": "API OpenRouteService (2k req/dia)",
    "config.waypoints": "Waypoints",
    "config.randomPoints": "Pontos aleatórios",
    "config.tooManyPoints": "Muitos pontos para o algoritmo {type}. Máx: {limit}",
    "config.calculating": "Calculando...",
    "config.calculateRoute": "Calcular Rota",
    "config.compareQuantumClassical": "Comparar Quântico vs Clássico",
    "config.compareUnavailableTitle": "Comparação Indisponível",
    "config.compareUnavailableDesc": "A comparação direta entre algoritmo quântico e clássico não é possível com {count} pontos. O simulador quântico consome memória RAM exponencialmente com o número de qubits, e essa quantidade de pontos excede a capacidade disponível. Reduza para no máximo 4 pontos para utilizar a comparação.",
    "config.understood": "Entendi",
    "config.selectCity": "Selecione uma cidade",
    "config.generatePoints": "Gerar Pontos",
    "config.loadingPoints": "Carregando pontos...",
    "config.numNeighborhoods": "Bairros",

    // Algorithm labels
    "algo.brute_force": "Força Bruta",
    "algo.nearest_neighbor": "Vizinho Mais Próximo",
    "algo.networkx": "NetworkX",
    "algo.quantum_numpy": "Exact Eigensolver (Hamiltoniano)",
    "algo.quantum_exact": "Exact Eigensolver (Hamiltoniano)",
    "algo.quantum_qaoa": "QAOA — Variacional (experimental)",

    // Results Panel
    "results.results": "Resultados",
    "results.history": "Histórico",
    "results.totalDistance": "Distância Total",
    "results.fuelCost": "Custo Combustível",
    "results.calcTime": "Tempo de Cálculo",
    "results.driveTime": "Tempo de Viagem",
    "results.method": "Método",
    "results.roads": "Estradas",
    "results.realRoads": "Reais",
    "results.haversine": "Haversine",
    "results.optimizedSequence": "Sequência Otimizada",
    "results.exportCsv": "Exportar CSV",
    "results.print": "Imprimir",
    "results.noResults": "Sem Resultados",
    "results.noResultsDesc": "Configure sua rota e clique em Calcular para ver os resultados de otimização",
    "results.calculations": "cálculo(s)",
    "results.clear": "Limpar",
    "results.distance": "Distância",
    "results.time": "Tempo",
    "results.points": "Pontos",
    "results.noHistory": "Sem Histórico",
    "results.noHistoryDesc": "Seu histórico de cálculos aparecerá aqui",
    "results.algorithmComparison": "Comparação de Algoritmos",
    "results.quantumFaster": "Quântico é {speedup}x mais rápido",
    "results.quantumSlower": "Clássico é {speedup}x mais rápido",
    "results.sameSpeed": "Mesma velocidade",
    "results.distanceDiff": "Diferença de distância:",

    // CSV export
    "csv.metric": "Métrica",
    "csv.value": "Valor",
    "csv.totalDistance": "Distância Total (km)",
    "csv.fuelCost": "Custo Combustível (R$)",
    "csv.calcTime": "Tempo de Cálculo (ms)",
    "csv.method": "Método",
    "csv.usedRealRoads": "Estradas Reais",
    "csv.yes": "Sim",
    "csv.no": "Não",
    "csv.routeSequence": "Sequência da Rota",
    "csv.stop": "Parada {n}",

    // Route Map
    "map.hub": "Hub",
    "map.stop": "Parada #{n}",
    "map.quantumOptimizing": "Executando Otimização Quântica...",
    "map.calculatingRoute": "Calculando Rota Otimizada...",
    "map.analyzingWaypoints": "Analisando {count} waypoints",
    "map.hubStartEnd": "Hub (Início/Fim)",
    "map.waypointsLabel": "Waypoints",
    "map.realRoad": "Estrada Real",
    "map.haversineLabel": "Haversine",
    "map.routeOptimized": "Rota Otimizada",
    "map.clickModeOn": "Clique no mapa para adicionar waypoints (ativo)",
    "map.clickModeOff": "Clique para ativar modo de adicionar waypoints",

    // Mobile Nav
    "nav.config": "Config",
    "nav.map": "Mapa",
    "nav.results": "Resultados",
    "nav.history": "Histórico",

    // Distance Matrix
    "matrix.title": "Matriz de Distâncias (km)",
    "matrix.emptyTitle": "Matriz de Distâncias",
    "matrix.emptyState": "Adicione pelo menos 2 cidades para visualizar as distâncias entre os pontos.",
    "matrix.emptyHint": "Gere pontos ou clique no mapa",
    "matrix.near": "Perto",
    "matrix.far": "Longe",
    "matrix.button": "Matriz de Distâncias",

    // Performance Chart
    "chart.title": "Tendências de Desempenho",
    "chart.emptyState": "Execute pelo menos 2 cálculos para ver as tendências",
    "chart.time": "Tempo (ms)",
    "chart.distance": "Distância (x100 km)",

    // Help Modal
    "help.title": "Ajuda e Documentação",
    "help.tabHowTo": "Como Usar",
    "help.tabAlgorithms": "Algoritmos",
    "help.tabAbout": "Sobre",
    "help.howToIntro": "Siga estes passos para otimizar suas rotas de logística:",
    "help.step1Title": "Selecione o Escopo",
    "help.step1Desc": "Escolha entre rotas Intercidades (capitais brasileiras) ou Intracidade (bairros de uma cidade específica).",
    "help.step2Title": "Escolha o Algoritmo",
    "help.step2Desc": "Selecione entre algoritmos Clássicos (mais rápidos, suportam mais pontos) ou Quânticos (simulação, limitado a 4 pontos).",
    "help.step3Title": "Gere os Pontos",
    "help.step3Desc": "Clique em 'Gerar Pontos' para criar waypoints aleatórios ou adicione manualmente pela lista.",
    "help.step4Title": "Calcule a Rota",
    "help.step4Desc": "Clique em 'Calcular Rota' para encontrar a sequência otimizada. Use 'Comparar' para ver diferenças entre algoritmos.",
    "help.tipTitle": "Dica Pro",
    "help.tipContent": "Ative 'Usar Estradas Reais' para obter distâncias reais via OpenRouteService. O modo Haversine usa linha reta.",
    "help.algorithmsIntro": "A plataforma oferece algoritmos clássicos e simulações quânticas para resolver o Problema do Caixeiro Viajante (TSP):",
    "help.classicalTitle": "Algoritmos Clássicos",
    "help.quantumTitle": "Algoritmos Quânticos",
    "help.points": "pontos",
    "help.bruteForceDesc": "Testa todas as permutações possíveis. Garante a solução ótima, mas é exponencialmente lento.",
    "help.nearestNeighborDesc": "Heurística gulosa que sempre escolhe o vizinho mais próximo. Rápido, mas nem sempre ótimo.",
    "help.networkxDesc": "Utiliza algoritmos otimizados da biblioteca NetworkX para grafos.",
    "help.quantumNumpyDesc": "Simulação exata usando NumPy. Resolve o problema via formulação QUBO, mais preciso porém lento.",
    "help.quantumQaoaDesc": "Quantum Approximate Optimization Algorithm. Algoritmo variacional híbrido para otimização combinatória.",
    "help.quantumLimitTitle": "Por que o limite de 4 pontos?",
    "help.quantumLimitDesc": "A simulação quântica consome memória RAM exponencialmente: 4 pontos = ~512KB, 5 pontos = ~256MB, 6+ pontos = impraticável.",
    "help.aboutSubtitle": "Plataforma de Otimização de Rotas com Computação Quântica",
    "help.projectTitle": "Sobre o Projeto",
    "help.projectDesc": "Esta aplicação demonstra o uso de computação quântica para otimização logística, baseada no Case 10 do programa Danish Quantum Use Cases da KPMG/TDC Net.",
    "help.partnersTitle": "Parceiros",
    "help.techStackTitle": "Tecnologias",

    // Tooltips
    "tooltip.algorithmInfo": "Escolha entre algoritmos clássicos de otimização ou simulações de computação quântica",
    "tooltip.quantumNumpy": "Diagonalização clássica da matriz Hamiltoniana via NumPyMinimumEigensolver. Serve como referência ótima da formulação QUBO. Limite n ≤ 4 por restrições de memória (2^(n²)).",
    "tooltip.quantumNumpyShort": "Diagonalização clássica do Hamiltoniano",
    "tooltip.quantumQaoa": "Algoritmo quântico variacional. Atualmente em desenvolvimento — a UI envia esta opção mas o backend roteia para o Exact Eigensolver. Ver issue #N/A.",
    "tooltip.quantumQaoaShort": "Variacional (em desenvolvimento)",
    "tooltip.solverBadge": "Solver: Eigensolver clássico",
    "tooltip.comparisonOverhead": "Comparação entre brute force e diagonalização do Hamiltoniano. Ambos são clássicos — o speedup mede overhead, não vantagem quântica.",
    "tooltip.realRoads": "Usa API OpenRouteService para calcular rotas reais. Limite: 2000 requisições/dia",
    "tooltip.apiUsage": "{used}/{limit} requisições usadas hoje",
    "tooltip.apiLow": "Poucas requisições restantes!",
    "tooltip.apiExhausted": "Limite de requisições atingido. Resets à meia-noite UTC.",

    // Validation messages
    "validation.minPoints": "Adicione pelo menos 2 pontos para calcular a rota",
    "validation.maxPoints": "Limite máximo de {limit} pontos para o algoritmo selecionado",
    "validation.apiError": "Erro ao conectar com a API. Tente novamente.",
    "validation.calculationError": "Erro durante o cálculo. Verifique os pontos selecionados.",
  },

  "en-US": {
    // Header
    "header.title": "Quantum Logistics",
    "header.subtitle": "Route Optimization Platform",
    "header.apiOnline": "API Online",
    "header.offlineMode": "Offline Mode",
    "header.apiStatus": "OpenRouteService API Status",
    "header.processing": "Processing...",
    "header.help": "Help & Documentation",
    "header.settings": "Settings",
    "header.theme": "Toggle theme",

    // Config Panel
    "config.routeScope": "Route Scope",
    "config.intercities": "Intercities",
    "config.intracity": "Intracity",
    "config.algorithm": "Algorithm",
    "config.algorithmTooltip": "Quantum limited to {quantumLimit} points. Classical supports up to {classicalLimit} points.",
    "config.classical": "Classical",
    "config.quantum": "Quantum",
    "config.useRealRoads": "Use Real Roads",
    "config.realRoadsDesc": "OpenRouteService API (2k req/day)",
    "config.waypoints": "Waypoints",
    "config.randomPoints": "Random points",
    "config.tooManyPoints": "Too many points for {type} algorithm. Max: {limit}",
    "config.calculating": "Calculating...",
    "config.calculateRoute": "Calculate Route",
    "config.compareQuantumClassical": "Compare Quantum vs Classical",
    "config.compareUnavailableTitle": "Comparison Unavailable",
    "config.compareUnavailableDesc": "Direct comparison between quantum and classical algorithms is not possible with {count} points. The quantum simulator consumes RAM exponentially with the number of qubits, and this number of points exceeds available memory. Reduce to a maximum of 4 points to use the comparison.",
    "config.understood": "Got it",
    "config.selectCity": "Select a city",
    "config.generatePoints": "Generate Points",
    "config.loadingPoints": "Loading points...",
    "config.numNeighborhoods": "Neighborhoods",

    // Algorithm labels
    "algo.brute_force": "Brute Force",
    "algo.nearest_neighbor": "Nearest Neighbor",
    "algo.networkx": "NetworkX",
    "algo.quantum_numpy": "Exact Eigensolver (Hamiltonian)",
    "algo.quantum_exact": "Exact Eigensolver (Hamiltonian)",
    "algo.quantum_qaoa": "QAOA — Variational (experimental)",

    // Results Panel
    "results.results": "Results",
    "results.history": "History",
    "results.totalDistance": "Total Distance",
    "results.fuelCost": "Fuel Cost",
    "results.calcTime": "Calc Time",
    "results.driveTime": "Drive Time",
    "results.method": "Method",
    "results.roads": "Roads",
    "results.realRoads": "Real",
    "results.haversine": "Haversine",
    "results.optimizedSequence": "Optimized Sequence",
    "results.exportCsv": "Export CSV",
    "results.print": "Print",
    "results.noResults": "No Results Yet",
    "results.noResultsDesc": "Configure your route and click Calculate to see optimization results",
    "results.calculations": "calculation(s)",
    "results.clear": "Clear",
    "results.distance": "Distance",
    "results.time": "Time",
    "results.points": "Points",
    "results.noHistory": "No History",
    "results.noHistoryDesc": "Your calculation history will appear here",
    "results.algorithmComparison": "Algorithm Comparison",
    "results.quantumFaster": "Quantum is {speedup}x faster",
    "results.quantumSlower": "Classical is {speedup}x faster",
    "results.sameSpeed": "Same speed",
    "results.distanceDiff": "Distance diff:",

    // CSV export
    "csv.metric": "Metric",
    "csv.value": "Value",
    "csv.totalDistance": "Total Distance (km)",
    "csv.fuelCost": "Fuel Cost (R$)",
    "csv.calcTime": "Calculation Time (ms)",
    "csv.method": "Method",
    "csv.usedRealRoads": "Used Real Roads",
    "csv.yes": "Yes",
    "csv.no": "No",
    "csv.routeSequence": "Route Sequence",
    "csv.stop": "Stop {n}",

    // Route Map
    "map.hub": "Hub",
    "map.stop": "Stop #{n}",
    "map.quantumOptimizing": "Running Quantum Optimization...",
    "map.calculatingRoute": "Calculating Optimal Route...",
    "map.analyzingWaypoints": "Analyzing {count} waypoints",
    "map.hubStartEnd": "Hub (Start/End)",
    "map.waypointsLabel": "Waypoints",
    "map.realRoad": "Real Road",
    "map.haversineLabel": "Haversine",
    "map.routeOptimized": "Route Optimized",
    "map.clickModeOn": "Click on map to add waypoints (active)",
    "map.clickModeOff": "Click to enable add waypoints mode",

    // Mobile Nav
    "nav.config": "Config",
    "nav.map": "Map",
    "nav.results": "Results",
    "nav.history": "History",

    // Distance Matrix
    "matrix.title": "Distance Matrix (km)",
    "matrix.emptyTitle": "Distance Matrix",
    "matrix.emptyState": "Add at least 2 cities to view distances between points.",
    "matrix.emptyHint": "Generate points or click on map",
    "matrix.near": "Near",
    "matrix.far": "Far",
    "matrix.button": "Distance Matrix",

    // Performance Chart
    "chart.title": "Performance Trends",
    "chart.emptyState": "Run at least 2 calculations to see performance trends",
    "chart.time": "Time (ms)",
    "chart.distance": "Distance (x100 km)",

    // Help Modal
    "help.title": "Help & Documentation",
    "help.tabHowTo": "How to Use",
    "help.tabAlgorithms": "Algorithms",
    "help.tabAbout": "About",
    "help.howToIntro": "Follow these steps to optimize your logistics routes:",
    "help.step1Title": "Select Scope",
    "help.step1Desc": "Choose between Intercities routes (Brazilian capitals) or Intracity (neighborhoods of a specific city).",
    "help.step2Title": "Choose Algorithm",
    "help.step2Desc": "Select between Classical algorithms (faster, supports more points) or Quantum (simulation, limited to 4 points).",
    "help.step3Title": "Generate Points",
    "help.step3Desc": "Click 'Generate Points' to create random waypoints or add manually from the list.",
    "help.step4Title": "Calculate Route",
    "help.step4Desc": "Click 'Calculate Route' to find the optimized sequence. Use 'Compare' to see differences between algorithms.",
    "help.tipTitle": "Pro Tip",
    "help.tipContent": "Enable 'Use Real Roads' to get real distances via OpenRouteService. Haversine mode uses straight lines.",
    "help.algorithmsIntro": "The platform offers classical algorithms and quantum simulations to solve the Traveling Salesman Problem (TSP):",
    "help.classicalTitle": "Classical Algorithms",
    "help.quantumTitle": "Quantum Algorithms",
    "help.points": "points",
    "help.bruteForceDesc": "Tests all possible permutations. Guarantees optimal solution but is exponentially slow.",
    "help.nearestNeighborDesc": "Greedy heuristic that always chooses the nearest neighbor. Fast but not always optimal.",
    "help.networkxDesc": "Uses optimized algorithms from the NetworkX graph library.",
    "help.quantumNumpyDesc": "Exact simulation using NumPy. Solves the problem via QUBO formulation, more accurate but slow.",
    "help.quantumQaoaDesc": "Quantum Approximate Optimization Algorithm. Hybrid variational algorithm for combinatorial optimization.",
    "help.quantumLimitTitle": "Why the 4-point limit?",
    "help.quantumLimitDesc": "Quantum simulation consumes RAM exponentially: 4 points = ~512KB, 5 points = ~256MB, 6+ points = impractical.",
    "help.aboutSubtitle": "Route Optimization Platform with Quantum Computing",
    "help.projectTitle": "About the Project",
    "help.projectDesc": "This application demonstrates the use of quantum computing for logistics optimization, based on Case 10 of KPMG/TDC Net's Danish Quantum Use Cases program.",
    "help.partnersTitle": "Partners",
    "help.techStackTitle": "Technologies",

    // Tooltips
    "tooltip.algorithmInfo": "Choose between classical optimization algorithms or quantum computing simulations",
    "tooltip.quantumNumpy": "Classical diagonalization of the Hamiltonian matrix via NumPyMinimumEigensolver. Serves as the optimal reference for the QUBO formulation. Limit n ≤ 4 due to memory constraints (2^(n²)).",
    "tooltip.quantumNumpyShort": "Classical Hamiltonian diagonalization",
    "tooltip.quantumQaoa": "Variational quantum algorithm. Currently under development — the UI sends this option but the backend routes to the Exact Eigensolver. See issue #N/A.",
    "tooltip.quantumQaoaShort": "Variational (under development)",
    "tooltip.solverBadge": "Solver: Classical eigensolver",
    "tooltip.comparisonOverhead": "Comparison between brute force and Hamiltonian diagonalization. Both are classical — the speedup measures overhead, not quantum advantage.",
    "tooltip.realRoads": "Uses OpenRouteService API to calculate real routes. Limit: 2000 requests/day",
    "tooltip.apiUsage": "{used}/{limit} requests used today",
    "tooltip.apiLow": "Few requests remaining!",
    "tooltip.apiExhausted": "Request limit reached. Resets at midnight UTC.",

    // Validation messages
    "validation.minPoints": "Add at least 2 points to calculate the route",
    "validation.maxPoints": "Maximum limit of {limit} points for selected algorithm",
    "validation.apiError": "Error connecting to API. Please try again.",
    "validation.calculationError": "Error during calculation. Check selected points.",
  },
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("pt-BR")

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = dictionaries[locale][key] || dictionaries["en-US"][key] || key
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v))
        })
      }
      return value
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useTranslation must be used within I18nProvider")
  }
  return context
}
