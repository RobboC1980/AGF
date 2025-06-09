import { Target, Rocket, BookOpen, CheckSquare, Zap, TrendingUp, AlertTriangle, Trophy } from "lucide-react"

export type EntityType = "projects" | "epics" | "stories" | "tasks" | "sprints" | "initiatives" | "risks" | "okrs"

export interface EntityConfig {
  icon: React.ComponentType<any>
  title: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}

export const ENTITY_CONFIGS: Record<EntityType, EntityConfig> = {
  projects: {
    icon: Target,
    title: "Projects",
    description: "Strategic project portfolio management",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  epics: {
    icon: Rocket,
    title: "Epics",
    description: "Large features and major initiatives",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  stories: {
    icon: BookOpen,
    title: "Stories",
    description: "User stories and requirements",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  tasks: {
    icon: CheckSquare,
    title: "Tasks",
    description: "Individual work items and deliverables",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  sprints: {
    icon: Zap,
    title: "Sprints",
    description: "Time-boxed development iterations",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  initiatives: {
    icon: TrendingUp,
    title: "Initiatives",
    description: "Strategic business objectives",
    color: "text-pink-700",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
  risks: {
    icon: AlertTriangle,
    title: "Risks",
    description: "Project risks and mitigation strategies",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  okrs: {
    icon: Trophy,
    title: "OKRs",
    description: "Objectives and Key Results tracking",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
}

export const PRIORITY_CONFIG = {
  low: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  high: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
}

export const STATUS_CONFIG = {
  backlog: { color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
  ready: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  "in-progress": { color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  review: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  done: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  completed: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
}

export const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 }

export type Priority = keyof typeof PRIORITY_CONFIG
export type Status = keyof typeof STATUS_CONFIG 