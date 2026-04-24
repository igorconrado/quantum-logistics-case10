"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Route,
  Clock,
  Fuel,
  Zap,
  TrendingDown,
  TrendingUp,
  Equal,
  Download,
  Printer,
  ChevronRight,
  BarChart3,
  History,
  Trash2,
  Cpu,
  Activity,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRoute } from "@/lib/route-context"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function ResultsPanel() {
  const { results, comparison, history, clearHistory, config } = useRoute()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("results")

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="px-4 pt-4">
          <TabsList className="w-full bg-secondary/50">
            <TabsTrigger value="results" className="flex-1 text-xs">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              {t("results.results")}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs">
              <History className="w-3.5 h-3.5 mr-1.5" />
              {t("results.history")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="results" className="flex-1 overflow-y-auto m-0 p-4 pt-2">
          <AnimatePresence mode="wait">
            {results ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Route} label={t("results.totalDistance")} value={`${results.totalDistance.toLocaleString()}`} unit="km" color="neon" />
                  <MetricCard icon={Fuel} label={t("results.fuelCost")} value={`R$ ${results.fuelCost?.toLocaleString()}`} color="coral" />
                  <MetricCard icon={Clock} label={t("results.calcTime")} value={results.timeMs < 1 ? results.timeMs.toFixed(3) : results.timeMs.toFixed(2)} unit="ms" color="quantum" />
                  {results.totalDurationMin && (
                    <MetricCard icon={Activity} label={t("results.driveTime")} value={`${Math.floor(results.totalDurationMin / 60)}h ${results.totalDurationMin % 60}m`} color="muted" />
                  )}
                </div>

                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.algorithmType === "quantum" ? "bg-ibmec-blue/20" : "bg-success/20")}>
                        {config.algorithmType === "quantum" ? <Zap className="w-4 h-4 text-ibmec-blue" /> : <Cpu className="w-4 h-4 text-success" />}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("results.method")}</p>
                        <p className="text-sm font-medium text-foreground">
                          {t(`algo.${results.method}`) !== `algo.${results.method}` ? t(`algo.${results.method}`) : results.method}
                        </p>
                        {config.algorithmType === "quantum" && (
                          <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                            {t("tooltip.solverBadge")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t("results.roads")}</p>
                      <p className="text-sm font-medium text-foreground">
                        {results.usedRealRoads ? t("results.realRoads") : t("results.haversine")}
                      </p>
                    </div>
                  </div>
                </div>

                {comparison.classical && comparison.quantum && (
                  <ComparisonCard comparison={comparison} />
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("results.optimizedSequence")}
                  </h4>
                  <div className="space-y-1">
                    {results.sequence?.map((city, index) => (
                      <motion.div
                        key={`${city.id}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                          index === 0 || index === results.sequence!.length - 1
                            ? "bg-ibmec-gold text-primary-foreground"
                            : "bg-ibmec-blue/50 text-ibmec-blue-light"
                        )}>
                          {index + 1}
                        </div>
                        <span className="text-sm text-foreground flex-1">{city.name}</span>
                        {index < results.sequence!.length - 1 && (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs bg-transparent" onClick={() => exportCSV(results, t)}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    {t("results.exportCsv")}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs bg-transparent" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    {t("results.print")}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-center py-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{t("results.noResults")}</h3>
                <p className="text-xs text-muted-foreground max-w-[200px]">{t("results.noResultsDesc")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto m-0 p-4 pt-2">
          {history.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {history.length} {t("results.calculations")}
                </p>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-error" onClick={clearHistory}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {t("results.clear")}
                </Button>
              </div>
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{item.timestamp.toLocaleTimeString()}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded", item.config.algorithmType === "quantum" ? "bg-ibmec-blue/20 text-ibmec-blue" : "bg-success/20 text-success")}>
                      {item.config.algorithmType}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("results.distance")}</p>
                      <p className="font-mono font-medium text-foreground">{item.result.totalDistance.toLocaleString()} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("results.time")}</p>
                      <p className="font-mono font-medium text-foreground">{item.result.timeMs.toFixed(2)} ms</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("results.points")}</p>
                      <p className="font-mono font-medium text-foreground">{item.points.length}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">{t("results.noHistory")}</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">{t("results.noHistoryDesc")}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: any
  label: string
  value: string
  unit?: string
  color: "neon" | "coral" | "quantum" | "muted"
}) {
  const colorClasses = {
    neon: "bg-success/10 text-success border-success/30",
    coral: "bg-ibmec-gold/10 text-ibmec-gold border-ibmec-gold/30",
    quantum: "bg-ibmec-blue/10 text-ibmec-blue border-ibmec-blue/30",
    muted: "bg-secondary text-muted-foreground border-border",
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn("p-3 rounded-lg border", colorClasses[color])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs opacity-80">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold font-mono">{value}</span>
        {unit && <span className="text-xs opacity-60">{unit}</span>}
      </div>
    </motion.div>
  )
}

function ComparisonCard({ comparison }: { comparison: any }) {
  const { t } = useTranslation()
  const rawSpeedup = comparison.speedup || 1
  const distDiff = comparison.distanceDiff || 0

  // Determine comparison result
  const isQuantumFaster = rawSpeedup > 1.05
  const isClassicalFaster = rawSpeedup < 0.95
  const isSameSpeed = !isQuantumFaster && !isClassicalFaster

  // Calculate display speedup value
  const displaySpeedup = isQuantumFaster
    ? rawSpeedup.toFixed(1)
    : isClassicalFaster
      ? (1 / rawSpeedup).toFixed(1)
      : "1.0"

  // Select icon and message based on comparison
  const ComparisonIcon = isQuantumFaster ? TrendingDown : isClassicalFaster ? TrendingUp : Equal
  const iconColor = isQuantumFaster ? "text-ibmec-blue" : isClassicalFaster ? "text-success" : "text-muted-foreground"
  const messageKey = isQuantumFaster
    ? "results.quantumFaster"
    : isClassicalFaster
      ? "results.quantumSlower"
      : "results.sameSpeed"

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-gradient-to-br from-ibmec-blue/10 to-success/10 border border-ibmec-blue/30">
      <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-ibmec-blue" />
        {t("results.algorithmComparison")}
      </h4>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">{t("config.classical")}</p>
          <p className="text-lg font-bold font-mono text-success">
            {comparison.classical?.timeMs.toFixed(2)}<span className="text-xs ml-1">ms</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">{t("config.quantum")}</p>
          <p className="text-lg font-bold font-mono text-ibmec-blue">
            {comparison.quantum?.timeMs.toFixed(3)}<span className="text-xs ml-1">ms</span>
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-background/50">
        <ComparisonIcon className={cn("w-4 h-4", iconColor)} />
        <span className="text-sm font-medium text-foreground">
          {isSameSpeed ? t(messageKey) : t(messageKey, { speedup: displaySpeedup })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        {t("tooltip.comparisonOverhead")}
      </p>
      {distDiff !== 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t("results.distanceDiff")} {distDiff > 0 ? "+" : ""}{distDiff.toFixed(0)} km
        </p>
      )}
    </motion.div>
  )
}

function exportCSV(results: any, t: (key: string, params?: Record<string, string | number>) => string) {
  const rows = [
    [t("csv.metric"), t("csv.value")],
    [t("csv.totalDistance"), results.totalDistance],
    [t("csv.fuelCost"), results.fuelCost],
    [t("csv.calcTime"), results.timeMs.toFixed(3)],
    [t("csv.method"), results.method],
    [t("csv.usedRealRoads"), results.usedRealRoads ? t("csv.yes") : t("csv.no")],
  ]

  if (results.sequence) {
    rows.push(["", ""])
    rows.push([t("csv.routeSequence"), ""])
    results.sequence.forEach((city: any, i: number) => {
      rows.push([t("csv.stop", { n: i + 1 }), city.name])
    })
  }

  const csvContent = rows.map(row => row.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `quantum-route-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
