"use client"

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import {
  City,
  RouteResult,
  RouteConfig,
  ComparisonResult,
  CalculationHistory,
  ApiStatus,
  BRAZIL_CAPITALS,
  COST_PER_KM,
} from "./types"
import {
  calculateRoute as apiCalculateRoute,
  getRoutingStatus,
  getCityNeighborhoods,
  type BackendLocation,
} from "./api"
import { useApiUsage } from "./use-api-usage"

interface ApiUsageInfo {
  used: number
  limit: number
  remaining: number
  percentUsed: number
  isLow: boolean
  isExhausted: boolean
}

interface RouteContextType {
  selectedCities: City[]
  addCity: (city: City) => void
  addCustomCity: (lat: number, lng: number, name?: string) => void
  removeCity: (cityId: string) => void
  reorderCities: (startIndex: number, endIndex: number) => void
  availableCities: City[]
  setSelectedCities: (cities: City[]) => void
  config: RouteConfig
  updateConfig: (updates: Partial<RouteConfig>) => void
  results: RouteResult | null
  comparison: ComparisonResult
  isCalculating: boolean
  calculationProgress: number
  history: CalculationHistory[]
  clearHistory: () => void
  apiStatus: ApiStatus
  apiUsage: ApiUsageInfo
  calculateRoute: () => Promise<void>
  calculateComparison: () => Promise<void>
  clearResults: () => void
  generateRandomPoints: (count: number) => void
  loadPoints: () => Promise<void>
  isLoadingPoints: boolean
}

const RouteContext = createContext<RouteContextType | undefined>(undefined)

function citiesToLocations(cities: City[]): BackendLocation[] {
  return cities.map((c, i) => ({
    id: i,
    name: `${c.name} (${c.state})`,
    lat: c.lat,
    lon: c.lng,
  }))
}

function parseApiResult(
  data: Awaited<ReturnType<typeof apiCalculateRoute>>,
  cities: City[],
): RouteResult {
  const sequence = data.route.map((idx) => cities[idx % cities.length])
  return {
    success: data.success,
    route: data.route,
    totalDistance: Math.round(data.total_distance),
    timeMs: data.time_ms,
    method: data.method,
    usedRealRoads: data.used_real_roads,
    totalDurationMin: data.total_duration_min ? Math.round(data.total_duration_min) : undefined,
    routeGeometry: data.route_geometry,
    fuelCost: Math.round(data.total_distance * COST_PER_KM),
    sequence,
  }
}

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const [selectedCities, setSelectedCities] = useState<City[]>([])
  const [config, setConfig] = useState<RouteConfig>({
    mode: "intercities",
    selectedCity: null,
    algorithmType: "classical",
    classicalMethod: "nearest_neighbor",
    quantumMethod: "quantum_numpy",
    useRealRoads: false,
    numPoints: 4,
  })
  const [results, setResults] = useState<RouteResult | null>(null)
  const [comparison, setComparison] = useState<ComparisonResult>({ classical: null, quantum: null })
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationProgress, setCalculationProgress] = useState(0)
  const [history, setHistory] = useState<CalculationHistory[]>([])
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ online: false, hasApiKey: false })
  const [isLoadingPoints, setIsLoadingPoints] = useState(false)
  const { used, limit, remaining, percentUsed, isLow, isExhausted, incrementUsage } = useApiUsage()

  useEffect(() => {
    getRoutingStatus()
      .then((res) => {
        setApiStatus({ online: true, hasApiKey: res.api_configured })
      })
      .catch(() => {
        setApiStatus({ online: false, hasApiKey: false })
      })
  }, [])

  const availableCities = useMemo(
    () => BRAZIL_CAPITALS.filter((c) => !selectedCities.some((sc) => sc.id === c.id)),
    [selectedCities],
  )

  const addCity = useCallback((city: City) => {
    setSelectedCities((prev) => [...prev, { ...city, isHub: false }])
    setResults(null)
    setComparison({ quantum: null, classical: null })
  }, [])

  const addCustomCity = useCallback((lat: number, lng: number, name?: string) => {
    const customCity: City = {
      id: `custom_${Date.now()}`,
      key: "custom",
      name: name || `Ponto ${selectedCities.length + 1}`,
      state: "Custom",
      lat,
      lng,
      isHub: selectedCities.length === 0,
    }
    setSelectedCities((prev) => [...prev, customCity])
    setResults(null)
    setComparison({ quantum: null, classical: null })
  }, [selectedCities.length])

  const removeCity = useCallback((cityId: string) => {
    setSelectedCities((prev) => {
      const filtered = prev.filter((c) => c.id !== cityId)
      if (filtered.length > 0 && !filtered.some((c) => c.isHub)) {
        filtered[0].isHub = true
      }
      return filtered
    })
    setResults(null)
    setComparison({ quantum: null, classical: null })
  }, [])

  const reorderCities = useCallback((startIndex: number, endIndex: number) => {
    setSelectedCities((prev) => {
      const result = Array.from(prev)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)
      return result.map((c, i) => ({ ...c, isHub: i === 0 }))
    })
    setResults(null)
    setComparison({ quantum: null, classical: null })
  }, [])

  const updateConfig = useCallback((updates: Partial<RouteConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
    setResults(null)
    setComparison({ quantum: null, classical: null })
  }, [])

  const generateRandomPoints = useCallback((count: number) => {
    const shuffled = [...BRAZIL_CAPITALS].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(count, BRAZIL_CAPITALS.length))
    setSelectedCities(selected.map((c, i) => ({ ...c, isHub: i === 0 })))
    setResults(null)
    setComparison({ quantum: null, classical: null })
  }, [])

  const loadPoints = useCallback(async () => {
    setIsLoadingPoints(true)
    setResults(null)
    setComparison({ quantum: null, classical: null })

    try {
      if (config.mode === "intercities") {
        const shuffled = [...BRAZIL_CAPITALS].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, Math.min(config.numPoints, BRAZIL_CAPITALS.length))
        setSelectedCities(selected.map((c, i) => ({ ...c, isHub: i === 0 })))
      } else if (config.mode === "intracidade" && config.selectedCity) {
        const data = await getCityNeighborhoods(config.selectedCity)
        const cities: City[] = [
          {
            id: `${config.selectedCity}_hub`,
            key: config.selectedCity,
            name: data.hub.name,
            state: config.selectedCity,
            lat: data.hub.lat,
            lng: data.hub.lon,
            isHub: true,
          },
          ...data.neighborhoods.slice(0, config.numPoints).map((n) => ({
            id: `${config.selectedCity}_${n.id}`,
            key: config.selectedCity!,
            name: n.name,
            state: config.selectedCity!,
            lat: n.lat,
            lng: n.lon,
            isHub: false,
          })),
        ]
        setSelectedCities(cities)
      }
    } catch (err) {
      console.error("Failed to load points:", err)
    } finally {
      setIsLoadingPoints(false)
    }
  }, [config.mode, config.selectedCity, config.numPoints])

  const addToHistory = useCallback(
    (result: RouteResult) => {
      setHistory((prev) =>
        [
          {
            id: Date.now().toString(),
            timestamp: new Date(),
            config: { ...config },
            result,
            points: selectedCities.map((c, i) => ({
              id: c.id,
              name: c.name,
              lat: c.lat,
              lng: c.lng,
              isHub: c.isHub || false,
              order: result.route.indexOf(i),
            })),
          },
          ...prev,
        ].slice(0, 10),
      )
    },
    [config, selectedCities],
  )

  const calculateRoute = useCallback(async () => {
    if (selectedCities.length < 2) return
    setIsCalculating(true)
    setCalculationProgress(0)

    const progressInterval = setInterval(() => {
      setCalculationProgress((p) => Math.min(p + Math.random() * 15, 90))
    }, 300)

    try {
      const locations = citiesToLocations(selectedCities)
      const solver = config.algorithmType === "quantum"
        ? "exact_eigensolver"
        : config.classicalMethod

      const data = await apiCalculateRoute({
        locations,
        solver,
        use_real_roads: config.useRealRoads,
      })

      // Track API usage when real roads are used
      if (config.useRealRoads && data.used_real_roads) {
        // Each calculation uses approximately n*(n-1)/2 API calls for distance matrix
        const apiCalls = Math.ceil((selectedCities.length * (selectedCities.length - 1)) / 2)
        incrementUsage(apiCalls)
      }

      const result = parseApiResult(data, selectedCities)
      setResults(result)
      addToHistory(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Calculation failed"
      setResults({
        success: false,
        route: [],
        totalDistance: 0,
        timeMs: 0,
        method: "",
        usedRealRoads: false,
        fuelCost: 0,
        sequence: [],
      })
      console.error("Route calculation error:", message)
    } finally {
      clearInterval(progressInterval)
      setCalculationProgress(100)
      setTimeout(() => setIsCalculating(false), 300)
    }
  }, [selectedCities, config, addToHistory, incrementUsage])

  const calculateComparison = useCallback(async () => {
    if (selectedCities.length < 2) return
    setIsCalculating(true)
    setCalculationProgress(0)

    const progressInterval = setInterval(() => {
      setCalculationProgress((p) => Math.min(p + Math.random() * 10, 90))
    }, 300)

    try {
      const locations = citiesToLocations(selectedCities)
      const useRealRoads = config.useRealRoads

      const [classicalData, quantumData] = await Promise.all([
        apiCalculateRoute({ locations, solver: "brute_force", use_real_roads: useRealRoads }),
        apiCalculateRoute({ locations, solver: "exact_eigensolver", use_real_roads: useRealRoads }),
      ])

      const classicalResult = parseApiResult(classicalData, selectedCities)
      const quantumResult = parseApiResult(quantumData, selectedCities)

      setComparison({
        classical: classicalResult,
        quantum: quantumResult,
        speedup: classicalResult.timeMs > 0 ? classicalResult.timeMs / quantumResult.timeMs : 1,
        distanceDiff: classicalResult.totalDistance - quantumResult.totalDistance,
      })
      setResults(quantumResult)
      addToHistory(quantumResult)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Comparison failed"
      console.error("Comparison error:", message)
    } finally {
      clearInterval(progressInterval)
      setCalculationProgress(100)
      setTimeout(() => setIsCalculating(false), 300)
    }
  }, [selectedCities, config, addToHistory])

  const clearResults = useCallback(() => {
    setResults(null)
    setComparison({ quantum: null, classical: null })
    setCalculationProgress(0)
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const apiUsage: ApiUsageInfo = { used, limit, remaining, percentUsed, isLow, isExhausted }

  const value: RouteContextType = {
    selectedCities,
    addCity,
    addCustomCity,
    removeCity,
    reorderCities,
    availableCities,
    setSelectedCities,
    config,
    updateConfig,
    results,
    comparison,
    isCalculating,
    calculationProgress,
    history,
    clearHistory,
    apiStatus,
    apiUsage,
    calculateRoute,
    calculateComparison,
    clearResults,
    generateRandomPoints,
    loadPoints,
    isLoadingPoints,
  }

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
}

export function useRoute() {
  const context = useContext(RouteContext)
  if (context === undefined) {
    throw new Error("useRoute must be used within a RouteProvider")
  }
  return context
}
