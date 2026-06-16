"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { GuideCard, type GuideStep } from "@/components/ui/GuideCard"
import { FieldHint } from "@/components/ui/FieldHint"
import {
  SCOPE3_CATEGORIES, EEIO_FACTORS, COMMUTE_FACTORS, LATEST_GRID_FACTOR,
  WTT_FUEL_FACTORS, FREIGHT_FACTORS, BUILDING_EUI, WASTE_FACTORS,
} from "@/lib/constants/emissionFactors"
import {
  calculateGenericSpend, calculateCommute, calculateBusinessTravel, calculateProductUsage, calculateWaste,
  calculateCapitalGoods, calculateUpstreamFuel, calculateUpstreamElectricity, calculateUpstreamFreight,
  calculateLeasedAsset, calculateFranchise, calculateInvestment,
  classifyRelevance, suggestUpgrade, TIER_LABELS,
} from "@/lib/calculations/scope3"
import type { DataTier } from "@/lib/calculations/scope3"
import { Save, Trash2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"

type Relevance = "high" | "medium" | "low"

// ── 每個類別的新手指引內容（白話說明，假設使用者完全不懂碳盤查）──
const CATEGORY_GUIDES: Record<number, GuideStep[]> = {
  1: [
    { title: "這個類別在算什麼", content: "公司向外採購的商品與服務，從原料生產到送到你手上之前所產生的排放（不含你自己使用時的排放）。例如：辦公用品、廣告服務、清潔服務、IT 系統等。" },
    { title: "你需要準備什麼資料", content: "最簡單：每筆採購的金額（台幣）就能估算。如果想更精確：採購的實際數量/重量，或請供應商提供他們自己的碳足跡數據。" },
    { title: "怎麼選計算方式", content: "剛開始先用「支出基礎法」（只需金額，最快上手）。等資料成熟後，針對排放占比最高（系統會自動標示「高度相關」）的供應商，優先換成「供應商一手數據」以提升精確度。" },
  ],
  2: [
    { title: "這個類別在算什麼", content: "公司採購的資本財，如分店裝修、辦公設備、IT 硬體等，生產製造階段的排放。" },
    { title: "你需要準備什麼資料", content: "採購金額（台幣），於取得當年度一次性全數列計，不需要分年攤提折舊。" },
    { title: "怎麼選計算方式", content: "通常用「支出基礎法」即可。若有設備的詳細規格或供應商提供的碳足跡數據，可改用實物量法或供應商一手數據。" },
  ],
  3: [
    { title: "這個類別在算什麼", content: "你在 Scope 1（自有燃料燃燒）和 Scope 2（外購電力）以外，還有上游沒被計入的排放：例如汽油/柴油從開採到送到加油站之前的排放、發電廠燃料的上游排放、以及電力從發電廠送到你這邊路上流失的部分（輸配電損失）。" },
    { title: "你需要準備什麼資料", content: "直接沿用你在 Scope 1 填過的燃料用量、或 Scope 2 填過的外購電力度數即可，不需要額外調查新數據。" },
    { title: "怎麼選計算方式", content: "這個類別系統已內建「實物量基礎法」公式（沿用你的燃料/電力用量），直接填入即可，是最準確也最省力的做法。" },
  ],
  4: [
    { title: "這個類別在算什麼", content: "由第三方公司（不是你自己的車隊）幫你運送貨物所產生的排放，例如委託物流公司配送辦公用品、文件等。" },
    { title: "你需要準備什麼資料", content: "貨物重量（公噸）和運送距離（公里），或運輸費用金額。" },
    { title: "怎麼選計算方式", content: "有重量和距離就用「實物量基礎法」（較準確）；如果只知道花了多少運費，可以先用「支出基礎法」估算。" },
  ],
  5: [
    { title: "這個類別在算什麼", content: "公司營運產生的廢棄物，委託第三方處理（焚化、掩埋、回收）時的排放。" },
    { title: "你需要準備什麼資料", content: "廢棄物重量（公噸）以及處理方式（焚化／掩埋／回收金屬／回收紙類／回收塑膠）。" },
    { title: "怎麼選計算方式", content: "「實物量基礎法」最準確，只要知道重量和處理方式即可計算，建議優先使用。" },
  ],
  6: [
    { title: "這個類別在算什麼", content: "員工出差（搭飛機、高鐵、台鐵、租車、計程車）所產生的排放。" },
    { title: "你需要準備什麼資料", content: "交通方式、單程距離（公里）、出差人數、是否來回。" },
    { title: "怎麼選計算方式", content: "直接用「實物量基礎法」，系統已內建航空（含艙等）、高鐵、台鐵、商務用車、計程車的標準係數。" },
  ],
  7: [
    { title: "這個類別在算什麼", content: "員工每天通勤上下班所產生的排放（不是公司的車，是員工自己通勤的方式）。" },
    { title: "你需要準備什麼資料", content: "員工主要通勤方式（汽車/機車/捷運/公車/步行等）、平均單程距離、一年工作天數、員工人數。可用問卷調查或抽樣估算。" },
    { title: "怎麼選計算方式", content: "用「實物量基礎法」，系統會自動算：距離 ×2（來回）× 工作天數 × 員工人數 × 該交通方式係數。" },
  ],
  8: [
    { title: "這個類別在算什麼", content: "你「向別人租用」的資產（廠房、設備等），但這個資產的排放還沒被算進你自己的 Scope 1+2（例如以營運控制法做邊界劃分時，承租但非營運控制的資產）。" },
    { title: "你需要準備什麼資料", content: "承租資產的樓地板面積與類型，或實際能源使用數據。" },
    { title: "怎麼選計算方式", content: "若資產不適用於信義房屋的營運模式，可在上方標示「不適用」並說明理由。" },
  ],
  9: [
    { title: "這個類別在算什麼", content: "你賣出的產品，離開你手上之後、送到消費者手上之前的運輸與配送排放（由你付費委託，但前提是 Category 4 沒有計入這部分）。" },
    { title: "你需要準備什麼資料", content: "下游運輸的重量與距離資料，若無此類活動可標示不適用。" },
    { title: "怎麼選計算方式", content: "信義房屋為仲介服務業，通常沒有實體產品下游配送，多數情況可標示「不適用」並說明理由。" },
  ],
  10: [
    { title: "這個類別在算什麼", content: "你賣出的「半成品」，被買方進一步加工成最終產品時所產生的排放。" },
    { title: "你需要準備什麼資料", content: "若公司沒有出售需再加工的中間產品，此類別通常不適用。" },
    { title: "怎麼選計算方式", content: "多數服務業（包括房仲業）可標示「不適用」並說明理由。" },
  ],
  11: [
    { title: "這個類別在算什麼", content: "信義房屋最重要的類別之一：透過仲介成交的房屋／商辦／店面，買方入住後使用能源（電力）所產生的排放。" },
    { title: "你需要準備什麼資料", content: "年度成交的住宅戶數、商辦個數、店面個數。系統已內建各類型物件的年均用電量估計值。" },
    { title: "怎麼選計算方式", content: "直接用「實物量基礎法」填入成交戶數/個數即可，系統會自動套用標準用電量與電網係數計算。" },
  ],
  12: [
    { title: "這個類別在算什麼", content: "你賣出的產品，使用壽命結束後被丟棄、回收或處理時的排放。" },
    { title: "你需要準備什麼資料", content: "若無相關實體產品銷售後的廢棄處理活動，可標示不適用；若有，需要產品重量與處理方式。" },
    { title: "怎麼選計算方式", content: "可參考 Category 5 的廢棄物係數，依重量與處理方式估算，或標示不適用並說明理由。" },
  ],
  13: [
    { title: "這個類別在算什麼", content: "你「出租給別人」使用的資產（如店面、辦公室），但這個資產的能源使用排放還沒算進你自己的 Scope 1+2。" },
    { title: "你需要準備什麼資料", content: "出租資產的類型（商辦/店面/住宅/倉儲）與樓地板面積。" },
    { title: "怎麼選計算方式", content: "用「實物量基礎法」，系統會用標準能源使用強度（EUI）× 面積 × 電網係數估算。" },
  ],
  14: [
    { title: "這個類別在算什麼", content: "對信義房屋特別重要：加盟店的營運排放（電力、燃料），這些加盟店不是你直接營運控制的，但屬於你的加盟體系。" },
    { title: "你需要準備什麼資料", content: "加盟店類型、店數、平均每店樓地板面積。" },
    { title: "怎麼選計算方式", content: "用「實物量基礎法」，系統會用標準能源使用強度（EUI）× 總面積 × 電網係數估算每間加盟店的排放。" },
  ],
  15: [
    { title: "這個類別在算什麼", content: "公司的股權投資（如轉投資的子公司或關係企業），依持股比例認列被投資公司的排放。" },
    { title: "你需要準備什麼資料", content: "最好：被投資公司的 Scope 1+2 排放量與你的持股比例。若無法取得：投資金額也可以先估算。" },
    { title: "怎麼選計算方式", content: "有被投資公司排放數據時，用「股權比例法」（較準確）；沒有時，用「代理支出法」（先以投資金額估算，之後再補正）。" },
  ],
}

// ── 通用 EEIO 支出法可用於所有類別，作為起步用的第一層方法 ──

export default function CategoryPage() {
  const params = useParams()
  const catNum = parseInt(params.id as string)
  const supabase = createClient()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [year, setYear] = useState(2024)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [lineItems, setLineItems] = useState<any[]>([])
  const [naRecord, setNaRecord] = useState<any>(null)
  const [naMode, setNaMode] = useState(false)
  const [naReason, setNaReason] = useState("")

  const [calcSteps, setCalcSteps] = useState<string[]>([])
  const [showCalc, setShowCalc] = useState(false)
  const [tco2e, setTco2e] = useState<number | null>(null)

  // New line-item common fields
  const [tier, setTier] = useState<DataTier>("activity_based")
  const [supplierName, setSupplierName] = useState("")
  const [notes, setNotes] = useState("")

  // Tier: spend_based (generic, any category)
  const [spendCategory, setSpendCategory] = useState("other")
  const [spendAmount, setSpendAmount] = useState("")

  // Tier: supplier_primary (generic, any category)
  const [primaryTco2e, setPrimaryTco2e] = useState("")
  const [primarySource, setPrimarySource] = useState("supplier_report")
  const [primarySourceOther, setPrimarySourceOther] = useState("")

  // Tier: activity_based — category-specific state
  const [transportType, setTransportType] = useState<"air" | "hsr" | "tra" | "car" | "taxi">("air")
  const [flightType, setFlightType] = useState<"domestic" | "short_haul" | "long_haul">("short_haul")
  const [cabinClass, setCabinClass] = useState<"economy" | "business">("economy")
  const [distance, setDistance] = useState("")
  const [passengers, setPassengers] = useState("1")
  const [roundTrip, setRoundTrip] = useState(true)
  const [commuteTransport, setCommuteTransport] = useState("car_gasoline")
  const [commuteDistance, setCommuteDistance] = useState("")
  const [workdays, setWorkdays] = useState("240")
  const [employees, setEmployees] = useState("")
  const [residentialUnits, setResidentialUnits] = useState("")
  const [officeUnits, setOfficeUnits] = useState("")
  const [retailUnits, setRetailUnits] = useState("")
  const [capitalCategory, setCapitalCategory] = useState("construction")
  const [capitalSpend, setCapitalSpend] = useState("")
  const [c3Mode, setC3Mode] = useState<"fuel" | "electricity">("electricity")
  const [c3FuelType, setC3FuelType] = useState<keyof typeof WTT_FUEL_FACTORS>("gasoline")
  const [c3FuelAmount, setC3FuelAmount] = useState("")
  const [c3ElectricityKwh, setC3ElectricityKwh] = useState("")
  const [freightMode, setFreightMode] = useState<keyof typeof FREIGHT_FACTORS>("truck")
  const [freightWeight, setFreightWeight] = useState("")
  const [freightDistance, setFreightDistance] = useState("")
  const [leaseBuildingType, setLeaseBuildingType] = useState<keyof typeof BUILDING_EUI>("office")
  const [leaseFloorArea, setLeaseFloorArea] = useState("")
  const [franchiseStoreType, setFranchiseStoreType] = useState<keyof typeof BUILDING_EUI>("retail")
  const [franchiseStoreCount, setFranchiseStoreCount] = useState("")
  const [franchiseAvgArea, setFranchiseAvgArea] = useState("")
  const [investMethod, setInvestMethod] = useState<"equity_share" | "proxy_spend">("equity_share")
  const [investeeEmissions, setInvesteeEmissions] = useState("")
  const [ownershipPct, setOwnershipPct] = useState("")
  const [investAmount, setInvestAmount] = useState("")
  const [wasteType, setWasteType] = useState<keyof typeof WASTE_FACTORS>("landfill")
  const [wasteWeight, setWasteWeight] = useState("")
  // Generic activity fallback (categories 1,2,8,9,10,12 under activity_based tier)
  const [activityData, setActivityData] = useState("")
  const [activityUnit, setActivityUnit] = useState("")
  const [emissionFactor, setEmissionFactor] = useState("")
  const [efSource, setEfSource] = useState("")

  const catInfo = SCOPE3_CATEGORIES.find(c => c.number === catNum)
  const hasBespokeActivityCalc = [3, 4, 5, 6, 7, 11, 13, 14, 15].includes(catNum)

  async function fetchAll(compId: string) {
    const [{ data: items }, { data: na }] = await Promise.all([
      supabase.from("scope3_records").select("*")
        .eq("company_id", compId).eq("year", year).eq("category_number", catNum)
        .neq("calculation_method", "not_applicable").order("created_at"),
      supabase.from("scope3_records").select("*")
        .eq("company_id", compId).eq("year", year).eq("category_number", catNum)
        .eq("calculation_method", "not_applicable").maybeSingle(),
    ])
    setLineItems(items || [])
    setNaRecord(na || null)
    setNaMode(!!na)
    setNaReason(na?.notes || "")
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: comp } = await supabase.from("companies").select("id").eq("owner_id", user.id).single()
      if (!comp) return
      setCompanyId(comp.id)
      fetchAll(comp.id)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catNum, year])

  const categoryTotal = useMemo(() => lineItems.reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0), [lineItems])

  // Auto-calculate preview for the new line item being entered
  useEffect(() => {
    try {
      if (tier === "supplier_primary") {
        const v = parseFloat(primaryTco2e)
        if (primaryTco2e && v >= 0) {
          setTco2e(v)
          setCalcSteps([
            `資料來源：供應商一手數據（${primarySource === "other" ? primarySourceOther : { supplier_report: "供應商碳足跡報告", cdp: "CDP 問卷回覆", iso14064: "供應商 ISO 14064-1 查證聲明書", other: primarySourceOther }[primarySource] || primarySource})`,
            `供應商提供之排放量：${v.toFixed(4)} tCO₂e（直接採用，不需再乘排放係數）`,
          ])
        } else { setTco2e(null) }
        return
      }
      if (tier === "spend_based") {
        if (spendAmount && parseFloat(spendAmount) > 0) {
          const r = calculateGenericSpend({ category: spendCategory as keyof typeof EEIO_FACTORS, spend_twd: parseFloat(spendAmount) })
          setTco2e(r.tco2e); setCalcSteps(r.steps)
        } else { setTco2e(null) }
        return
      }
      // tier === activity_based
      if (catNum === 6 && distance && parseFloat(distance) > 0) {
        const r = calculateBusinessTravel({ transport_type: transportType, flight_type: flightType, cabin_class: cabinClass, distance_km: parseFloat(distance), passengers: parseInt(passengers || "1"), round_trip: roundTrip })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 7 && commuteDistance && employees) {
        const r = calculateCommute({ transport_type: commuteTransport as keyof typeof COMMUTE_FACTORS, distance_km: parseFloat(commuteDistance), workdays_per_year: parseInt(workdays || "240"), employees: parseInt(employees) })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 11 && (residentialUnits || officeUnits || retailUnits)) {
        const r = calculateProductUsage({ residential_units: parseInt(residentialUnits || "0"), office_units: parseInt(officeUnits || "0"), retail_units: parseInt(retailUnits || "0") })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 3 && c3Mode === "fuel" && c3FuelAmount && parseFloat(c3FuelAmount) > 0) {
        const r = calculateUpstreamFuel({ fuel_type: c3FuelType, fuel_consumption: parseFloat(c3FuelAmount) })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 3 && c3Mode === "electricity" && c3ElectricityKwh && parseFloat(c3ElectricityKwh) > 0) {
        const r = calculateUpstreamElectricity({ electricity_kwh: parseFloat(c3ElectricityKwh) })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 4 && freightWeight && freightDistance && parseFloat(freightWeight) > 0) {
        const r = calculateUpstreamFreight({ mode: freightMode, weight_ton: parseFloat(freightWeight), distance_km: parseFloat(freightDistance) })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 5 && wasteWeight && parseFloat(wasteWeight) > 0) {
        const r = calculateWaste(wasteType, parseFloat(wasteWeight))
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 13 && leaseFloorArea && parseFloat(leaseFloorArea) > 0) {
        const r = calculateLeasedAsset({ building_type: leaseBuildingType, floor_area_sqm: parseFloat(leaseFloorArea) })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 14 && franchiseStoreCount && franchiseAvgArea && parseFloat(franchiseStoreCount) > 0) {
        const r = calculateFranchise({ store_type: franchiseStoreType, store_count: parseInt(franchiseStoreCount), avg_floor_area_sqm: parseFloat(franchiseAvgArea) })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 15 && investMethod === "equity_share" && investeeEmissions && ownershipPct) {
        const r = calculateInvestment({ method: "equity_share", investee_scope12_tco2e: parseFloat(investeeEmissions), ownership_pct: parseFloat(ownershipPct) })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 15 && investMethod === "proxy_spend" && investAmount && parseFloat(investAmount) > 0) {
        const r = calculateInvestment({ method: "proxy_spend", investment_amount_twd: parseFloat(investAmount) })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (catNum === 2 && capitalSpend && parseFloat(capitalSpend) > 0) {
        // capital goods under activity tier falls back to generic activity input below; keep capital-specific spend calc available too
        const r = calculateCapitalGoods({ category: capitalCategory as keyof typeof EEIO_FACTORS, spend_twd: parseFloat(capitalSpend) })
        setTco2e(r.tco2e); setCalcSteps(r.steps)
      } else if (activityData && emissionFactor && parseFloat(activityData) > 0 && parseFloat(emissionFactor) > 0) {
        const result = parseFloat(activityData) * parseFloat(emissionFactor) / 1000
        setTco2e(result)
        setCalcSteps([
          `活動數據：${activityData} ${activityUnit}`,
          `排放係數：${emissionFactor} kgCO₂e/${activityUnit}（來源：${efSource || "未填寫"}）`,
          `排放量：${activityData} × ${emissionFactor} / 1000 = ${result.toFixed(4)} tCO₂e`,
        ])
      } else { setTco2e(null) }
    } catch { setTco2e(null) }
  }, [tier, catNum, spendAmount, spendCategory, primaryTco2e, primarySource, primarySourceOther,
      distance, transportType, flightType, cabinClass, passengers, roundTrip,
      commuteTransport, commuteDistance, workdays, employees, residentialUnits, officeUnits, retailUnits,
      activityData, activityUnit, emissionFactor, efSource,
      capitalCategory, capitalSpend, c3Mode, c3FuelType, c3FuelAmount, c3ElectricityKwh,
      freightMode, freightWeight, freightDistance, wasteType, wasteWeight, leaseBuildingType, leaseFloorArea,
      franchiseStoreType, franchiseStoreCount, franchiseAvgArea, investMethod, investeeEmissions, ownershipPct, investAmount])

  function resetForm() {
    setSupplierName(""); setNotes(""); setSpendAmount(""); setPrimaryTco2e(""); setPrimarySourceOther("")
    setDistance(""); setPassengers("1"); setCommuteDistance(""); setEmployees("")
    setResidentialUnits(""); setOfficeUnits(""); setRetailUnits(""); setCapitalSpend("")
    setC3FuelAmount(""); setC3ElectricityKwh(""); setFreightWeight(""); setFreightDistance("")
    setWasteWeight(""); setLeaseFloorArea(""); setFranchiseStoreCount(""); setFranchiseAvgArea("")
    setInvesteeEmissions(""); setOwnershipPct(""); setInvestAmount(""); setActivityData(""); setActivityUnit("")
    setEmissionFactor(""); setEfSource(""); setTco2e(null); setCalcSteps([])
  }

  async function handleAddLineItem() {
    if (!companyId || tco2e === null) return
    setLoading(true); setError("")

    const projectedTotal = categoryTotal + tco2e
    const relevance: Relevance = classifyRelevance(tco2e, projectedTotal)

    const payload: any = {
      company_id: companyId,
      year,
      category_number: catNum,
      category_name: catInfo?.name || `Category ${catNum}`,
      ghg_amount_tco2e: tco2e,
      supplier_name: supplierName || null,
      data_availability: "available",
      relevance_score: relevance === "high" ? 5 : relevance === "medium" ? 3 : 1,
      notes: notes || null,
    }

    if (tier === "supplier_primary") {
      payload.calculation_method = "supplier_primary"
      payload.subcategory = primarySource === "other" ? (primarySourceOther || "其他") : primarySource
      payload.emission_factor_source = primarySource === "other" ? primarySourceOther : primarySource
    } else if (tier === "spend_based") {
      payload.calculation_method = "spend_based"
      payload.spend_amount_twd = parseFloat(spendAmount)
      payload.subcategory = spendCategory
    } else {
      payload.calculation_method = "activity_based"
      if (catNum === 6) { payload.activity_data = parseFloat(distance); payload.activity_unit = "km"; payload.subcategory = transportType }
      else if (catNum === 7) { payload.activity_data = parseFloat(commuteDistance); payload.activity_unit = "km/人/年"; payload.subcategory = commuteTransport }
      else if (catNum === 11) { payload.activity_data = parseInt(residentialUnits || "0") + parseInt(officeUnits || "0") + parseInt(retailUnits || "0"); payload.activity_unit = "戶/個" }
      else if (catNum === 2) { payload.spend_amount_twd = parseFloat(capitalSpend); payload.subcategory = capitalCategory; payload.calculation_method = "spend_based" }
      else if (catNum === 3) { payload.activity_data = c3Mode === "fuel" ? parseFloat(c3FuelAmount) : parseFloat(c3ElectricityKwh); payload.activity_unit = c3Mode === "fuel" ? "L/m³" : "kWh"; payload.subcategory = c3Mode === "fuel" ? c3FuelType : "electricity_upstream_td" }
      else if (catNum === 4) { payload.activity_data = parseFloat(freightWeight) * parseFloat(freightDistance || "0"); payload.activity_unit = "tonne-km"; payload.subcategory = freightMode }
      else if (catNum === 5) { payload.activity_data = parseFloat(wasteWeight); payload.activity_unit = "ton"; payload.subcategory = wasteType }
      else if (catNum === 13) { payload.activity_data = parseFloat(leaseFloorArea); payload.activity_unit = "m²"; payload.subcategory = leaseBuildingType }
      else if (catNum === 14) { payload.activity_data = parseInt(franchiseStoreCount || "0"); payload.activity_unit = "店"; payload.subcategory = franchiseStoreType }
      else if (catNum === 15) { payload.activity_data = investMethod === "equity_share" ? parseFloat(ownershipPct || "0") : parseFloat(investAmount || "0"); payload.activity_unit = investMethod === "equity_share" ? "% 持股" : "NTD"; payload.subcategory = investMethod; payload.calculation_method = investMethod }
      else { payload.activity_data = parseFloat(activityData); payload.activity_unit = activityUnit; payload.emission_factor = parseFloat(emissionFactor); payload.emission_factor_source = efSource }
    }

    const { error: dbErr } = await supabase.from("scope3_records").insert(payload)
    if (dbErr) { setError(dbErr.message) }
    else {
      setSuccess(true); resetForm(); fetchAll(companyId)
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  async function deleteLineItem(id: string) {
    if (!confirm("確定刪除這筆項目？")) return
    await supabase.from("scope3_records").delete().eq("id", id)
    if (companyId) fetchAll(companyId)
  }

  async function saveNA() {
    if (!companyId || !naReason) return
    setLoading(true); setError("")
    const payload = {
      company_id: companyId, year, category_number: catNum,
      category_name: catInfo?.name || `Category ${catNum}`,
      calculation_method: "not_applicable", data_availability: "not_applicable",
      ghg_amount_tco2e: 0, notes: naReason,
    }
    const { error: dbErr } = naRecord
      ? await supabase.from("scope3_records").update(payload).eq("id", naRecord.id)
      : await supabase.from("scope3_records").insert(payload)
    if (dbErr) setError(dbErr.message)
    else { setSuccess(true); fetchAll(companyId); setTimeout(() => setSuccess(false), 3000) }
    setLoading(false)
  }

  async function cancelNA() {
    if (naRecord) await supabase.from("scope3_records").delete().eq("id", naRecord.id)
    setNaMode(false); setNaReason("")
    if (companyId) fetchAll(companyId)
  }

  if (!catInfo) return <AppLayout title="Category 不存在"><div>找不到此 Category</div></AppLayout>

  const relevanceBadge = (r: Relevance) => {
    const map = { high: ["高度相關", "bg-red-50 text-red-700 border-red-200"], medium: ["中度相關", "bg-amber-50 text-amber-700 border-amber-200"], low: ["低度相關", "bg-gray-50 text-gray-600 border-gray-200"] } as const
    const [label, cls] = map[r]
    return <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>{label}</span>
  }
  const tierBadge = (m: string | null) => {
    const t = m === "supplier_primary" ? "supplier_primary" : m === "spend_based" ? "spend_based" : "activity_based"
    const map: Record<string, [string, string]> = {
      spend_based: ["支出基礎法", "bg-gray-50 text-gray-600 border-gray-200"],
      activity_based: ["實物量基礎法", "bg-blue-50 text-blue-700 border-blue-200"],
      supplier_primary: ["供應商一手數據", "bg-emerald-50 text-emerald-700 border-emerald-200"],
    }
    const [label, cls] = map[t]
    return <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>{label}</span>
  }

  const highRelevanceSpendCount = lineItems.filter(r => {
    const rel = classifyRelevance(r.ghg_amount_tco2e || 0, categoryTotal)
    return rel === "high" && r.calculation_method === "spend_based"
  }).length

  return (
    <AppLayout
      title={`Category ${catNum}：${catInfo.name}`}
      subtitle={`Scope 3 — ${catInfo.relevance === "high" ? "⭐ 高度相關，優先盤查" : catInfo.relevance === "medium" ? "中度相關" : "低度相關"}`}
    >
      <div className="max-w-4xl">
        <GuideCard steps={CATEGORY_GUIDES[catNum] || []} />

        <div className="bg-white border border-border rounded p-4 mb-4 flex items-center justify-between">
          <div>
            <label className="text-xs text-muted-foreground mr-2">年度</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="h-8 px-2 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
              {[2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => naMode ? cancelNA() : setNaMode(true)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${naMode ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-border hover:bg-muted"}`}>
            此類別不適用
          </button>
        </div>

        {naMode ? (
          <div className="bg-white border border-border rounded p-6">
            <label className="block text-sm font-medium mb-2">
              排除理由（必填，符合 GHG Protocol 要求）
              <FieldHint text="GHG Protocol 規定，若某類別不適用於你的營運（例如服務業沒有下游產品配送），仍需明確說明排除原因，不能直接略過不填。" />
            </label>
            <textarea value={naReason} onChange={e => setNaReason(e.target.value)}
              placeholder="請說明此類別不適用的原因，如：信義房屋為純仲介服務業，無下游產品配送活動（Category 9）"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] resize-none" />
            {error && <div className="mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}
            {success && <div className="mt-3 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-700">✓ 已儲存</div>}
            <button onClick={saveNA} disabled={!naReason || loading}
              className="mt-3 flex items-center gap-2 px-4 h-9 bg-[#1B4332] text-white rounded text-sm hover:bg-[#40916C] disabled:opacity-50">
              <Save className="w-4 h-4" />儲存
            </button>
          </div>
        ) : (
          <>
            {/* Ledger of existing line items */}
            <div className="bg-white border border-border rounded mb-4">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-sm" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                  {year} 年已登錄項目
                  <FieldHint text="同一類別可以登錄多筆資料，例如多家供應商、多種交通方式。系統會自動依每筆占類別總排放的比重，標示「高度相關」「中度相關」「低度相關」。" />
                </h3>
                <div className="font-mono text-sm font-semibold text-purple-700">
                  類別總計：{categoryTotal.toFixed(4)} tCO₂e
                </div>
              </div>

              {lineItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">尚無項目，請於下方新增第一筆資料</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left px-4 py-2.5 font-medium">供應商/說明</th>
                      <th className="text-left px-4 py-2.5 font-medium">計算方式</th>
                      <th className="text-left px-4 py-2.5 font-medium">關聯度</th>
                      <th className="text-right px-4 py-2.5 font-medium">排放量（tCO₂e）</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(r => {
                      const rel = classifyRelevance(r.ghg_amount_tco2e || 0, categoryTotal)
                      return (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2.5">{r.supplier_name || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-4 py-2.5">{tierBadge(r.calculation_method)}</td>
                          <td className="px-4 py-2.5">{relevanceBadge(rel)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-medium">{(r.ghg_amount_tco2e || 0).toFixed(4)}</td>
                          <td className="px-4 py-2.5">
                            <button onClick={() => deleteLineItem(r.id)} className="p-1 text-muted-foreground hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {highRelevanceSpendCount > 0 && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    有 {highRelevanceSpendCount} 筆「高度相關」項目目前仍使用支出基礎法估算，精度較低。建議優先向這些供應商取得實物量數據或請其提供一手排放數據，以提升整體盤查精確度。
                  </div>
                </div>
              )}
            </div>

            {/* New line item form */}
            <div className="bg-white border border-border rounded p-6">
              <h2 className="font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>新增一筆項目</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    供應商/廠商名稱
                    <FieldHint text="選填，但建議填寫——填了之後，未來才能追蹤是哪一家供應商貢獻了多少排放，方便做供應商管理與優先溝通。" />
                  </label>
                  <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)}
                    placeholder="例如：OO印刷公司、OO物流（選填）"
                    className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    計算方式
                    <FieldHint text="三種方式可任選，資料愈一手愈精確：支出基礎法只需金額；實物量基礎法需要實際數量/距離/重量等；供應商一手數據則是直接採用供應商提供的實際排放量。" />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["spend_based", "activity_based", "supplier_primary"] as DataTier[]).map(t => (
                      <button key={t} type="button" onClick={() => setTier(t)}
                        className={`text-left p-3 rounded border transition-colors ${tier === t ? "border-[#1B4332] bg-[#1B4332]/5" : "border-border hover:bg-muted"}`}>
                        <div className="text-sm font-medium">{TIER_LABELS[t].label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{TIER_LABELS[t].quality}</div>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 bg-muted rounded px-3 py-2">
                    {TIER_LABELS[tier].desc}
                  </div>
                </div>

                {/* ── Tier: supplier_primary ── */}
                {tier === "supplier_primary" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        供應商提供的排放量（tCO₂e）<span className="text-red-500 ml-1">*</span>
                        <FieldHint text="供應商若有自己的碳盤查報告、CDP 問卷回覆或第三方查證聲明書，通常會直接給你一個總排放量數字（tCO₂e），這裡直接填入該數字即可，不需要再乘任何係數。" />
                      </label>
                      <input type="number" value={primaryTco2e} onChange={e => setPrimaryTco2e(e.target.value)}
                        placeholder="0.0000" min="0" step="0.0001"
                        className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">資料來源</label>
                      <select value={primarySource} onChange={e => setPrimarySource(e.target.value)}
                        className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                        <option value="supplier_report">供應商碳足跡報告</option>
                        <option value="cdp">CDP 問卷回覆</option>
                        <option value="iso14064">供應商 ISO 14064-1 查證聲明書</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                    {primarySource === "other" && (
                      <input type="text" value={primarySourceOther} onChange={e => setPrimarySourceOther(e.target.value)}
                        placeholder="請說明資料來源"
                        className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                    )}
                  </div>
                )}

                {/* ── Tier: spend_based (generic, any category) ── */}
                {tier === "spend_based" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        採購/支出類別
                        <FieldHint text="選擇最接近這筆支出性質的類別，系統會套用對應的產業平均排放係數（EEIO，美國環保署公開資料代理值）。" />
                      </label>
                      <select value={spendCategory} onChange={e => setSpendCategory(e.target.value)}
                        className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                        {Object.entries(EEIO_FACTORS).map(([k, v]) => (
                          <option key={k} value={k}>{v.name_zh}（EEIO 係數：{v.factor} kgCO₂e/USD）</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">採購/支出金額（台幣）<span className="text-red-500 ml-1">*</span></label>
                      <input type="number" value={spendAmount} onChange={e => setSpendAmount(e.target.value)}
                        placeholder="0" min="0"
                        className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                    </div>
                  </div>
                )}

                {/* ── Tier: activity_based — category-specific ── */}
                {tier === "activity_based" && (
                  <div className="space-y-4">
                    {catNum === 6 && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">交通方式</label>
                            <select value={transportType} onChange={e => setTransportType(e.target.value as any)}
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                              <option value="air">航空</option><option value="hsr">高鐵</option><option value="tra">台鐵</option>
                              <option value="car">商務用車</option><option value="taxi">計程車</option>
                            </select>
                          </div>
                          {transportType === "air" && (
                            <div>
                              <label className="block text-sm font-medium mb-1.5">航線類型</label>
                              <select value={flightType} onChange={e => setFlightType(e.target.value as any)}
                                className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                                <option value="domestic">國內線（&lt;500km）</option>
                                <option value="short_haul">短程國際（500-3700km）</option>
                                <option value="long_haul">長程國際（&gt;3700km）</option>
                              </select>
                            </div>
                          )}
                        </div>
                        {transportType === "air" && (
                          <div className="flex gap-2">
                            {(["economy", "business"] as const).map(c => (
                              <button key={c} type="button" onClick={() => setCabinClass(c)}
                                className={`flex-1 py-2 text-sm border rounded ${cabinClass === c ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-border hover:bg-muted"}`}>
                                {c === "economy" ? "經濟艙" : "商務艙"}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">單程距離（km）</label>
                            <input type="number" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">人數</label>
                            <input type="number" value={passengers} onChange={e => setPassengers(e.target.value)} placeholder="1" min="1"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">來回</label>
                            <button type="button" onClick={() => setRoundTrip(!roundTrip)}
                              className={`w-full h-9 px-3 text-sm border rounded ${roundTrip ? "bg-[#1B4332] text-white" : "border-border bg-white"}`}>
                              {roundTrip ? "來回（×2）" : "單程"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {catNum === 7 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">主要通勤方式</label>
                          <select value={commuteTransport} onChange={e => setCommuteTransport(e.target.value)}
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                            <option value="car_gasoline">汽車（汽油）— 0.171 kgCO₂e/km</option>
                            <option value="motorcycle_125cc">機車（125cc）— 0.083 kgCO₂e/km</option>
                            <option value="mrt_hsr">捷運/高鐵 — 0.035 kgCO₂e/km</option>
                            <option value="bus">公車 — 0.089 kgCO₂e/km</option>
                            <option value="electric_scooter">電動機車 — 0.022 kgCO₂e/km</option>
                            <option value="walk_bicycle">步行/腳踏車 — 0</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">單程距離（km）</label>
                            <input type="number" value={commuteDistance} onChange={e => setCommuteDistance(e.target.value)} placeholder="0.0"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">年工作天數</label>
                            <input type="number" value={workdays} onChange={e => setWorkdays(e.target.value)} placeholder="240"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">員工人數</label>
                            <input type="number" value={employees} onChange={e => setEmployees(e.target.value)} placeholder="0"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                          </div>
                        </div>
                      </>
                    )}

                    {catNum === 11 && (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm text-amber-800">
                          ⭐ 此為信義房屋最重要的 Scope 3 類別，計算仲介成交後買方在不動產中使用能源產生的排放。
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">住宅成交戶數</label>
                            <input type="number" value={residentialUnits} onChange={e => setResidentialUnits(e.target.value)} placeholder="0（年均 2,750 kWh/戶）"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">商辦成交個數</label>
                            <input type="number" value={officeUnits} onChange={e => setOfficeUnits(e.target.value)} placeholder="0（年均 45,000 kWh/個）"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">店面成交個數</label>
                            <input type="number" value={retailUnits} onChange={e => setRetailUnits(e.target.value)} placeholder="0（年均 11,500 kWh/個）"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                          </div>
                        </div>
                      </>
                    )}

                    {catNum === 2 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">資本財類別</label>
                          <select value={capitalCategory} onChange={e => setCapitalCategory(e.target.value)}
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                            {Object.entries(EEIO_FACTORS).map(([k, v]) => (
                              <option key={k} value={k}>{v.name_zh}（EEIO 係數：{v.factor} kgCO₂e/USD）</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">採購金額（台幣）<span className="text-red-500 ml-1">*</span></label>
                          <input type="number" value={capitalSpend} onChange={e => setCapitalSpend(e.target.value)} placeholder="0" min="0"
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                        </div>
                      </>
                    )}

                    {catNum === 3 && (
                      <>
                        <div className="flex gap-2">
                          {(["electricity", "fuel"] as const).map(m => (
                            <button key={m} type="button" onClick={() => setC3Mode(m)}
                              className={`flex-1 py-2 text-sm border rounded ${c3Mode === m ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-border hover:bg-muted"}`}>
                              {m === "electricity" ? "外購電力上游＋輸配電損失" : "燃料上游開採運輸(WTT)"}
                            </button>
                          ))}
                        </div>
                        {c3Mode === "fuel" ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1.5">燃料種類</label>
                              <select value={c3FuelType} onChange={e => setC3FuelType(e.target.value as keyof typeof WTT_FUEL_FACTORS)}
                                className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                                {Object.entries(WTT_FUEL_FACTORS).map(([k, v]) => (<option key={k} value={k}>{k}（{v} kgCO₂e/單位）</option>))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1.5">燃料用量（與 Scope1 一致）</label>
                              <input type="number" value={c3FuelAmount} onChange={e => setC3FuelAmount(e.target.value)} placeholder="0"
                                className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium mb-1.5">外購電力用量（kWh，與 Scope2 一致）</label>
                            <input type="number" value={c3ElectricityKwh} onChange={e => setC3ElectricityKwh(e.target.value)} placeholder="0"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                          </div>
                        )}
                      </>
                    )}

                    {catNum === 4 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">運輸方式</label>
                          <select value={freightMode} onChange={e => setFreightMode(e.target.value as keyof typeof FREIGHT_FACTORS)}
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                            <option value="truck">公路貨運（卡車）— 0.107 kgCO₂e/tonne-km</option>
                            <option value="rail">鐵路貨運 — 0.028 kgCO₂e/tonne-km</option>
                            <option value="sea">海運（貨櫃船）— 0.012 kgCO₂e/tonne-km</option>
                            <option value="air">空運貨運 — 0.602 kgCO₂e/tonne-km</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">貨物重量（公噸）</label>
                            <input type="number" value={freightWeight} onChange={e => setFreightWeight(e.target.value)} placeholder="0"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">運輸距離（km）</label>
                            <input type="number" value={freightDistance} onChange={e => setFreightDistance(e.target.value)} placeholder="0"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                          </div>
                        </div>
                      </>
                    )}

                    {catNum === 5 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">處理方式</label>
                          <select value={wasteType} onChange={e => setWasteType(e.target.value as keyof typeof WASTE_FACTORS)}
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                            <option value="incineration">焚化 — 0.53 tCO₂e/ton</option>
                            <option value="landfill">掩埋 — 0.48 tCO₂e/ton</option>
                            <option value="recycling_metal">回收（金屬） — 0.01 tCO₂e/ton</option>
                            <option value="recycling_paper">回收（紙類） — 0.021 tCO₂e/ton</option>
                            <option value="recycling_plastic">回收（塑膠） — 0.029 tCO₂e/ton</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">廢棄物重量（公噸）</label>
                          <input type="number" value={wasteWeight} onChange={e => setWasteWeight(e.target.value)} placeholder="0"
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                        </div>
                      </>
                    )}

                    {catNum === 13 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">建築類型</label>
                          <select value={leaseBuildingType} onChange={e => setLeaseBuildingType(e.target.value as keyof typeof BUILDING_EUI)}
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                            {Object.entries(BUILDING_EUI).map(([k, v]) => (<option key={k} value={k}>{k}（EUI {v} kWh/m²/年）</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">樓地板面積（m²）</label>
                          <input type="number" value={leaseFloorArea} onChange={e => setLeaseFloorArea(e.target.value)} placeholder="0"
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                        </div>
                      </div>
                    )}

                    {catNum === 14 && (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm text-amber-800">
                          ⭐ 對信義房屋以加盟為主的展店模式特別重要。
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">加盟店類型</label>
                          <select value={franchiseStoreType} onChange={e => setFranchiseStoreType(e.target.value as keyof typeof BUILDING_EUI)}
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                            {Object.entries(BUILDING_EUI).map(([k, v]) => (<option key={k} value={k}>{k}（EUI {v} kWh/m²/年）</option>))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">加盟店數</label>
                            <input type="number" value={franchiseStoreCount} onChange={e => setFranchiseStoreCount(e.target.value)} placeholder="0"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">平均每店面積（m²）</label>
                            <input type="number" value={franchiseAvgArea} onChange={e => setFranchiseAvgArea(e.target.value)} placeholder="0"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                          </div>
                        </div>
                      </>
                    )}

                    {catNum === 15 && (
                      <>
                        <div className="flex gap-2">
                          {(["equity_share", "proxy_spend"] as const).map(m => (
                            <button key={m} type="button" onClick={() => setInvestMethod(m)}
                              className={`flex-1 py-2 text-sm border rounded ${investMethod === m ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-border hover:bg-muted"}`}>
                              {m === "equity_share" ? "股權比例法" : "代理支出法"}
                            </button>
                          ))}
                        </div>
                        {investMethod === "equity_share" ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1.5">被投資公司 Scope1+2 排放量（tCO₂e）</label>
                              <input type="number" value={investeeEmissions} onChange={e => setInvesteeEmissions(e.target.value)} placeholder="0"
                                className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1.5">持股比例（%）</label>
                              <input type="number" value={ownershipPct} onChange={e => setOwnershipPct(e.target.value)} placeholder="0"
                                className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium mb-1.5">投資金額（台幣）</label>
                            <input type="number" value={investAmount} onChange={e => setInvestAmount(e.target.value)} placeholder="0"
                              className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                          </div>
                        )}
                      </>
                    )}

                    {!hasBespokeActivityCalc && catNum !== 2 && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-1.5">
                            活動數據
                            <FieldHint text="實際發生的數量，例如重量（公斤/公噸）、數量（件）、距離（公里）等，依此類別最自然的單位填寫。" />
                          </label>
                          <input type="number" value={activityData} onChange={e => setActivityData(e.target.value)} placeholder="數量值"
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">單位</label>
                          <input type="text" value={activityUnit} onChange={e => setActivityUnit(e.target.value)} placeholder="ton / km / 件"
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-1.5">排放係數（kgCO₂e/單位）</label>
                          <input type="number" value={emissionFactor} onChange={e => setEmissionFactor(e.target.value)} placeholder="0.000"
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">係數來源</label>
                          <input type="text" value={efSource} onChange={e => setEfSource(e.target.value)} placeholder="如：IPCC 2006 / 環境部"
                            className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Calc result preview */}
                {tco2e !== null && (
                  <div className="bg-[#F8F7F4] border border-[#E0E0DC] rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">計算結果</div>
                      <button type="button" onClick={() => setShowCalc(!showCalc)} className="text-muted-foreground">
                        {showCalc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="font-mono text-xl font-semibold text-purple-700">{tco2e.toFixed(4)} tCO₂e</div>
                    <div className="mt-1.5">{relevanceBadge(classifyRelevance(tco2e, categoryTotal + tco2e))}</div>
                    {showCalc && calcSteps.length > 0 && (
                      <div className="mt-3 space-y-1 text-xs font-mono text-muted-foreground border-t border-border pt-3">
                        {calcSteps.map((s, i) => <div key={i}>{s}</div>)}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1.5">備注</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="說明計算假設、資料品質、不確定性等"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] resize-none" />
                </div>

                {error && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}
                {success && <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-700">✓ 資料已新增</div>}

                <button onClick={handleAddLineItem} disabled={loading || tco2e === null}
                  className="flex items-center gap-2 px-6 h-9 bg-[#1B4332] text-white rounded text-sm font-medium hover:bg-[#40916C] transition-colors disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {loading ? "新增中…" : "新增這筆項目"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
