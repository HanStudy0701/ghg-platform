import {
  AIR_FACTORS, COMMUTE_FACTORS, WASTE_FACTORS, EEIO_FACTORS, LATEST_GRID_FACTOR,
  WTT_FUEL_FACTORS, GRID_UPSTREAM_UPLIFT_RATE, GRID_TD_LOSS_RATE,
  FREIGHT_FACTORS, BUILDING_EUI, INVESTMENT_PROXY_FACTOR,
} from '@/lib/constants/emissionFactors'

// ── 資料品質三層架構（GHG Protocol Scope 3 Standard, Ch.7 Data Quality）──
// 適用於全部 15 個類別：每個類別下可有多筆資料（多供應商/多筆採購），
// 各自選擇最合適的計算層級，系統再依占類別總排放的比重自動判斷關聯度。
export type DataTier = 'spend_based' | 'activity_based' | 'supplier_primary'

export const TIER_LABELS: Record<DataTier, { label: string; quality: string; desc: string }> = {
  spend_based: {
    label: '支出基礎法',
    quality: '資料品質：低（誤差 ±40~60%）',
    desc: '用採購金額 × 產業平均係數（EEIO）估算，資料最容易取得，但精度最低，適合作為起步或無法取得實物量數據時使用。',
  },
  activity_based: {
    label: '實物量基礎法',
    quality: '資料品質：中（誤差 ±10~30%）',
    desc: '用實際的活動數據（如重量、距離、用電量、面積）× 排放係數估算，比支出法精確，是大多數類別建議的標準做法。',
  },
  supplier_primary: {
    label: '供應商一手數據',
    quality: '資料品質：高（實測值）',
    desc: '直接採用供應商提供的、經第三方驗證或自行量化的實際排放數據（如供應商的碳足跡報告、CDP 問卷回覆、ISO 14064-1 聲明書），精度最高，是 GHG Protocol 建議的優先選項。',
  },
}

/**
 * 自動關聯度判斷：依該筆資料排放量占同類別年度總排放的比重分級。
 * 比重 ≥30% → 高度相關；10~30% → 中度相關；<10% → 低度相關。
 * 對應使用情境：採購人員在同一 Category（如 Category 1）下登錄了多家供應商，
 * 系統自動標示出哪幾家供應商排放占比最高，應優先取得其一手數據。
 */
export function classifyRelevance(amount: number, categoryTotal: number): 'high' | 'medium' | 'low' {
  if (!categoryTotal || categoryTotal <= 0) return amount > 0 ? 'high' : 'low'
  const share = Math.abs(amount) / Math.abs(categoryTotal)
  if (share >= 0.3) return 'high'
  if (share >= 0.1) return 'medium'
  return 'low'
}

/** 是否建議升級資料品質：高關聯度但仍用支出基礎法估算時，建議改用實物量法或供應商一手數據 */
export function suggestUpgrade(tier: DataTier, relevance: 'high' | 'medium' | 'low'): boolean {
  return relevance === 'high' && tier === 'spend_based'
}

// ── 通用支出基礎法（適用任一類別，作為各類別皆可選用的第一層方法）──
export interface GenericSpendInput {
  category: keyof typeof EEIO_FACTORS
  spend_twd: number
  exchange_rate_usd?: number
}

export function calculateGenericSpend(input: GenericSpendInput): { tco2e: number; steps: string[] } {
  const factor_data = EEIO_FACTORS[input.category]
  if (!factor_data) throw new Error(`未知採購類別：${input.category}`)
  const exchange_rate = input.exchange_rate_usd ?? 31.5
  const spend_usd = input.spend_twd / exchange_rate
  const tco2e = (spend_usd * factor_data.factor) / 1000
  return {
    tco2e,
    steps: [
      `採購/支出類別：${factor_data.name_zh}`,
      `金額：NT$ ${input.spend_twd.toLocaleString()} ÷ ${exchange_rate} = USD ${spend_usd.toFixed(2)}`,
      `EEIO 係數：${factor_data.factor} kgCO₂e/USD（USEEIO 代理，誤差 ±40~60%）`,
      `排放量：${spend_usd.toFixed(2)} USD × ${factor_data.factor} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
    ]
  }
}

// ── Category 6：商務旅行 ──────────────────────────────────────
export interface BusinessTravelInput {
  transport_type: 'air' | 'hsr' | 'tra' | 'car' | 'taxi'
  flight_type?: 'domestic' | 'short_haul' | 'long_haul'
  cabin_class?: 'economy' | 'business' | 'first'
  distance_km: number
  passengers: number
  round_trip: boolean
}

export function calculateBusinessTravel(input: BusinessTravelInput): { tco2e: number; factor: number; steps: string[] } {
  let factor = 0
  let factor_label = ''

  if (input.transport_type === 'air') {
    const key = `${input.flight_type ?? 'domestic'}_${input.cabin_class ?? 'economy'}` as keyof typeof AIR_FACTORS
    factor = AIR_FACTORS[key] ?? AIR_FACTORS.domestic_economy
    factor_label = `航空（${key}）：${factor} kgCO₂e/pkm（含RFI=1.9）`
  } else {
    const factors: Record<string, number> = { hsr: 0.041, tra: 0.029, car: 0.171, taxi: 0.211 }
    factor = factors[input.transport_type] ?? 0.171
    factor_label = `${input.transport_type}：${factor} kgCO₂e/pkm`
  }

  const multiplier = input.round_trip ? 2 : 1
  const total_pkm = input.distance_km * input.passengers * multiplier
  const tco2e = (total_pkm * factor) / 1000

  return {
    tco2e,
    factor,
    steps: [
      factor_label,
      `距離：${input.distance_km} km × 人數 ${input.passengers} × ${input.round_trip ? '來回 × 2' : '單程'}`,
      `總人公里：${total_pkm.toLocaleString()} pkm`,
      `排放量：${total_pkm.toLocaleString()} pkm × ${factor} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
    ]
  }
}

// ── Category 7：員工通勤 ──────────────────────────────────────
export interface CommuteInput {
  transport_type: keyof typeof COMMUTE_FACTORS
  distance_km: number
  workdays_per_year: number
  employees: number
}

export function calculateCommute(input: CommuteInput): { tco2e: number; steps: string[] } {
  const factor = COMMUTE_FACTORS[input.transport_type] ?? 0
  const total_km = input.distance_km * 2 * input.workdays_per_year * input.employees
  const tco2e = (total_km * factor) / 1000

  return {
    tco2e,
    steps: [
      `交通工具：${input.transport_type}  係數：${factor} kgCO₂e/km/人`,
      `單程距離：${input.distance_km} km × 2（來回）× ${input.workdays_per_year} 工作日 × ${input.employees} 人`,
      `總公里數：${total_km.toLocaleString()} km`,
      `排放量：${total_km.toLocaleString()} km × ${factor} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
    ]
  }
}

// ── Category 1：採購商品服務（支出法）────────────────────────
export interface SpendBasedInput {
  category: keyof typeof EEIO_FACTORS
  spend_twd: number
  exchange_rate_usd?: number  // 預設 31.5 TWD/USD
}

export function calculateSpendBased(input: SpendBasedInput): { tco2e: number; steps: string[] } {
  const factor_data = EEIO_FACTORS[input.category]
  if (!factor_data) throw new Error(`未知採購類別：${input.category}`)

  const exchange_rate = input.exchange_rate_usd ?? 31.5
  const spend_usd = input.spend_twd / exchange_rate
  const tco2e = (spend_usd * factor_data.factor) / 1000

  return {
    tco2e,
    steps: [
      `採購類別：${factor_data.name_zh}`,
      `採購金額：NT$ ${input.spend_twd.toLocaleString()} ÷ ${exchange_rate} = USD ${spend_usd.toFixed(2)}`,
      `EEIO 係數：${factor_data.factor} kgCO₂e/USD（USEEIO 代理，誤差 ±40~60%）`,
      `排放量：${spend_usd.toFixed(2)} USD × ${factor_data.factor} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
    ]
  }
}

// ── Category 11：使用銷售產品排放 ────────────────────────────
export interface ProductUsageInput {
  residential_units: number
  office_units: number
  retail_units: number
  grid_factor?: number  // 預設 2024 年係數
}

export function calculateProductUsage(input: ProductUsageInput): { tco2e: number; steps: string[] } {
  const grid_factor = input.grid_factor ?? LATEST_GRID_FACTOR

  // 年均用電量（kWh/戶/年）
  const residential_kwh = 2750   // 30坪住宅平均
  const office_kwh = 45000       // 100坪商辦平均
  const retail_kwh = 11500       // 20坪店面平均

  const total_kwh =
    input.residential_units * residential_kwh +
    input.office_units * office_kwh +
    input.retail_units * retail_kwh

  const tco2e = (total_kwh * grid_factor) / 1000

  return {
    tco2e,
    steps: [
      `仲介成交：住宅 ${input.residential_units} 戶 + 商辦 ${input.office_units} 個 + 店面 ${input.retail_units} 個`,
      `住宅年均用電：${residential_kwh.toLocaleString()} kWh/戶 × ${input.residential_units} = ${(input.residential_units * residential_kwh).toLocaleString()} kWh`,
      `商辦年均用電：${office_kwh.toLocaleString()} kWh/個 × ${input.office_units} = ${(input.office_units * office_kwh).toLocaleString()} kWh`,
      `店面年均用電：${retail_kwh.toLocaleString()} kWh/個 × ${input.retail_units} = ${(input.retail_units * retail_kwh).toLocaleString()} kWh`,
      `總用電量：${total_kwh.toLocaleString()} kWh/年`,
      `電網係數（${new Date().getFullYear()} 年）：${grid_factor} kgCO₂e/kWh`,
      `排放量：${total_kwh.toLocaleString()} × ${grid_factor} / 1000 = ${tco2e.toFixed(2)} tCO₂e/年`,
      `注意：本計算以「一年」為基礎。GHG Protocol 建議計算預期壽命期間排放。`,
    ]
  }
}

// ── Category 5：廢棄物 ────────────────────────────────────────
export function calculateWaste(
  waste_type: keyof typeof WASTE_FACTORS,
  weight_ton: number
): { tco2e: number; factor: number; steps: string[] } {
  const factor = WASTE_FACTORS[waste_type] ?? 0

  const tco2e = weight_ton * factor
  return {
    tco2e,
    factor,
    steps: [
      `廢棄物重量：${weight_ton} 公噸`,
      `處理方式：${waste_type}  係數：${factor} tCO₂e/ton（IPCC 2006 Guidelines）`,
      `排放量：${weight_ton} × ${factor} = ${tco2e.toFixed(4)} tCO₂e`,
    ]
  }
}

// ── Category 2：資本財（支出法，與 Category 1 相同方法但於採購當年度全數計入）──
// GHG Protocol Scope 3 Standard：資本財不分年攤提折舊，於取得當年度一次性計入排放
export interface CapitalGoodsInput {
  category: keyof typeof EEIO_FACTORS
  spend_twd: number
  exchange_rate_usd?: number
}

export function calculateCapitalGoods(input: CapitalGoodsInput): { tco2e: number; steps: string[] } {
  const factor_data = EEIO_FACTORS[input.category]
  if (!factor_data) throw new Error(`未知資本財類別：${input.category}`)

  const exchange_rate = input.exchange_rate_usd ?? 31.5
  const spend_usd = input.spend_twd / exchange_rate
  const tco2e = (spend_usd * factor_data.factor) / 1000

  return {
    tco2e,
    steps: [
      `資本財類別：${factor_data.name_zh}`,
      `採購金額：NT$ ${input.spend_twd.toLocaleString()} ÷ ${exchange_rate} = USD ${spend_usd.toFixed(2)}`,
      `EEIO 係數：${factor_data.factor} kgCO₂e/USD（USEEIO 代理，誤差 ±40~60%）`,
      `排放量：${spend_usd.toFixed(2)} USD × ${factor_data.factor} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
      `說明：依 GHG Protocol Scope3 Standard，資本財（如裝修、設備、辦公家具）於取得當年度一次性全數計入，不分年攤提折舊。`,
    ]
  }
}

// ── Category 3：燃料與能源相關活動（不含於 Scope 1/2）─────────
// GHG Protocol Table 5.5：(a) 上游燃料開採運輸排放 (b) 外購電力發電燃料上游排放 (c) 輸配電損失排放
export interface UpstreamFuelInput {
  fuel_type: keyof typeof WTT_FUEL_FACTORS
  fuel_consumption: number  // 與 Scope1 燃料用量一致（L 或 m³）
}

export function calculateUpstreamFuel(input: UpstreamFuelInput): { tco2e: number; steps: string[] } {
  const factor = WTT_FUEL_FACTORS[input.fuel_type] ?? 0
  const tco2e = (input.fuel_consumption * factor) / 1000

  return {
    tco2e,
    steps: [
      `燃料種類：${input.fuel_type}　Well-to-Tank 上游係數：${factor} kgCO₂e/單位（DEFRA 代理值）`,
      `燃料用量：${input.fuel_consumption.toLocaleString()} 單位（應與 Scope1 該燃料用量一致）`,
      `排放量：${input.fuel_consumption.toLocaleString()} × ${factor} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
      `說明：對應 GHG Protocol Scope3 Standard Table 5.5(a)，為燃料開採/精煉/運輸階段排放，不重複計入 Scope1 燃燒排放。`,
    ]
  }
}

export interface UpstreamElectricityInput {
  electricity_kwh: number  // 應與 Scope2 外購電力用量一致
  grid_factor?: number
}

export function calculateUpstreamElectricity(input: UpstreamElectricityInput): { tco2e: number; steps: string[] } {
  const grid_factor = input.grid_factor ?? LATEST_GRID_FACTOR
  const generation_upstream_kg = input.electricity_kwh * grid_factor * GRID_UPSTREAM_UPLIFT_RATE
  const td_loss_kg = input.electricity_kwh * grid_factor * GRID_TD_LOSS_RATE
  const tco2e = (generation_upstream_kg + td_loss_kg) / 1000

  return {
    tco2e,
    steps: [
      `外購電力：${input.electricity_kwh.toLocaleString()} kWh（應與 Scope2 用電量一致）　電網係數：${grid_factor} kgCO₂e/kWh`,
      `(b) 發電燃料上游排放：${input.electricity_kwh.toLocaleString()} × ${grid_factor} × ${(GRID_UPSTREAM_UPLIFT_RATE * 100).toFixed(1)}% = ${generation_upstream_kg.toFixed(2)} kgCO₂e`,
      `(c) 輸配電(T&D)損失排放：${input.electricity_kwh.toLocaleString()} × ${grid_factor} × ${(GRID_TD_LOSS_RATE * 100).toFixed(1)}% = ${td_loss_kg.toFixed(2)} kgCO₂e`,
      `排放量：(${generation_upstream_kg.toFixed(2)} + ${td_loss_kg.toFixed(2)}) / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
      `說明：對應 GHG Protocol Scope3 Standard Table 5.5(b)(c)。非公用事業不需計算(d)售電之發電排放。`,
    ]
  }
}

// ── Category 4：上游運輸與配送（距離法）──────────────────────
export interface UpstreamFreightInput {
  mode: keyof typeof FREIGHT_FACTORS
  weight_ton: number
  distance_km: number
}

export function calculateUpstreamFreight(input: UpstreamFreightInput): { tco2e: number; steps: string[] } {
  const factor = FREIGHT_FACTORS[input.mode] ?? FREIGHT_FACTORS.truck
  const tonne_km = input.weight_ton * input.distance_km
  const tco2e = (tonne_km * factor) / 1000

  return {
    tco2e,
    steps: [
      `運輸方式：${input.mode}　係數：${factor} kgCO₂e/tonne-km（GLEC Framework 代理值）`,
      `貨物重量：${input.weight_ton} 公噸 × 距離 ${input.distance_km} km = ${tonne_km.toLocaleString()} tonne-km`,
      `排放量：${tonne_km.toLocaleString()} × ${factor} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
      `說明：採距離法(distance-based)，依 GHG Protocol Scope3 Standard Table 5.7，計算供應商至報告公司間第三方運輸/倉儲排放。`,
    ]
  }
}

// ── Category 13：下游租賃資產（樓地板面積平均法）──────────────
export interface LeasedAssetInput {
  building_type: keyof typeof BUILDING_EUI
  floor_area_sqm: number
  grid_factor?: number
}

export function calculateLeasedAsset(input: LeasedAssetInput): { tco2e: number; steps: string[] } {
  const eui = BUILDING_EUI[input.building_type] ?? BUILDING_EUI.office
  const grid_factor = input.grid_factor ?? LATEST_GRID_FACTOR
  const kwh = input.floor_area_sqm * eui
  const tco2e = (kwh * grid_factor) / 1000

  return {
    tco2e,
    steps: [
      `租賃資產類型：${input.building_type}　樓地板面積：${input.floor_area_sqm.toLocaleString()} m²`,
      `能源使用強度(EUI)：${eui} kWh/m²/年`,
      `估計用電量：${input.floor_area_sqm.toLocaleString()} × ${eui} = ${kwh.toLocaleString()} kWh/年`,
      `電網係數：${grid_factor} kgCO₂e/kWh`,
      `排放量：${kwh.toLocaleString()} × ${grid_factor} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
      `說明：採樓地板面積平均法(floor-area-average method)，為 GHG Protocol Scope3 Standard 對下游租賃資產的最低資料要求方法（資產別法為優先選項，需個別資產實測數據）。`,
    ]
  }
}

// ── Category 14：加盟業者（樓地板面積平均法）──────────────────
// 對信義房屋尤其重要：加盟總部需計入未納入自身組織邊界的加盟店 Scope1+2 排放
export interface FranchiseInput {
  store_type: keyof typeof BUILDING_EUI
  store_count: number
  avg_floor_area_sqm: number
  grid_factor?: number
}

export function calculateFranchise(input: FranchiseInput): { tco2e: number; steps: string[] } {
  const eui = BUILDING_EUI[input.store_type] ?? BUILDING_EUI.retail
  const grid_factor = input.grid_factor ?? LATEST_GRID_FACTOR
  const total_area = input.store_count * input.avg_floor_area_sqm
  const kwh = total_area * eui
  const tco2e = (kwh * grid_factor) / 1000

  return {
    tco2e,
    steps: [
      `加盟店類型：${input.store_type}　店數：${input.store_count} 間 × 平均面積 ${input.avg_floor_area_sqm} m² = ${total_area.toLocaleString()} m²`,
      `能源使用強度(EUI)：${eui} kWh/m²/年`,
      `估計用電量：${total_area.toLocaleString()} × ${eui} = ${kwh.toLocaleString()} kWh/年`,
      `電網係數：${grid_factor} kgCO₂e/kWh`,
      `排放量：${kwh.toLocaleString()} × ${grid_factor} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
      `說明：加盟業者(franchise)類別計算加盟總部尚未納入自身組織邊界(Scope1+2)之加盟店排放，依 GHG Protocol Scope3 Standard 最低資料要求採樓地板面積平均法估算。對信義房屋以加盟為主的展店模式為重要類別。`,
    ]
  }
}

// ── Category 15：投資 ─────────────────────────────────────────
export interface InvestmentInput {
  method: 'equity_share' | 'proxy_spend'
  investee_scope12_tco2e?: number  // equity_share 法：被投資公司 Scope1+2 排放量
  ownership_pct?: number           // equity_share 法：持股比例 (%)
  investment_amount_twd?: number   // proxy_spend 法：投資金額（無法取得被投資公司數據時使用）
  exchange_rate_usd?: number
}

export function calculateInvestment(input: InvestmentInput): { tco2e: number; steps: string[] } {
  if (input.method === 'equity_share') {
    const emissions = input.investee_scope12_tco2e ?? 0
    const pct = input.ownership_pct ?? 0
    const tco2e = emissions * (pct / 100)
    return {
      tco2e,
      steps: [
        `方法：股權比例法(equity share approach)`,
        `被投資公司 Scope1+2 排放量：${emissions.toLocaleString()} tCO₂e`,
        `持股比例：${pct}%`,
        `排放量：${emissions.toLocaleString()} × ${pct}% = ${tco2e.toFixed(4)} tCO₂e`,
        `說明：依 GHG Protocol Scope3 Standard Table 5.9，股權投資按持股比例認列被投資公司 Scope1+2 排放。`,
      ]
    }
  }

  const exchange_rate = input.exchange_rate_usd ?? 31.5
  const amount_usd = (input.investment_amount_twd ?? 0) / exchange_rate
  const tco2e = (amount_usd * INVESTMENT_PROXY_FACTOR) / 1000
  return {
    tco2e,
    steps: [
      `方法：代理支出法(proxy/spend-based，無法取得被投資公司實際排放數據時使用)`,
      `投資金額：NT$ ${(input.investment_amount_twd ?? 0).toLocaleString()} ÷ ${exchange_rate} = USD ${amount_usd.toFixed(2)}`,
      `產業代理係數：${INVESTMENT_PROXY_FACTOR} kgCO₂e/USD（不動產相關產業 EEIO 代理值）`,
      `排放量：${amount_usd.toFixed(2)} × ${INVESTMENT_PROXY_FACTOR} / 1000 = ${tco2e.toFixed(4)} tCO₂e`,
      `說明：資料品質較低（僅供初估），建議優先取得被投資公司實際排放數據改用股權比例法。`,
    ]
  }
}
