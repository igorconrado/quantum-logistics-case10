// @vitest-environment jsdom
import React from "react"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteProvider, useRoute } from "./route-context"
import { calculateRoute, getCityNeighborhoods } from "./api"
import { generationLimit, normalizeConfig, pointLimit } from "./capacity"
import { parseApiResult } from "./route-result"
import { BRAZIL_CAPITALS, type RouteConfig } from "./types"

vi.mock("./api", () => ({
  calculateRoute: vi.fn(),
  getCityNeighborhoods: vi.fn(),
  getRoutingStatus: vi.fn().mockResolvedValue({ api_configured: true }),
  setApiKey: vi.fn(),
}))
vi.mock("./use-api-usage", () => ({ useApiUsage: () => ({ incrementUsage: vi.fn() }) }))

const config: RouteConfig = {
  mode: "intracidade", selectedCity: "belo_horizonte", algorithmType: "quantum",
  quantumMethod: "quantum_numpy", classicalMethod: "brute_force", numPoints: 8, useRealRoads: false,
}
const response = { success: true, route: [0, 1, 0], total_distance: 0.25, time_ms: 0.15, method: "brute_force", used_real_roads: true }
const wrapper = ({ children }: { children: React.ReactNode }) => <RouteProvider>{children}</RouteProvider>

beforeEach(() => { vi.clearAllMocks() })

describe("routing results", () => {
  it("preserves small distances and fuel costs instead of rounding them to zero", () => {
    const parsed = parseApiResult(response, BRAZIL_CAPITALS.slice(0, 2))
    expect(parsed.totalDistance).toBe(0.25)
    expect(parsed.fuelCost).toBeCloseTo(0.15875)
  })
  it.each([0, NaN, Infinity, -1])("rejects invalid distance %s", (distance) => {
    expect(() => parseApiResult({ ...response, total_distance: distance }, BRAZIL_CAPITALS.slice(0, 2))).toThrow()
  })
  it("waits for the API and exposes failure without publishing zero metrics or history", async () => {
    const { result } = renderHook(useRoute, { wrapper })
    act(() => result.current.setSelectedCities(BRAZIL_CAPITALS.slice(0, 2)))
    let reject!: (reason: Error) => void
    vi.mocked(calculateRoute).mockImplementation(() => new Promise((_, rejectPromise) => { reject = rejectPromise }))
    let pending!: Promise<void>
    act(() => { pending = result.current.calculateRoute() })
    expect(result.current.isCalculating).toBe(true)
    expect(result.current.results).toBeNull()
    await act(async () => { reject(new Error("ORS indisponível")); await pending })
    expect(result.current.error).toBe("ORS indisponível")
    expect(result.current.results).toBeNull()
    expect(result.current.history).toHaveLength(0)
  })
  it.each([false, true])("publishes valid results only after completion, real roads=%s", async (realRoads) => {
    const { result } = renderHook(useRoute, { wrapper })
    act(() => result.current.setSelectedCities(BRAZIL_CAPITALS.slice(0, 2)))
    act(() => result.current.updateConfig({ classicalMethod: "brute_force", useRealRoads: realRoads }))
    vi.mocked(calculateRoute).mockResolvedValue({ ...response, used_real_roads: realRoads })
    await act(() => result.current.calculateRoute())
    expect(result.current.results?.totalDistance).toBe(0.25)
    expect(result.current.results?.usedRealRoads).toBe(realRoads)
    expect(result.current.history).toHaveLength(1)
    expect(calculateRoute).toHaveBeenCalledWith(expect.objectContaining({ method: "brute_force", use_real_roads: realRoads }))
  })
  it("discards a result when configuration changes during the request", async () => {
    const { result } = renderHook(useRoute, { wrapper })
    act(() => result.current.setSelectedCities(BRAZIL_CAPITALS.slice(0, 2)))
    let resolve!: (value: typeof response) => void
    vi.mocked(calculateRoute).mockImplementation(() => new Promise((resolvePromise) => { resolve = resolvePromise }))
    let pending!: Promise<void>
    act(() => { pending = result.current.calculateRoute() })
    act(() => result.current.updateConfig({ useRealRoads: true }))
    await act(async () => { resolve(response); await pending })
    expect(result.current.results).toBeNull()
    expect(result.current.history).toHaveLength(0)
  })
})
