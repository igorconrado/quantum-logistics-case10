import limits from "./algorithm-limits.json"
import type { RouteConfig } from "./types"

export function pointLimit(config: RouteConfig): number {
  return limits[config.algorithmType === "quantum" ? config.quantumMethod : config.classicalMethod]
}

export function generationLimit(config: RouteConfig): number {
  return pointLimit(config) - (config.mode === "intracidade" ? 1 : 0)
}

export function normalizeConfig(config: RouteConfig): RouteConfig {
  return { ...config, numPoints: Math.max(2, Math.min(config.numPoints, generationLimit(config))) }
}
