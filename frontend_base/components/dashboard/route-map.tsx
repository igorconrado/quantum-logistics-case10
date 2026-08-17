"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ZoomIn, ZoomOut, Maximize2, Layers, MousePointer2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRoute } from "@/lib/route-context"
import { useTranslation } from "@/lib/i18n"
import type { City } from "@/lib/types"
import type { Map as LeafletMap } from "leaflet"
import { ALGORITHM_LIMITS } from "@/lib/types"

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
)
const LeafletTooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false, loading: () => null }
)
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
)

function MapControllerInner({ selectedCities }: { selectedCities: City[] }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMap } = require("react-leaflet")
  const map = useMap()

  useEffect(() => {
    if (selectedCities.length > 0 && map) {
      const bounds = selectedCities.map((c) => [c.lat, c.lng] as [number, number])
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 })
    }
  }, [selectedCities, map])

  useEffect(() => {
    if (!map) return
    map.options.zoomSnap = 0.5
    map.options.zoomDelta = 0.5
    map.options.wheelDebounceTime = 100
    if (!map.getPane("markersPane")) {
      const pane = map.createPane("markersPane")
      pane.style.zIndex = "650"
    }
  }, [map])

  return null
}

const MapController = dynamic(() => Promise.resolve(MapControllerInner), {
  ssr: false,
})

function MapClickHandlerInner({
  enabled,
  onMapClick,
}: {
  enabled: boolean
  onMapClick: (lat: number, lng: number) => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMapEvents } = require("react-leaflet")

  useMapEvents({
    click: (e: { latlng: { lat: number; lng: number } }) => {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })

  return null
}

const MapClickHandler = dynamic(() => Promise.resolve(MapClickHandlerInner), {
  ssr: false,
})

export function RouteMap() {
  const { selectedCities, results, isCalculating, calculationProgress, config, addCustomCity } = useRoute()
  const { t } = useTranslation()
  const [mapReady, setMapReady] = useState(false)
  const [mapStyle, setMapStyle] = useState<"default" | "satellite">("default")
  const [clickToAddEnabled, setClickToAddEnabled] = useState(false)
  const mapRef = useRef<LeafletMap | null>(null)

  const currentLimit = config.algorithmType === "quantum"
    ? ALGORITHM_LIMITS[config.quantumMethod]
    : ALGORITHM_LIMITS[config.classicalMethod]
  const canAddMore = selectedCities.length < currentLimit

  const handleMapClick = (lat: number, lng: number) => {
    if (canAddMore) {
      addCustomCity(lat, lng)
    }
  }

  useEffect(() => {
    setMapReady(true)
  }, [])

  const handleZoomIn = () => mapRef.current?.zoomIn()
  const handleZoomOut = () => mapRef.current?.zoomOut()
  const handleFitBounds = () => {
    if (selectedCities.length > 0) {
      const bounds = selectedCities.map((c) => [c.lat, c.lng] as [number, number])
      mapRef.current?.fitBounds(bounds, { padding: [50, 50] })
    }
  }

  const routeCoordinates: [number, number][] = results?.routeGeometry
    ? results.routeGeometry.map(([lon, lat]) => [lat, lon] as [number, number])
    : results?.sequence?.map((city: City) => [city.lat, city.lng] as [number, number]) || []

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-border bg-card">
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      )}

      {mapReady && typeof window !== "undefined" && (
        <MapContainer
          key="main-map"
          ref={mapRef}
          center={[-15.7801, -47.9292]}
          zoom={4}
          className="h-full w-full"
          zoomControl={true}
          scrollWheelZoom={true}
          attributionControl={false}
        >
          <TileLayer
            url={
              mapStyle === "default"
                ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            }
            attribution={mapStyle === "default" ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' : ""}
          />

          <MapController selectedCities={selectedCities} />
          <MapClickHandler enabled={clickToAddEnabled && canAddMore} onMapClick={handleMapClick} />

          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#25D366",
                weight: 3,
                opacity: 0.8,
                dashArray: config.useRealRoads && results?.routeGeometry ? undefined : "10, 10",
              }}
            />
          )}

          {selectedCities.map((city, index) => (
            <CircleMarker
              key={city.id}
              center={[city.lat, city.lng]}
              radius={city.isHub ? 14 : 10}
              pane="markersPane"
              pathOptions={{
                fillColor: city.isHub ? "#EAAA00" : "#002A54",
                fillOpacity: 1,
                color: "#ffffff",
                weight: 2,
              }}
            >
              <LeafletTooltip
                permanent={false}
                direction="top"
                offset={[0, -10]}
                className="custom-tooltip"
              >
                <div className="text-sm bg-card text-foreground p-2 rounded-lg border border-border shadow-xl">
                  <p className="font-semibold">{city.name}</p>
                  <p className="text-muted-foreground text-xs">{city.state}</p>
                  {city.isHub && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-ibmec-gold/20 text-ibmec-gold text-xs rounded">
                      {t("map.hub")}
                    </span>
                  )}
                  {!city.isHub && results?.sequence && (
                    <span className="inline-block mt-1 text-xs text-muted-foreground">
                      {t("map.stop", { n: index + 1 })}
                    </span>
                  )}
                </div>
              </LeafletTooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      )}

      {/* Calculation overlay */}
      <AnimatePresence>
        {isCalculating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-20"
          >
            <div className="relative mb-6">
              <motion.div
                className="w-20 h-20 rounded-full border-4 border-ibmec-gold/30"
                style={{ borderTopColor: "var(--ibmec-gold)" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-ibmec-gold font-mono">
                  {Math.round(calculationProgress)}%
                </span>
              </div>
            </div>
            <p className="text-foreground font-medium">
              {config.algorithmType === "quantum"
                ? t("map.quantumOptimizing")
                : t("map.calculatingRoute")}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {t("map.analyzingWaypoints", { count: selectedCities.length })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setClickToAddEnabled(!clickToAddEnabled)}
                className={`bg-card/90 backdrop-blur-sm border ${
                  clickToAddEnabled
                    ? "border-ibmec-gold bg-ibmec-gold/20 text-ibmec-gold"
                    : "border-border hover:border-success/50"
                }`}
                disabled={!canAddMore && !clickToAddEnabled}
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{clickToAddEnabled ? t("map.clickModeOn") : t("map.clickModeOff")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button variant="secondary" size="icon" onClick={handleZoomIn} className="bg-card/90 backdrop-blur-sm border border-border hover:border-success/50">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleZoomOut} className="bg-card/90 backdrop-blur-sm border border-border hover:border-success/50">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleFitBounds} className="bg-card/90 backdrop-blur-sm border border-border hover:border-success/50">
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={() => setMapStyle(mapStyle === "default" ? "satellite" : "default")} className="bg-card/90 backdrop-blur-sm border border-border hover:border-success/50">
          <Layers className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border z-10">
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-ibmec-gold" />
            <span className="text-muted-foreground">{t("map.hubStartEnd")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-ibmec-blue" />
            <span className="text-muted-foreground">{t("map.waypointsLabel")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-success" />
            <span className="text-muted-foreground">
              {config.useRealRoads ? t("map.realRoad") : t("map.haversineLabel")}
            </span>
          </div>
        </div>
      </div>

      {/* Status badge */}
      {results && results.success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 bg-success/20 border border-success/40 rounded-lg px-3 py-1.5 z-10"
        >
          <span className="text-xs font-medium text-success">{t("map.routeOptimized")}</span>
        </motion.div>
      )}
    </div>
  )
}
