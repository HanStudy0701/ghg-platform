"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { calculateRefrigerantEmission } from "@/lib/calculations/scope1"
import { REFRIGERANT_GWP, REFRIGERANT_LEAK_RATES } from "@/lib/constants/emissionFactors"
import { ChevronDown, ChevronUp, Save } from "lucide-react"

export default function FugitivePage() {
  const supabase = createClient()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showCalc, setShowCalc] = useState(false)

  const [year, setYear] = useState(2024)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [equipmentType, setEquipmentType] = useState("split_ac")
  const [refrigerantType, setRefrigerantType] = useState("R-410A")
  const [calcMethod, setCalcMethod] = useState<"leak_rate" | "refill_amount">("leak_rate")
  const [chargeKg, setChargeKg] = useState("")
  const [leakRate, setLeakRate] = useState("")
  const [refillKg, setRefillKg] = useState("")
  const [notes, setNotes] = useState("")
  const [calcResult, setCalcResult] = useState<ReturnType<typeof calculateRefrigerantEmission> | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: comp } = await supabase.from("companies").select("id").eq("owner_id", user.id).single()
      if (!comp) return
      setCompanyId(comp.id)
    }
    init()
  }, [])

  // Set default leak rate when equipment type changes
  useEffect(() => {
    const defaultRates: Record<string, number> = {
      window_ac: 5, split_ac: 5, central_ac: 2, commercial_refrigeration: 15, car_ac: 10
    }
    setLeakRate(String(defaultRates[equipmentType] || 5))
  }, [equipmentType])

  useEffect(() => {
    try {
      if (calcMethod === "leak_rate" && chargeKg && leakRate) {
        const result = calculateRefrigerantEmission({
          refrigerantType, method: "leak_rate",
          charge_kg: parseFloat(chargeKg), leak_rate_pct: parseFloat(leakRate)
        })
        setCalcResult(result)
      } else if (calcMethod === "refill_amount" && refillKg) {
        const result = calculateRefrigerantEmission({
          refrigerantType, method: "refill_amount", refill_kg: parseFloat(refillKg)
        })
        setCalcResult(result)
      } else {
        setCalcResult(null)
      }
    } catch { setCalcResult(null) }
  }, [refrigerantType, calcMethod, chargeKg, leakRate, refillKg])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !calcResult) return
    setLoading(true)
    setError("")

    const leakAmountKg = calcMethod === "refill_amount"
      ? parseFloat(refillKg)
      : parseFloat(chargeKg) * parseFloat(leakRate) / 100

    const { error: dbErr } = await supabase.from("scope1_records").insert({
      company_id: companyId,
      year, month,
      emission_category: "fugitive",
      source_type: equipmentType,
      refrigerant_type: refrigerantType,
      consumption_amount: leakAmountKg,
      consumption_unit: "kg",
      co2_factor: null,
      ch4_factor: null,
      n2o_factor: null,
      gwp_ch4: null,
      gwp_n2o: null,
      ghg_amount_tco2e: calcResult.total_tco2e,
      data_quality: "measured",
      notes: `冷媒：${refrigerantType}，GWP=${calcResult.gwp}，逸散量=${leakAmountKg.toFixed(4)}kg${notes ? "，" + notes : ""}`,
    })

    if (dbErr) { setError(dbErr.message) }
    else {
      setSuccess(true)
      setChargeKg(""); setRefillKg(""); setNotes("")
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  return (
    <AppLayout title="Scope 1 — 逸散排放" subtitle="冷媒逸散排放計算">
      <div className="max-w-2xl">
        <div className="bg-white border border-border rounded p-6">
          <h2 className="font-semibold mb-6" style={{ fontFamily: 'Noto Serif TC, serif' }}>新增冷媒逸散記錄</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">年份</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                  {[2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">月份</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                  {Array.from({length:12}, (_,i) => i+1).map(m => <option key={m} value={m}>{m} 月</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">設備類型</label>
                <select value={equipmentType} onChange={e => setEquipmentType(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                  <option value="window_ac">窗型冷氣（逸散率 5%/年）</option>
                  <option value="split_ac">分離式冷氣（逸散率 5%/年）</option>
                  <option value="central_ac">中央空調（逸散率 2%/年）</option>
                  <option value="commercial_refrigeration">商業冷凍設備（逸散率 15%/年）</option>
                  <option value="car_ac">車用冷氣（逸散率 10%/年）</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">冷媒種類</label>
                <select value={refrigerantType} onChange={e => setRefrigerantType(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                  {Object.entries(REFRIGERANT_GWP).map(([key, val]) => (
                    <option key={key} value={key}>{val.name_zh}（GWP={val.gwp}）</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">計算方式</label>
              <div className="flex border border-border rounded overflow-hidden">
                <button type="button" onClick={() => setCalcMethod("leak_rate")}
                  className={`flex-1 py-2 text-sm ${calcMethod === "leak_rate" ? "bg-[#1B4332] text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}>
                  逸散率法（原始填充量）
                </button>
                <button type="button" onClick={() => setCalcMethod("refill_amount")}
                  className={`flex-1 py-2 text-sm ${calcMethod === "refill_amount" ? "bg-[#1B4332] text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}>
                  實測補充量法
                </button>
              </div>
            </div>

            {calcMethod === "leak_rate" ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">原始填充量（kg）<span className="text-red-500 ml-1">*</span></label>
                  <input type="number" value={chargeKg} onChange={e => setChargeKg(e.target.value)}
                    placeholder="0.000" min="0" step="0.001" required
                    className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">逸散率（%/年）</label>
                  <input type="number" value={leakRate} onChange={e => setLeakRate(e.target.value)}
                    placeholder="5" min="0" max="100" step="0.1"
                    className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1.5">實際補充量（kg）<span className="text-red-500 ml-1">*</span></label>
                <div className="flex">
                  <input type="number" value={refillKg} onChange={e => setRefillKg(e.target.value)}
                    placeholder="0.000" min="0" step="0.001" required
                    className="flex-1 h-9 px-3 text-sm border border-border rounded-l bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                  <span className="h-9 px-3 flex items-center bg-muted border border-l-0 border-border rounded-r text-sm text-muted-foreground">kg</span>
                </div>
              </div>
            )}

            {calcResult && (
              <div className="bg-[#F8F7F4] border border-[#E0E0DC] rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">排放量計算結果</div>
                  <button type="button" onClick={() => setShowCalc(!showCalc)} className="text-muted-foreground">
                    {showCalc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                <div className="font-mono text-xl font-semibold text-[#1B4332]">
                  {calcResult.total_tco2e.toFixed(6)} tCO₂e
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  冷媒逸散：{calcResult.leak_kg.toFixed(4)} kg × GWP {calcResult.gwp}
                </div>
                {showCalc && (
                  <div className="mt-3 space-y-1 text-xs font-mono text-muted-foreground border-t border-border pt-3">
                    {calcResult.calculation_steps.map((step, i) => <div key={i}>{step}</div>)}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">備注（選填）</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="設備位置、服務紀錄單號等"
                className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-700">✓ 記錄已儲存</div>}

            <button type="submit" disabled={loading || !calcResult}
              className="flex items-center gap-2 px-6 h-9 bg-[#1B4332] text-white rounded text-sm font-medium hover:bg-[#40916C] transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />
              {loading ? "儲存中…" : "儲存記錄"}
            </button>
          </form>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded px-4 py-3 text-sm text-amber-800">
          <strong>係數來源：</strong>環境部 113 年 2 月 5 日公告（IPCC AR5 GWP）。
          逸散率依據 IPCC 2006 Guidelines Vol.3 Ch.7 Table 7.9。
        </div>
      </div>
    </AppLayout>
  )
}
