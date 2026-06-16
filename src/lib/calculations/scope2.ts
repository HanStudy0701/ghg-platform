import { GRID_FACTORS, LATEST_GRID_FACTOR } from '@/lib/constants/emissionFactors'

export interface Scope2CalculationInput {
  electricity_kwh: number
  renewable_kwh?: number
  year?: number
  supplier_factor?: number  // 市場基礎法：供應商電力排放係數（綠電=0）
}

export interface Scope2CalculationResult {
  grid_factor: number
  location_based_tco2e: number
  market_based_tco2e: number
  rec_kwh: number
  calculation_steps: string[]
}

/**
 * Scope 2 電力排放計算
 * 地點基礎法 & 市場基礎法
 */
export function calculateScope2Emission(input: Scope2CalculationInput): Scope2CalculationResult {
  const grid_factor = input.year && GRID_FACTORS[input.year]
    ? GRID_FACTORS[input.year]
    : LATEST_GRID_FACTOR

  const rec_kwh = input.renewable_kwh ?? 0
  const supplier_factor = input.supplier_factor ?? 0  // 綠電預設為 0

  // 地點基礎法
  const location_based_tco2e = (input.electricity_kwh * grid_factor) / 1000

  // 市場基礎法（REC 抵減部分視為零排放）
  const market_based_tco2e = (
    (input.electricity_kwh - rec_kwh) * grid_factor + rec_kwh * supplier_factor
  ) / 1000

  const year_label = input.year ?? LATEST_GRID_FACTOR

  const steps = [
    `外購電量：${input.electricity_kwh.toLocaleString()} kWh`,
    `再生能源憑證（REC）：${rec_kwh.toLocaleString()} kWh`,
    `電網排放係數（${input.year ?? 2024} 年）：${grid_factor} kgCO₂e/kWh`,
    `來源：經濟部能源署公告`,
    ``,
    `【地點基礎法】${input.electricity_kwh.toLocaleString()} kWh × ${grid_factor} / 1000 = ${location_based_tco2e.toFixed(4)} tCO₂e`,
    `【市場基礎法】(${input.electricity_kwh.toLocaleString()} - ${rec_kwh.toLocaleString()}) × ${grid_factor} / 1000 + ${rec_kwh.toLocaleString()} × ${supplier_factor} / 1000 = ${market_based_tco2e.toFixed(4)} tCO₂e`,
  ]

  return {
    grid_factor,
    location_based_tco2e,
    market_based_tco2e,
    rec_kwh,
    calculation_steps: steps,
  }
}
