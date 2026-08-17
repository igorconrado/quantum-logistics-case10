"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  HelpCircle,
  MapPin,
  Cpu,
  Zap,
  Route,
  ChevronRight,
  BookOpen,
  Lightbulb,
  Building2,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type TabType = "howto" | "algorithms" | "about"

export function HelpModal() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>("howto")

  const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
    { id: "howto", icon: <BookOpen className="w-4 h-4" />, label: t("help.tabHowTo") },
    { id: "algorithms", icon: <Cpu className="w-4 h-4" />, label: t("help.tabAlgorithms") },
    { id: "about", icon: <Building2 className="w-4 h-4" />, label: t("help.tabAbout") },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("header.help")}
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-ibmec-gold/20">
              <HelpCircle className="w-5 h-5 text-ibmec-gold" />
            </div>
            {t("help.title")}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 border border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "howto" && <HowToContent />}
              {activeTab === "algorithms" && <AlgorithmsContent />}
              {activeTab === "about" && <AboutContent />}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HowToContent() {
  const { t } = useTranslation()

  const steps = [
    {
      number: 1,
      icon: <Route className="w-5 h-5" />,
      title: t("help.step1Title"),
      description: t("help.step1Desc"),
    },
    {
      number: 2,
      icon: <Cpu className="w-5 h-5" />,
      title: t("help.step2Title"),
      description: t("help.step2Desc"),
    },
    {
      number: 3,
      icon: <MapPin className="w-5 h-5" />,
      title: t("help.step3Title"),
      description: t("help.step3Desc"),
    },
    {
      number: 4,
      icon: <Zap className="w-5 h-5" />,
      title: t("help.step4Title"),
      description: t("help.step4Desc"),
    },
  ]

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">{t("help.howToIntro")}</p>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex gap-4 p-4 rounded-lg bg-secondary/30 border border-border"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-ibmec-gold/20 flex items-center justify-center text-ibmec-gold font-bold">
                {step.number}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-ibmec-blue">{step.icon}</span>
                <h4 className="font-semibold text-foreground">{step.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-ibmec-blue/10 border border-ibmec-blue/30">
        <Lightbulb className="w-5 h-5 text-ibmec-blue flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-foreground mb-1">{t("help.tipTitle")}</h4>
          <p className="text-sm text-muted-foreground">{t("help.tipContent")}</p>
        </div>
      </div>
    </div>
  )
}

function AlgorithmsContent() {
  const { t } = useTranslation()

  const algorithms = [
    {
      type: "classical",
      name: t("help.classicalTitle"),
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      methods: [
        { name: t("algo.brute_force"), desc: t("help.bruteForceDesc"), limit: "8" },
        { name: t("algo.nearest_neighbor"), desc: t("help.nearestNeighborDesc"), limit: "50+" },
        { name: t("algo.networkx"), desc: t("help.networkxDesc"), limit: "50+" },
      ],
    },
    {
      type: "quantum",
      name: t("help.quantumTitle"),
      color: "text-ibmec-blue",
      bgColor: "bg-ibmec-blue/10",
      borderColor: "border-ibmec-blue/30",
      methods: [
        { name: t("algo.quantum_numpy"), desc: t("help.quantumNumpyDesc"), limit: "4" },
      ],
    },
  ]

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">{t("help.algorithmsIntro")}</p>

      {algorithms.map((category) => (
        <div
          key={category.type}
          className={cn("rounded-lg border p-4", category.bgColor, category.borderColor)}
        >
          <h4 className={cn("font-semibold mb-3 flex items-center gap-2", category.color)}>
            {category.type === "classical" ? (
              <Cpu className="w-4 h-4" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {category.name}
          </h4>
          <div className="space-y-3">
            {category.methods.map((method) => (
              <div key={method.name} className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{method.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground">
                      max {method.limit} {t("help.points")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{method.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
        <h4 className="font-semibold text-warning mb-2">{t("help.quantumLimitTitle")}</h4>
        <p className="text-sm text-muted-foreground">{t("help.quantumLimitDesc")}</p>
      </div>
    </div>
  )
}

function AboutContent() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 py-4">
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-ibmec-gold/20 to-ibmec-blue/20 border border-ibmec-gold/30 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt="Quantum Logistics"
            className="w-10 h-10"
          />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Quantum Logistics</h3>
        <p className="text-sm text-muted-foreground">{t("help.aboutSubtitle")}</p>
      </div>

      <div className="grid gap-4">
        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <h4 className="font-semibold text-foreground mb-2">{t("help.projectTitle")}</h4>
          <p className="text-sm text-muted-foreground">{t("help.projectDesc")}</p>
        </div>

        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <h4 className="font-semibold text-foreground mb-3">{t("help.partnersTitle")}</h4>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50">
              <span className="font-semibold text-ibmec-gold">IBMEC</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50">
              <span className="font-semibold text-ibmec-blue">KPMG</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50">
              <span className="font-semibold text-foreground">TDC Net</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <h4 className="font-semibold text-foreground mb-2">{t("help.techStackTitle")}</h4>
          <div className="flex flex-wrap gap-2">
            {["Next.js", "React", "Qiskit", "Flask", "Leaflet", "OpenRouteService"].map((tech) => (
              <span
                key={tech}
                className="px-2 py-1 text-xs rounded-md bg-background/50 text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pt-4">
        <a
          href="https://github.com/igorconrado/quantum-logistics"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          GitHub
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <span className="text-muted-foreground">•</span>
        <span className="text-sm text-muted-foreground">Case 10 - Danish Quantum Use Cases</span>
      </div>
    </div>
  )
}
