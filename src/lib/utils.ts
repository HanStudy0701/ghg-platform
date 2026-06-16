import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatTCO2e(value: number | null | undefined): string {
  return formatNumber(value, 4) + ' tCO₂e'
}

export function formatKWh(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('zh-TW', { maximumFractionDigits: 2 }) + ' kWh'
}

export function getMonthName(month: number): string {
  return `${month} 月`
}

export function getYearOptions(start = 2015, end = 2025): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => end - i)
}

export function getMonthOptions(): { value: number; label: string }[] {
  return Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1} 月` }))
}
