import { afterEach, expect, it, vi } from "vitest"
import { calculateRoute } from "./api"

afterEach(() => vi.unstubAllGlobals())

it.each([200, 401, 429, 500])("propagates API failure with HTTP %s", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ success: false, error: "Roteamento indisponível" }), { status },
  )))
  await expect(calculateRoute({ locations: [], algorithm: "classical", use_real_roads: true }))
    .rejects.toThrow("Roteamento indisponível")
})
