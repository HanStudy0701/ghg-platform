"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { calculateFuelEmission } from "@/lib/calculations/scope1"
import { FUEL_FACTORS } from "@/lib/constants/emissionFactors"
import { ChevronDown, ChevronUp, Save, AlertCircle } from "lucide-react"
import type { Facility } from "@/types/database"

export default function StationaryPage() {
  const supabase = createClient()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showCalc, setShowCalc] = useState(false)

  // Form state
  const [facilityId, setFacilityId] = useState("")
  const [year, setYear] = useState(2024)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [equipmentType, setEquipmentType] = useState("generator")
  const [fuelType, setFuelType] = useState("diesel")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [docRef, setDocRef] = useState("")
  const [calcResult, setCalcResult] = useState<ReturnType<typeof calculateFuelEmission> | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: comp } = await supabase.from("companies").select("id").eq("owner_id", user.id).single()
      if (!comp) return
      setCompanyId(comp.id)
      const { data: facs } = await supabase.from("facilities").select("*").eq("company_id", comp.id).eq("is_active", true)
      setFacilities(facs || [])
    }
    init()
  }, [])

  // Auto-calculate when inputs change
  useEffect(() => {
    if (fuelType && amount && parseFloat(amount) > 0) {
      try {
        const result = calculateFuelEmission({
          fuelType,
          amount: parseFloat(amount),
          unit: FUEL_FACTORS[fuelType]?.unit || "L",
          emissionCategory: "stationary",
        })
        setCalcResult(result)
      } catch {
        setCalcResult(null)
      }
    } else {
      setCalcResult(null)
    }
  }, [fuelType, amount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !calcResult) return
    setLoading(true)
    setError("")

    const fuelData = FUEL_FACTORS[fuelType]
    const { error: dbErr } = await supabase.from("scope1_records").insert({
      company_id: companyId,
      facility_id: facilityId || null,
      year,
      month,
      emission_category: "stationary",
      source_type: equipmentType,
      fuel_type: fuelType,
      consumption_amount: parseFloat(amount),
      consumption_unit: fuelData?.unit || "L",
      co2_factor: calcResult.co2_factor,
      ch4_factor: calcResult.ch4_factor,
      n2o_factor: calcResult.n2o_factor,
      gwp_ch4: 28,
      gwp_n2o: 265,
      ghg_amount_tco2e: calcResult.total_tco2e,
      data_quality: "measured",
      notes: notes || null,
      data_source_doc: docRef || null,
    })

    if (dbErr) {
      setError(dbErr.message)
    } else {
      setSuccess(true)
      setAmount("")
      setNotes("")
      setDocRef("")
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  const fuelOptions = Object.entries(FUEL_FACTORS).map(([key, val]) => ({
    value: key,
    label: val.name_zh,
    unit: val.unit,
  }))

  return (
    <AppLayout title="Scope 1 — 固定燃燒" subtitle="發電機、鍋爐及其他固定燃燒設備">
      <div className="max-w-2xl">
        <div className="bg-white border border-border rounded p-6">
          <h2 className="font-semibold mb-6" style={{ fontFamily: 'Noto Serif TC, serif' }}>新增固定燃燒記錄</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Facility & time */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1.5">設施</label>
                <select value={facilityId} onChange={e => setFacilityId(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                  <option value="">全公司</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
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

            {/* Equipment & fuel */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">設備類型</label>
                <select value={equipmentType} onChange={e => setEquipmentType(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                  <option value="generator">柴油發電機</option>
                  <option value="boiler">鍋爐</option>
                  <option value="heater">加熱設備</option>
                  <option value="other_stationary">其他固定設備</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">燃料種類</label>
                <select value={fuelType} onChange={e => setFuelType(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                  {fuelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Consumption */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                燃料用量（{FUEL_FACTORS[fuelType]?.unit || "L"}）
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.000"
                  min="0"
                  step="0.001"
                  required
                  className="flex-1 h-9 px-3 text-sm border border-border rounded-l bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono"
                />
                <span className="h-9 px-3 flex items-center bg-muted border border-l-0 border-border rounded-r text-sm text-muted-foreground">
                  {FUEL_FACTORS[fuelType]?.unit || "L"}
                </span>
              </div>
            </div>

            {/* Real-time calc result */}
            {calcResult && (
              <div className="bg-[#F8F7F4] border border-[#E0E0DC] rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">排放量計算結果</div>
                  <button type="button" onClick={() => setShowCalc(!showCalc)}
                    className="text-muted-foreground hover:text-foreground">
                    {showCalc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                <div className="font-mono text-xl font-semibold text-[#1B4332]">
                  {calcResult.total_tco2e.toFixed(6)} tCO₂e
                </div>
                {showCalc && (
                  <div className="mt-3 space-y-1 text-xs font-mono text-muted-foreground border-t border-border pt-3">
                    {calcResult.calculation_steps.map((step, i) => (
                      <div key={i}>{step}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Doc ref & notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">單據號碼（選填）</label>
                <input type="text" value={docRef} onChange={e => setDocRef(e.target.value)}
                  placeholder="如：INV-2024-001"
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">備注（選填）</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="說明或備注"
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-700">
                ✓ 記錄已儲存
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !calcResult}
                className="flex items-center gap-2 px-6 h-9 bg-[#1B4332] text-white rounded text-sm font-medium hover:bg-[#40916C] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? "儲存中…" : "儲存記錄"}
              </button>
            </div>
          </form>
        </div>

        {/* Info box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded px-4 py-3 text-sm text-blue-800">
          <strong>係數來源：</strong>環境部 113 年 2 月 5 日公告「溫室氣體排放係數」附表一。
          GWP 採用 IPCC AR6（CH₄ = 28, N₂O = 265）。
        </div>
      </div>
    </AppLayout>
  )
}
