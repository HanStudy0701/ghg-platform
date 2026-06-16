// ================================================================
// 排放係數常數
// 來源：環境部 113 年 2 月 5 日公告 + 能源署 2024 年公告
// ================================================================

export const GWP = {
  CH4: 28,    // IPCC AR6
  N2O: 265,   // IPCC AR6
}

// 熱值（kcal/L 或 kcal/m³）
export const HEAT_VALUES = {
  gasoline: 7800,       // kcal/L
  diesel: 8400,         // kcal/L
  lpg: 6635,            // kcal/L
  natural_gas: 9000,    // kcal/m³
}

// kcal 轉 TJ 係數
export const KCAL_TO_TJ = 4.1868e-9

// 燃料排放係數（kg/TJ）
export const FUEL_FACTORS: Record<string, {
  co2: number
  ch4_stationary: number
  n2o_stationary: number
  ch4_mobile: number
  n2o_mobile: number
  heat_value: number
  unit: string
  name_zh: string
}> = {
  gasoline: {
    co2: 69300,
    ch4_stationary: 3,
    n2o_stationary: 0.6,
    ch4_mobile: 3.8,       // 輕型車有觸媒
    n2o_mobile: 5.7,
    heat_value: 7800,
    unit: 'L',
    name_zh: '車用汽油',
  },
  diesel: {
    co2: 74100,
    ch4_stationary: 3,
    n2o_stationary: 0.6,
    ch4_mobile: 3.9,
    n2o_mobile: 3.9,
    heat_value: 8400,
    unit: 'L',
    name_zh: '柴油',
  },
  lpg: {
    co2: 63100,
    ch4_stationary: 1,
    n2o_stationary: 0.1,
    ch4_mobile: 1,
    n2o_mobile: 0.1,
    heat_value: 6635,
    unit: 'L',
    name_zh: '液化石油氣（LPG）',
  },
  natural_gas: {
    co2: 56100,
    ch4_stationary: 1,
    n2o_stationary: 0.1,
    ch4_mobile: 1,
    n2o_mobile: 0.1,
    heat_value: 9000,
    unit: 'm³',
    name_zh: '天然氣',
  },
}

// 實用係數（kgCO2e/公升 或 m³，已含 CH4/N2O）
export const PRACTICAL_FACTORS = {
  gasoline_stationary: 2.263,
  diesel_stationary: 2.619,
  lpg_stationary: 1.613,
  natural_gas_stationary: 2.092,
  gasoline_mobile: 2.263,
  diesel_mobile: 2.619,
}

// 冷媒 GWP（IPCC AR5，台灣環境部現行採用）
export const REFRIGERANT_GWP: Record<string, { gwp: number; name_zh: string }> = {
  'R-22':   { gwp: 1760, name_zh: 'R-22（HCFC-22）' },
  'R-134a': { gwp: 1430, name_zh: 'R-134a（HFC-134a）' },
  'R-410A': { gwp: 2088, name_zh: 'R-410A' },
  'R-32':   { gwp: 675,  name_zh: 'R-32' },
  'R-404A': { gwp: 3922, name_zh: 'R-404A' },
  'R-407C': { gwp: 1774, name_zh: 'R-407C' },
  'R-1234yf': { gwp: 4,  name_zh: 'R-1234yf' },
}

// 冷媒逸散率（%/年，依 IPCC 2006 Guidelines）
export const REFRIGERANT_LEAK_RATES = {
  window_ac: 5,
  split_ac: 5,
  central_ac: 2,
  commercial_refrigeration: 15,
  car_ac: 10,
}

// 台灣電網排放係數（kgCO2e/kWh）
export const GRID_FACTORS: Record<number, number> = {
  2020: 0.502,
  2021: 0.509,
  2022: 0.495,
  2023: 0.494,
  2024: 0.474,
}

export const LATEST_GRID_YEAR = 2024
export const LATEST_GRID_FACTOR = 0.474

// Scope 3 Category 6 航空係數（kgCO2e/pkm，含 RFI=1.9）
export const AIR_FACTORS = {
  domestic_economy: 0.255,
  short_haul_economy: 0.156,
  short_haul_business: 0.234,
  long_haul_economy: 0.151,
  long_haul_business: 0.429,
}

// Scope 3 Category 7 通勤係數（kgCO2e/km/人）
export const COMMUTE_FACTORS: Record<string, number> = {
  car_gasoline: 0.171,
  motorcycle_125cc: 0.083,
  mrt_hsr: 0.035,
  bus: 0.089,
  electric_scooter: 0.022,
  walk_bicycle: 0,
}

// Scope 3 Category 5 廢棄物係數（tCO2e/ton）
export const WASTE_FACTORS: Record<string, number> = {
  incineration: 0.53,
  landfill: 0.48,
  recycling_metal: 0.01,
  recycling_paper: 0.021,
  recycling_plastic: 0.029,
}

// Scope 3 Category 1 EEIO 係數（kgCO2e/USD，以 USEEIO 為代理）
export const EEIO_FACTORS: Record<string, { factor: number; name_zh: string }> = {
  office_supplies: { factor: 0.55, name_zh: '辦公用品/文具' },
  it_hardware: { factor: 0.42, name_zh: 'IT 硬體設備' },
  advertising: { factor: 0.28, name_zh: '廣告/行銷服務' },
  cleaning_service: { factor: 0.32, name_zh: '清潔/保潔服務' },
  telecom: { factor: 0.21, name_zh: '電信服務' },
  printing: { factor: 0.68, name_zh: '印刷/紙張' },
  it_service: { factor: 0.25, name_zh: 'IT 系統/服務' },
  food_beverage: { factor: 0.35, name_zh: '餐飲服務' },
  construction: { factor: 0.45, name_zh: '建築/裝修' },
  other: { factor: 0.35, name_zh: '其他服務' },
}

// Scope 3 Category 3 燃料與能源相關活動（不含於 Scope1/2）
// (a) 上游燃料開採/精煉/運輸排放（Well-to-Tank, WTT）
export const WTT_FUEL_FACTORS: Record<string, number> = {
  gasoline: 0.556,      // kgCO2e/L，DEFRA 2024 WTT-gasoline（代理值，無台灣本地 WTT 數據時使用）
  diesel: 0.617,        // kgCO2e/L，DEFRA 2024 WTT-diesel（代理值）
  lpg: 0.214,           // kgCO2e/L，DEFRA 2024 WTT-LPG（代理值）
  natural_gas: 0.330,   // kgCO2e/m³，DEFRA 2024 WTT-natural gas（代理值）
}

// (b)(c) 外購電力：發電燃料上游排放 + 輸配電(T&D)損失，以電網係數百分比估算
export const GRID_UPSTREAM_UPLIFT_RATE = 0.047  // 4.7%，發電燃料上游排放估計（國際平均代理值）
export const GRID_TD_LOSS_RATE = 0.043          // 4.3%，台灣輸配電損失率（台電公開資料代理值）

// Scope 3 Category 4 上游運輸與配送（貨運，距離法）kgCO2e/tonne-km
export const FREIGHT_FACTORS: Record<string, number> = {
  truck: 0.107,   // 公路貨運（HGV），GLEC Framework 代理值
  rail: 0.028,    // 鐵路貨運
  sea: 0.012,     // 海運（貨櫃船）
  air: 0.602,     // 空運貨運
}

// Scope 3 Category 13/14 下游租賃資產／加盟業者：建築能源使用強度（EUI, kWh/m²/年）
export const BUILDING_EUI: Record<string, number> = {
  office: 180,      // 商辦
  retail: 220,      // 店面/零售門店（信義房屋加盟店型態）
  residential: 65,  // 住宅
  warehouse: 90,    // 倉儲
}

// Scope 3 Category 15 投資：無法取得被投資公司實際排放數據時，以投資金額代理估算（kgCO2e/USD）
export const INVESTMENT_PROXY_FACTOR = 0.45  // 沿用不動產相關產業 EEIO 代理值（同 construction）

// Scope 3 15 Categories 基本資訊
export const SCOPE3_CATEGORIES = [
  { number: 1,  name: '採購商品與服務', relevance: 'high', applicable: true },
  { number: 2,  name: '資本財', relevance: 'low', applicable: true },
  { number: 3,  name: '燃料與能源相關活動', relevance: 'medium', applicable: true },
  { number: 4,  name: '上游運輸與配送', relevance: 'low', applicable: true },
  { number: 5,  name: '廢棄物', relevance: 'low', applicable: true },
  { number: 6,  name: '商務旅行', relevance: 'high', applicable: true },
  { number: 7,  name: '員工通勤', relevance: 'high', applicable: true },
  { number: 8,  name: '上游租賃資產', relevance: 'low', applicable: false },
  { number: 9,  name: '下游運輸與配送', relevance: 'low', applicable: false },
  { number: 10, name: '已出售中間產品加工', relevance: 'low', applicable: false },
  { number: 11, name: '使用銷售產品排放', relevance: 'high', applicable: true },
  { number: 12, name: '已出售產品終末處理', relevance: 'low', applicable: false },
  { number: 13, name: '下游租賃資產', relevance: 'medium', applicable: true },
  { number: 14, name: '加盟業者', relevance: 'medium', applicable: true },
  { number: 15, name: '投資', relevance: 'low', applicable: true },
]
