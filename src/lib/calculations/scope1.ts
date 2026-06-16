import { FUEL_FACTORS, REFRIGERANT_GWP, KCAL_TO_TJ, GWP } from '@/lib/constants/emissionFactors'

export interface FuelCalculationInput {
  fuelType: string
  amount: number
  unit: string
  emissionCategory: 'stationary' | 'mobile'
}

export interface FuelCalculationResult {
  co2_kg: number
  ch4_kg: number
  n2o_kg: number
  ch4_co2e_kg: number
  n2o_co2e_kg: number
  total_tco2e: number
  heat_value_kcal: number
  heat_tj: number
  co2_factor: number
  ch4_factor: number
  n2o_factor: number
  calculation_steps: string[]
}

/**
 * 燃料燃燒排放計算
 * 公式：排放量 = 燃料用量 × 熱值 × 熱值換算TJ × 排放係數 × GWP / 1000
 */
export function calculateFuelEmission(input: FuelCalculationInput): FuelCalculationResult {
  const fuelData = FUEL_FACTORS[input.fuelType]
  if (!fuelData) throw new Error(`未知燃料類型：${input.fuelType}`)

  const { co2, ch4_stationary, n2o_stationary, ch4_mobile, n2o_mobile, heat_value } = fuelData
  const ch4_factor = input.emissionCategory === 'mobile' ? ch4_mobile : ch4_stationary
  const n2o_factor = input.emissionCategory === 'mobile' ? n2o_mobile : n2o_stationary

  // 熱量（kcal）
  const heat_kcal = input.amount * heat_value

  // 轉換為 TJ
  const heat_tj = heat_kcal * KCAL_TO_TJ

  // 各氣體排放量（kg）
  const co2_kg = co2 * heat_tj
  const ch4_kg = ch4_factor * heat_tj
  const n2o_kg = n2o_factor * heat_tj

  // 換算為 CO2e（kg）
  const ch4_co2e_kg = ch4_kg * GWP.CH4
  const n2o_co2e_kg = n2o_kg * GWP.N2O

  // 合計（tCO2e）
  const total_tco2e = (co2_kg + ch4_co2e_kg + n2o_co2e_kg) / 1000

  const steps = [
    `燃料：${fuelData.name_zh}  用量：${input.amount} ${input.unit}`,
    `熱值：${heat_value} kcal/${input.unit} × ${KCAL_TO_TJ.toExponential(4)} TJ/kcal = ${heat_tj.toExponential(4)} TJ`,
    `CO₂ 排放：${co2} kg/TJ × ${heat_tj.toExponential(4)} TJ × 1 = ${co2_kg.toFixed(6)} kgCO₂`,
    `CH₄ 排放：${ch4_factor} kg/TJ × ${heat_tj.toExponential(4)} TJ × ${GWP.CH4} = ${ch4_co2e_kg.toFixed(6)} kgCO₂e`,
    `N₂O 排放：${n2o_factor} kg/TJ × ${heat_tj.toExponential(4)} TJ × ${GWP.N2O} = ${n2o_co2e_kg.toFixed(6)} kgCO₂e`,
    `合計：${(co2_kg + ch4_co2e_kg + n2o_co2e_kg).toFixed(6)} kgCO₂e = ${total_tco2e.toFixed(6)} tCO₂e`,
    `來源：環境部 113 年 2 月 5 日公告係數（GWP: IPCC AR6）`,
  ]

  return {
    co2_kg,
    ch4_kg,
    n2o_kg,
    ch4_co2e_kg,
    n2o_co2e_kg,
    total_tco2e,
    heat_value_kcal: heat_kcal,
    heat_tj,
    co2_factor: co2,
    ch4_factor,
    n2o_factor,
    calculation_steps: steps,
  }
}

export interface RefrigerantCalculationInput {
  refrigerantType: string
  /** 逸散率法：原始填充量(kg) */
  charge_kg?: number
  /** 逸散率法：逸散率(%) */
  leak_rate_pct?: number
  /** 實測補充量法：實際補充量(kg) */
  refill_kg?: number
  method: 'leak_rate' | 'refill_amount'
}

export interface RefrigerantCalculationResult {
  leak_kg: number
  gwp: number
  total_tco2e: number
  calculation_steps: string[]
}

/**
 * 冷媒逸散排放計算
 */
export function calculateRefrigerantEmission(input: RefrigerantCalculationInput): RefrigerantCalculationResult {
  const refData = REFRIGERANT_GWP[input.refrigerantType]
  if (!refData) throw new Error(`未知冷媒類型：${input.refrigerantType}`)

  let leak_kg: number
  let steps: string[]

  if (input.method === 'refill_amount' && input.refill_kg !== undefined) {
    leak_kg = input.refill_kg
    steps = [
      `冷媒：${refData.name_zh}  GWP = ${refData.gwp}（IPCC AR5）`,
      `實測補充量：${leak_kg} kg`,
    ]
  } else if (input.charge_kg !== undefined && input.leak_rate_pct !== undefined) {
    leak_kg = input.charge_kg * (input.leak_rate_pct / 100)
    steps = [
      `冷媒：${refData.name_zh}  GWP = ${refData.gwp}（IPCC AR5）`,
      `原始填充量：${input.charge_kg} kg × 逸散率 ${input.leak_rate_pct}% = ${leak_kg.toFixed(6)} kg`,
    ]
  } else {
    throw new Error('請提供逸散量計算所需的輸入值')
  }

  const total_tco2e = (leak_kg * refData.gwp) / 1000

  steps.push(
    `逸散量：${leak_kg.toFixed(6)} kg × GWP ${refData.gwp} = ${(leak_kg * refData.gwp).toFixed(4)} kgCO₂e`,
    `合計：${total_tco2e.toFixed(6)} tCO₂e`,
    `來源：環境部 113 年 2 月 5 日公告（IPCC AR5 GWP）`
  )

  return {
    leak_kg,
    gwp: refData.gwp,
    total_tco2e,
    calculation_steps: steps,
  }
}
