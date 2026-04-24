"use client"

import { useState } from "react"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import {
  MapPin,
  Plus,
  GripVertical,
  X,
  Zap,
  Cpu,
  Route,
  Shuffle,
  Navigation,
  Info,
  Loader2,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRoute } from "@/lib/route-context"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { ALGORITHM_LIMITS, BRAZIL_CAPITALS } from "@/lib/types"

export function ConfigPanel() {
  const {
    selectedCities,
    availableCities,
    addCity,
    removeCity,
    setSelectedCities,
    config,
    updateConfig,
    calculateRoute,
    calculateComparison,
    isCalculating,
    generateRandomPoints,
    loadPoints,
    isLoadingPoints,
  } = useRoute()
  const { t } = useTranslation()

  const [addCityOpen, setAddCityOpen] = useState(false)
  const [compareDialogOpen, setCompareDialogOpen] = useState(false)

  const currentLimit = config.algorithmType === "quantum"
    ? ALGORITHM_LIMITS[config.quantumMethod]
    : ALGORITHM_LIMITS[config.classicalMethod]

  const isOverLimit = selectedCities.length > currentLimit

  const handleDragEnd = (newOrder: typeof selectedCities) => {
    setSelectedCities(newOrder.map((c, i) => ({ ...c, isHub: i === 0 })))
  }

  const canGenerate = config.mode === "intercities" || (config.mode === "intracidade" && config.selectedCity)

  return (
    <div className="flex flex-col h-full">
      {/* Section: Route Mode */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Route className="w-4 h-4 text-ibmec-gold" />
            {t("config.routeScope")}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("config.routeScope")}>
          <button
            onClick={() => {
              updateConfig({ mode: "intercities", selectedCity: null })
              setSelectedCities([])
            }}
            aria-pressed={config.mode === "intercities"}
            aria-label={t("config.intercities")}
            className={cn(
              "px-3 py-2.5 rounded-lg text-xs font-medium transition-all border",
              config.mode === "intercities"
                ? "bg-ibmec-gold/20 border-ibmec-gold/50 text-ibmec-gold"
                : "bg-secondary/50 border-border text-muted-foreground hover:border-muted-foreground"
            )}
          >
            {t("config.intercities")}
          </button>
          <button
            onClick={() => {
              updateConfig({ mode: "intracidade", selectedCity: null })
              setSelectedCities([])
            }}
            aria-pressed={config.mode === "intracidade"}
            aria-label={t("config.intracity")}
            className={cn(
              "px-3 py-2.5 rounded-lg text-xs font-medium transition-all border",
              config.mode === "intracidade"
                ? "bg-ibmec-gold/20 border-ibmec-gold/50 text-ibmec-gold"
                : "bg-secondary/50 border-border text-muted-foreground hover:border-muted-foreground"
            )}
          >
            {t("config.intracity")}
          </button>
        </div>

        {/* City selector for intracidade */}
        {config.mode === "intracidade" && (
          <div className="mt-3">
            <Select
              value={config.selectedCity || ""}
              onValueChange={(v) => {
                updateConfig({ selectedCity: v })
                setSelectedCities([])
              }}
            >
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue placeholder={t("config.selectCity")} />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60" sideOffset={4}>
                {BRAZIL_CAPITALS.map((city) => (
                  <SelectItem key={city.key} value={city.key}>
                    {city.name} ({city.state})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Section: Algorithm */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Cpu className="w-4 h-4 text-ibmec-blue" />
            {t("config.algorithm")}
          </h3>
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{t("tooltip.algorithmInfo")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("config.algorithmTooltip", { quantumLimit: ALGORITHM_LIMITS.quantum_numpy, classicalLimit: ALGORITHM_LIMITS.nearest_neighbor })}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateConfig({ algorithmType: "classical" })}
              aria-pressed={config.algorithmType === "classical"}
              aria-label={t("config.classical")}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border",
                config.algorithmType === "classical"
                  ? "bg-success/20 border-success/50 text-success"
                  : "bg-secondary/50 border-border text-muted-foreground hover:border-muted-foreground"
              )}
            >
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
              {t("config.classical")}
            </button>
            <button
              onClick={() => updateConfig({ algorithmType: "quantum" })}
              aria-pressed={config.algorithmType === "quantum"}
              aria-label={t("config.quantum")}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border",
                config.algorithmType === "quantum"
                  ? "bg-ibmec-blue/20 border-ibmec-blue/50 text-ibmec-blue"
                  : "bg-secondary/50 border-border text-muted-foreground hover:border-muted-foreground"
              )}
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              {t("config.quantum")}
            </button>
          </div>

          {config.algorithmType === "classical" ? (
            <Select
              value={config.classicalMethod}
              onValueChange={(v) => updateConfig({ classicalMethod: v as any })}
            >
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value="brute_force">
                  {t("algo.brute_force")} (max 8)
                </SelectItem>
                <SelectItem value="nearest_neighbor">
                  {t("algo.nearest_neighbor")}
                </SelectItem>
                <SelectItem value="networkx">
                  {t("algo.networkx")}
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-2">
              <Select
                value={config.quantumMethod}
                onValueChange={(v) => updateConfig({ quantumMethod: v as any })}
              >
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <SelectItem value="quantum_numpy">
                          <div className="flex flex-col">
                            <span>{t("algo.quantum_numpy")}</span>
                            <span className="text-xs text-muted-foreground">{t("tooltip.quantumNumpyShort")}</span>
                          </div>
                        </SelectItem>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>{t("tooltip.quantumNumpy")}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <SelectItem value="quantum_qaoa">
                          <div className="flex flex-col">
                            <span>{t("algo.quantum_qaoa")}</span>
                            <span className="text-xs text-muted-foreground">{t("tooltip.quantumQaoaShort")}</span>
                          </div>
                        </SelectItem>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>{t("tooltip.quantumQaoa")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground px-1">
                {config.quantumMethod === "quantum_numpy"
                  ? t("tooltip.quantumNumpy")
                  : t("tooltip.quantumQaoa")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section: Real Roads */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="real-roads" className="text-sm text-foreground cursor-pointer">
              {t("config.useRealRoads")}
            </Label>
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{t("tooltip.realRoads")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            id="real-roads"
            checked={config.useRealRoads}
            onCheckedChange={(v) => updateConfig({ useRealRoads: v })}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 ml-6">
          {t("config.realRoadsDesc")}
        </p>
      </div>

      {/* Section: Points & Generate */}
      <div className="p-4 border-b border-border">
        {config.mode === "intracidade" && config.selectedCity && (
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs text-muted-foreground">{t("config.numNeighborhoods")}</Label>
            <Select
              value={String(Math.min(config.numPoints, currentLimit))}
              onValueChange={(v) => updateConfig({ numPoints: Number(v) })}
            >
              <SelectTrigger className="w-20 bg-secondary/50 border-border h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {[3, 4, 5, 6, 7, 8, 9, 10].filter((n) => n <= currentLimit).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {config.mode === "intercities" && (
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs text-muted-foreground">{t("config.waypoints")}</Label>
            <Select
              value={String(Math.min(config.numPoints, currentLimit))}
              onValueChange={(v) => updateConfig({ numPoints: Number(v) })}
            >
              <SelectTrigger className="w-20 bg-secondary/50 border-border h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {[3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 27].filter((n) => n <= currentLimit).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          className="w-full bg-gradient-to-r from-ibmec-blue/80 to-ibmec-blue hover:from-ibmec-blue hover:to-ibmec-blue/80 text-white font-medium"
          onClick={loadPoints}
          disabled={!canGenerate || isLoadingPoints}
        >
          {isLoadingPoints ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("config.loadingPoints")}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              {t("config.generatePoints")}
            </>
          )}
        </Button>
      </div>

      {/* Section: Waypoints list */}
      {selectedCities.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-ibmec-gold" />
                {t("config.waypoints")}
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                  {selectedCities.length}
                </span>
              </h3>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => generateRandomPoints(Math.min(5, currentLimit))}
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("config.randomPoints")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Popover open={addCityOpen} onOpenChange={setAddCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={availableCities.length === 0 || selectedCities.length >= currentLimit}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {availableCities.map((city) => (
                        <button
                          key={city.id}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-secondary transition-colors text-left"
                          onClick={() => {
                            addCity(city)
                            setAddCityOpen(false)
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{city.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{city.state}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Draggable city list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <Reorder.Group
              axis="y"
              values={selectedCities}
              onReorder={handleDragEnd}
              className="space-y-2"
            >
              <AnimatePresence mode="popLayout">
                {selectedCities.map((city, index) => (
                  <Reorder.Item
                    key={city.id}
                    value={city}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-grab active:cursor-grabbing",
                      city.isHub
                        ? "bg-ibmec-gold/10 border-ibmec-gold/30"
                        : "bg-secondary/50 border-border hover:border-muted-foreground"
                    )}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      city.isHub
                        ? "bg-ibmec-gold text-ibmec-blue"
                        : "bg-ibmec-blue text-white"
                    )}>
                      {city.isHub ? "H" : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{city.name}</p>
                      <p className="text-xs text-muted-foreground">{city.state}</p>
                    </div>
                    {!city.isHub && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-error flex-shrink-0"
                        onClick={() => removeCity(city.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {isOverLimit && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-2 rounded-lg bg-error/10 border border-error/30"
              >
                <p className="text-xs text-error">
                  {t("config.tooManyPoints", { type: config.algorithmType, limit: currentLimit })}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          className="w-full bg-gradient-to-r from-ibmec-gold to-ibmec-gold-light hover:from-ibmec-gold-light hover:to-ibmec-gold text-ibmec-blue font-semibold"
          onClick={calculateRoute}
          disabled={isCalculating || selectedCities.length < 2 || isOverLimit}
        >
          {isCalculating ? (
            <>
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              {t("config.calculating")}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              {t("config.calculateRoute")}
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full border-ibmec-blue/50 text-ibmec-blue hover:bg-ibmec-blue/10 bg-transparent"
          onClick={() => {
            if (selectedCities.length > ALGORITHM_LIMITS.quantum_numpy) {
              setCompareDialogOpen(true)
            } else {
              calculateComparison()
            }
          }}
          disabled={isCalculating || selectedCities.length < 2}
        >
          <Cpu className="w-4 h-4 mr-2" />
          {t("config.compareQuantumClassical")}
        </Button>
      </div>

      {/* Comparison unavailable dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-ibmec-blue" />
              {t("config.compareUnavailableTitle")}
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              {t("config.compareUnavailableDesc", { count: selectedCities.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareDialogOpen(false)}>
              {t("config.understood")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
