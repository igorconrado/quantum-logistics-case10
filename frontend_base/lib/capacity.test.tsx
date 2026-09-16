// @vitest-environment jsdom
import React from "react"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteProvider, useRoute } from "./route-context"
import { calculateRoute, getCityNeighborhoods } from "./api"
import { generationLimit, normalizeConfig, pointLimit } from "./capacity"
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

describe("capacity", () => {
  it("reserves one point for the origin only in intracity mode", () => {
    expect(generationLimit(config)).toBe(3)
    expect(normalizeConfig(config).numPoints).toBe(3)
    expect(generationLimit({ ...config, algorithmType: "classical" })).toBe(7)
    expect(generationLimit({ ...config, mode: "intercities" })).toBe(4)
    expect(pointLimit(config)).toBe(4)
  })
  it("trims existing selections and generated neighborhoods when switching algorithms", async () => {
    const { result } = renderHook(useRoute, { wrapper })
    act(() => result.current.setSelectedCities(BRAZIL_CAPITALS.slice(0, 9)))
    act(() => result.current.updateConfig({ ...config, algorithmType: "classical" }))
    expect(result.current.selectedCities).toHaveLength(8)
    expect(result.current.config.numPoints).toBe(7)
    act(() => result.current.updateConfig({ algorithmType: "quantum" }))
    expect(result.current.selectedCities).toHaveLength(4)
    expect(result.current.config.numPoints).toBe(3)
    vi.mocked(getCityNeighborhoods).mockResolvedValue({ success: true, city: "BH",
      hub: { id: 0, name: "Hub", lat: -19.9, lon: -43.9 },
      neighborhoods: Array.from({ length: 9 }, (_, id) => ({ id: id + 1, name: `Stop ${id}`, lat: -19.8, lon: -43.8 })),
    })
    await act(() => result.current.loadPoints())
    expect(result.current.selectedCities).toHaveLength(4)
    expect(result.current.selectedCities[0].isHub).toBe(true)
    act(() => result.current.addCustomCity(-19.7, -43.7))
    expect(result.current.selectedCities).toHaveLength(4)
  })
})
