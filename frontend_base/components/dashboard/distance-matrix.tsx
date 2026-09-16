"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Grid3x3, MapPin } from "lucide-react"
import { useRoute } from "@/lib/route-context"
import { useTranslation } from "@/lib/i18n"
import { generateDistanceMatrix } from "@/lib/types"
import { cn } from "@/lib/utils"

export function DistanceMatrix() {
  const { selectedCities, config, results, error, isCalculating } = useRoute()
  const { t } = useTranslation()

  const matrix = useMemo(() => {
    if (selectedCities.length < 2) return null
    return config.useRealRoads ? results?.distanceMatrix ?? null : generateDistanceMatrix(selectedCities)
  }, [selectedCities, config.useRealRoads, results])

  if (config.useRealRoads && !matrix && selectedCities.length >= 2) {
    return <p role={error ? "alert" : "status"} className="p-4 text-sm text-muted-foreground">
      {error || (isCalculating ? t("config.calculating") : t("matrix.awaitRoads"))}
    </p>
  }

  if (!matrix || selectedCities.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full text-center p-6"
      >
        <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
          <Grid3x3 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{t("matrix.emptyTitle")}</p>
        <p className="text-xs text-muted-foreground max-w-[200px]">{t("matrix.emptyState")}</p>
        <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-ibmec-blue/10 border border-ibmec-blue/30">
          <MapPin className="w-3.5 h-3.5 text-ibmec-blue" />
          <span className="text-xs text-ibmec-blue">{t("matrix.emptyHint")}</span>
        </div>
      </motion.div>
    )
  }

  const maxDistance = Math.max(...matrix.flat())
  const minDistance = Math.min(...matrix.flat().filter(d => d > 0))

  const getHeatColor = (distance: number) => {
    if (distance === 0) return "bg-secondary"
    const normalized = (distance - minDistance) / (maxDistance - minDistance)
    if (normalized < 0.25) return "bg-success/30 text-success"
    if (normalized < 0.5) return "bg-success/50 text-success"
    if (normalized < 0.75) return "bg-ibmec-gold/50 text-ibmec-gold"
    return "bg-ibmec-gold/70 text-ibmec-gold"
  }

  return (
    <div className="p-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {t("matrix.title")} — {config.useRealRoads ? t("results.realRoads") : t("results.haversine")}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-1 text-left text-muted-foreground font-normal"></th>
              {selectedCities.map((city) => (
                <th key={city.id} className="p-1 text-center text-muted-foreground font-normal whitespace-nowrap" title={city.name}>
                  {city.name.substring(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectedCities.map((rowCity, i) => (
              <motion.tr key={rowCity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <td className="p-1 text-muted-foreground whitespace-nowrap" title={rowCity.name}>{rowCity.name.substring(0, 3)}</td>
                {matrix[i].map((distance, j) => (
                  <td key={`${i}-${j}`} className={cn("p-1 text-center font-mono rounded transition-colors", getHeatColor(distance))}>
                    {distance === 0 ? "-" : distance.toLocaleString(undefined, { maximumSignificantDigits: 5 })}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-center gap-3 mt-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-success/30" />
          <span className="text-[10px] text-muted-foreground">{t("matrix.near")}</span>
        </div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success/50" /></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-ibmec-gold/50" /></div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-ibmec-gold/70" />
          <span className="text-[10px] text-muted-foreground">{t("matrix.far")}</span>
        </div>
      </div>
    </div>
  )
}
