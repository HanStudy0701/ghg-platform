import { cn } from "@/lib/utils"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"

interface KPICardProps {
  title: string
  value: number | null
  unit?: string
  change?: number // % change vs last year
  changeLabel?: string
  colorClass?: string
  icon?: React.ReactNode
  subtitle?: string
}

export function KPICard({
  title,
  value,
  unit = "tCO₂e",
  change,
  changeLabel = "較去年",
  colorClass = "text-[#1B4332]",
  icon,
  subtitle,
}: KPICardProps) {
  const displayValue = value === null || value === undefined
    ? "—"
    : value.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="bg-white border border-border rounded p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="text-sm text-muted-foreground font-medium">{title}</div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className={cn("font-mono text-2xl font-semibold", colorClass)}>
        {displayValue}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{unit}</div>

      {subtitle && (
        <div className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
          {subtitle}
        </div>
      )}

      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-xs mt-2",
          change > 0 ? "text-red-600" : change < 0 ? "text-green-600" : "text-muted-foreground"
        )}>
          {change > 0 ? <ArrowUp className="w-3 h-3" /> : change < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          <span>{Math.abs(change).toFixed(1)}% {changeLabel}</span>
        </div>
      )}
    </div>
  )
}
