// Brazilian Capital Cities Data
export interface City {
  id: string
  key: string
  name: string
  state: string
  lat: number
  lng: number
  isHub?: boolean
}

export interface Neighborhood {
  name: string
  lat: number
  lng: number
  isHub?: boolean
}

export interface RoutePoint {
  id: string
  name: string
  lat: number
  lng: number
  isHub: boolean
  order?: number
}

export type RouteMode = 'intercities' | 'intracidade'
export type AlgorithmType = 'classical' | 'quantum'
export type ClassicalAlgorithm = 'brute_force' | 'nearest_neighbor' | 'networkx'
export type QuantumAlgorithm = 'quantum_numpy' | 'quantum_qaoa'

export interface RouteConfig {
  mode: RouteMode
  selectedCity: string | null
  algorithmType: AlgorithmType
  classicalMethod: ClassicalAlgorithm
  quantumMethod: QuantumAlgorithm
  useRealRoads: boolean
  numPoints: number
}

export interface RouteResult {
  success: boolean
  route: number[]
  totalDistance: number
  timeMs: number
  method: string
  usedRealRoads: boolean
  totalDurationMin?: number
  routeGeometry?: [number, number][]
  fuelCost?: number
  sequence?: City[]
}

export interface ComparisonResult {
  classical: RouteResult | null
  quantum: RouteResult | null
  speedup?: number
  distanceDiff?: number
}

export interface CalculationHistory {
  id: string
  timestamp: Date
  config: RouteConfig
  result: RouteResult
  points: RoutePoint[]
}

export interface ApiStatus {
  online: boolean
  remainingRequests?: number
  hasApiKey: boolean
}

// Constants
export const FUEL_PRICE_PER_LITER = 6.35
export const KM_PER_LITER = 10
export const COST_PER_KM = FUEL_PRICE_PER_LITER / KM_PER_LITER // R$ 0.635

export const BRAZIL_CAPITALS: City[] = [
  { id: 'rio_branco', key: 'rio_branco', name: 'Rio Branco', state: 'AC', lat: -9.9754, lng: -67.8249 },
  { id: 'maceio', key: 'maceio', name: 'Maceió', state: 'AL', lat: -9.6658, lng: -35.7353 },
  { id: 'macapa', key: 'macapa', name: 'Macapá', state: 'AP', lat: 0.0349, lng: -51.0694 },
  { id: 'manaus', key: 'manaus', name: 'Manaus', state: 'AM', lat: -3.1190, lng: -60.0217 },
  { id: 'salvador', key: 'salvador', name: 'Salvador', state: 'BA', lat: -12.9714, lng: -38.5014 },
  { id: 'fortaleza', key: 'fortaleza', name: 'Fortaleza', state: 'CE', lat: -3.7172, lng: -38.5433 },
  { id: 'brasilia', key: 'brasilia', name: 'Brasília', state: 'DF', lat: -15.7801, lng: -47.9292 },
  { id: 'vitoria', key: 'vitoria', name: 'Vitória', state: 'ES', lat: -20.3155, lng: -40.3128 },
  { id: 'goiania', key: 'goiania', name: 'Goiânia', state: 'GO', lat: -16.6869, lng: -49.2648 },
  { id: 'sao_luis', key: 'sao_luis', name: 'São Luís', state: 'MA', lat: -2.5297, lng: -44.2825 },
  { id: 'cuiaba', key: 'cuiaba', name: 'Cuiabá', state: 'MT', lat: -15.6014, lng: -56.0979 },
  { id: 'campo_grande', key: 'campo_grande', name: 'Campo Grande', state: 'MS', lat: -20.4697, lng: -54.6201 },
  { id: 'belo_horizonte', key: 'belo_horizonte', name: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345 },
  { id: 'belem', key: 'belem', name: 'Belém', state: 'PA', lat: -1.4558, lng: -48.5024 },
  { id: 'joao_pessoa', key: 'joao_pessoa', name: 'João Pessoa', state: 'PB', lat: -7.1195, lng: -34.8450 },
  { id: 'curitiba', key: 'curitiba', name: 'Curitiba', state: 'PR', lat: -25.4284, lng: -49.2733 },
  { id: 'recife', key: 'recife', name: 'Recife', state: 'PE', lat: -8.0476, lng: -34.8770 },
  { id: 'teresina', key: 'teresina', name: 'Teresina', state: 'PI', lat: -5.0892, lng: -42.8019 },
  { id: 'rio_de_janeiro', key: 'rio_de_janeiro', name: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729 },
  { id: 'natal', key: 'natal', name: 'Natal', state: 'RN', lat: -5.7945, lng: -35.2110 },
  { id: 'porto_alegre', key: 'porto_alegre', name: 'Porto Alegre', state: 'RS', lat: -30.0346, lng: -51.2177 },
  { id: 'porto_velho', key: 'porto_velho', name: 'Porto Velho', state: 'RO', lat: -8.7612, lng: -63.9004 },
  { id: 'boa_vista', key: 'boa_vista', name: 'Boa Vista', state: 'RR', lat: 2.8195, lng: -60.6714 },
  { id: 'florianopolis', key: 'florianopolis', name: 'Florianópolis', state: 'SC', lat: -27.5954, lng: -48.5480 },
  { id: 'sao_paulo', key: 'sao_paulo', name: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333 },
  { id: 'aracaju', key: 'aracaju', name: 'Aracaju', state: 'SE', lat: -10.9091, lng: -37.0677 },
  { id: 'palmas', key: 'palmas', name: 'Palmas', state: 'TO', lat: -10.1689, lng: -48.3317 },
]

export const ALGORITHM_LIMITS: Record<string, number> = {
  brute_force: 8,
  nearest_neighbor: 50,
  networkx: 50,
  quantum_numpy: 4,
  quantum_qaoa: 4,
}

export const ALGORITHM_LABELS: Record<string, string> = {
  brute_force: 'Brute Force',
  nearest_neighbor: 'Nearest Neighbor',
  networkx: 'NetworkX',
  quantum_numpy: 'Exact Eigensolver (Hamiltoniano)',
  quantum_exact: 'Exact Eigensolver (Hamiltoniano)',
  quantum_qaoa: 'QAOA — Variacional (experimental)',
}

// Haversine distance calculation
export function calculateDistance(city1: { lat: number; lng: number }, city2: { lat: number; lng: number }): number {
  const R = 6371 // Earth radius in km
  const dLat = ((city2.lat - city1.lat) * Math.PI) / 180
  const dLng = ((city2.lng - city1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((city1.lat * Math.PI) / 180) *
      Math.cos((city2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Generate distance matrix
export function generateDistanceMatrix(points: { lat: number; lng: number }[]): number[][] {
  const n = points.length
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = calculateDistance(points[i], points[j])
      }
    }
  }
  
  return matrix
}

// Nearest neighbor algorithm
export function nearestNeighborTSP(distMatrix: number[][]): { route: number[]; distance: number } {
  const n = distMatrix.length
  const visited = new Set<number>([0])
  const route = [0]
  let totalDistance = 0
  let current = 0

  while (visited.size < n) {
    let nearestDist = Infinity
    let nearest = -1

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && distMatrix[current][i] < nearestDist) {
        nearestDist = distMatrix[current][i]
        nearest = i
      }
    }

    if (nearest !== -1) {
      visited.add(nearest)
      route.push(nearest)
      totalDistance += nearestDist
      current = nearest
    }
  }

  // Return to start
  totalDistance += distMatrix[current][0]
  route.push(0)

  return { route, distance: totalDistance }
}

// Brute force TSP (for small inputs)
export function bruteForceTSP(distMatrix: number[][]): { route: number[]; distance: number } {
  const n = distMatrix.length
  if (n > 8) {
    return nearestNeighborTSP(distMatrix) // Fallback for large inputs
  }

  const permute = (arr: number[]): number[][] => {
    if (arr.length <= 1) return [arr]
    const result: number[][] = []
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
      for (const perm of permute(rest)) {
        result.push([arr[i], ...perm])
      }
    }
    return result
  }

  const cities = Array.from({ length: n - 1 }, (_, i) => i + 1)
  const permutations = permute(cities)

  let bestRoute = [0, ...cities, 0]
  let bestDistance = Infinity

  for (const perm of permutations) {
    const route = [0, ...perm, 0]
    let distance = 0
    for (let i = 0; i < route.length - 1; i++) {
      distance += distMatrix[route[i]][route[i + 1]]
    }
    if (distance < bestDistance) {
      bestDistance = distance
      bestRoute = route
    }
  }

  return { route: bestRoute, distance: bestDistance }
}

// Simulated quantum optimization (for demo)
export function quantumTSP(distMatrix: number[][]): { route: number[]; distance: number; iterations: number } {
  // Simulate QAOA-like behavior with random sampling and selection
  const n = distMatrix.length
  const numSamples = 100
  let bestRoute: number[] = []
  let bestDistance = Infinity

  for (let sample = 0; sample < numSamples; sample++) {
    // Random permutation
    const cities = Array.from({ length: n - 1 }, (_, i) => i + 1)
    for (let i = cities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[cities[i], cities[j]] = [cities[j], cities[i]]
    }
    
    const route = [0, ...cities, 0]
    let distance = 0
    for (let i = 0; i < route.length - 1; i++) {
      distance += distMatrix[route[i]][route[i + 1]]
    }
    
    if (distance < bestDistance) {
      bestDistance = distance
      bestRoute = route
    }
  }

  return { route: bestRoute, distance: bestDistance, iterations: numSamples }
}
