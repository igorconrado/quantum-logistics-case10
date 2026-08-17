// Browser requests remain same-origin; Next.js proxies /api through the server-only API_URL.
const API_BASE = ""

interface BackendLocation {
  id: number
  name: string
  lat: number
  lon: number
}

interface CalculateRequest {
  locations: BackendLocation[]
  solver: "brute_force" | "nearest_neighbor" | "networkx" | "exact_eigensolver"
  use_real_roads: boolean
}

interface CalculateResponse {
  success: boolean
  route: number[]
  total_distance: number
  time_ms: number
  method: string
  solver: string
  solver_label: string
  execution: "classical" | "classical_quantum_model"
  used_real_roads: boolean
  route_geometry?: [number, number][]
  total_duration_min?: number
  error?: string
}

interface RoutingStatusResponse {
  success: boolean
  real_roads_available: boolean
  api_configured: boolean
  message: string
}

interface HealthResponse {
  status: string
  service: string
  real_roads_available: boolean
}

interface CityInfo {
  key: string
  name: string
  hub: { lat: number; lon: number; name: string }
  neighborhood_count: number
}

interface CitiesResponse {
  success: boolean
  cities: CityInfo[]
}

interface NeighborhoodInfo {
  id: number
  name: string
  lat: number
  lon: number
}

interface CityNeighborhoodsResponse {
  success: boolean
  city: string
  hub: NeighborhoodInfo
  neighborhoods: NeighborhoodInfo[]
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error: ${res.status}`)
  }
  return res.json()
}

export async function calculateRoute(req: CalculateRequest): Promise<CalculateResponse> {
  return apiFetch<CalculateResponse>("/api/calculate", {
    method: "POST",
    body: JSON.stringify(req),
  })
}

export async function getRoutingStatus(): Promise<RoutingStatusResponse> {
  return apiFetch<RoutingStatusResponse>("/api/routing-status")
}

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health")
}

export async function getCities(): Promise<CitiesResponse> {
  return apiFetch<CitiesResponse>("/api/cities")
}

export async function getCityNeighborhoods(cityKey: string): Promise<CityNeighborhoodsResponse> {
  return apiFetch<CityNeighborhoodsResponse>(`/api/city-neighborhoods/${cityKey}`)
}

export type {
  BackendLocation,
  CalculateRequest,
  CalculateResponse,
  RoutingStatusResponse,
  CityInfo,
  CitiesResponse,
  NeighborhoodInfo,
  CityNeighborhoodsResponse,
}
