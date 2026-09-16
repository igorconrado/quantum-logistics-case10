import type { CalculateResponse } from "./api"
import { COST_PER_KM, type City, type RouteResult } from "./types"

export function parseApiResult(data: CalculateResponse, cities: City[]): RouteResult {
  if (!data.success) throw new Error(data.error || "Falha no cálculo da rota")
  if (!Number.isFinite(data.total_distance) || data.total_distance <= 0 ||
      !Number.isFinite(data.time_ms) || data.time_ms < 0 ||
      !Array.isArray(data.route) || data.route.length !== cities.length + 1 ||
      data.route[0] !== 0 || data.route.at(-1) !== 0 ||
      new Set(data.route.slice(0, -1)).size !== cities.length ||
      data.route.some((index) => !Number.isInteger(index) || index < 0 || index >= cities.length)) {
    throw new Error("Resposta inválida: rota ou distância indisponível")
  }
  return {
    success: true,
    route: data.route,
    distanceMatrix: data.distance_matrix,
    totalDistance: data.total_distance,
    timeMs: data.time_ms,
    method: data.method,
    usedRealRoads: data.used_real_roads,
    totalDurationMin: data.total_duration_min,
    routeGeometry: data.route_geometry,
    fuelCost: data.total_distance * COST_PER_KM,
    sequence: data.route.map((index) => cities[index]),
  }
}
