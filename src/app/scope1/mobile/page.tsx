"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { calculateFuelEmission } from "@/lib/calculations/scope1"
import { FUEL_FACTORS } from "@/lib/constants/emissionFactors"
import { ChevronDown, ChevronUp, Save } from "lucide-react"
import type { Facility } from "@/types/database"

export default function MobilePage() {
  const supabase = createClient()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showCalc, setShowCalc] = useState(false)

  const [vehicleName, setVehicleName] = useState("")
  const [vehicleType, setVehicleType] = useState("gasoline_car")
  const [calcMethod, setCalcMethod] = useState<"fuel" | "distance">("fuel")
  const [year, setYear] = useState(2024)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [fuelAmount, setFuelAmount] = useState("")
  const [distance, setDistance] = useState("")
  const [fuelRate, setFuelRate] = useState("10") // L/100km
  const [notes, setNotes] = useState("")
  const [calcResult, setCalcResult] = useState<ReturnType<typeof calculateFuelEmission> | null>(null)

  const vehicleTypeMap: Record<string, { fuel: string; defaultRate: string }> = {
    gasoline_car: { fuel: "gasoline", defaultRate: "10" },
    diesel_truck: { fuel: "diesel", defaultRate: "15" },
    lpg_vehicle: { fuel: "lpg", defaultRate: "12" },
    motorcycle: { fuel: "gasoline", defaultRate: "3" },
  }

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

  useEffect(() => {
    const fuelType = vehicleTypeMap[vehicleType]?.fuel || "gasoline"
    let liters = 0

    if (calcMethod === "fuel" && fuelAmount && parseFloat(fuelAmount) > 0) {
      liters = parseFloat(fuelAmount)
    } else if (calcMethod === "distance" && distance && fuelRate && parseFloat(distance) > 0) {
      liters = parseFloat(distance) * parseFloat(fuelRate) / 100
    }

    if (liters > 0) {
      try {
        const result = calculateFuelEmission({ fuelType, amount: liters, unit: "L", emissionCategory: "mobile" })
        setCalcResult(result)
      } catch { setCalcResult(null) }
    } else {
      setCalcResult(null)
    }
  }, [vehicleType, calcMethod, fuelAmount, distance, fuelRate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !calcResult) return
    setLoading(true)
    setError("")

    const fuelType = vehicleTypeMap[vehicleType]?.fuel || "gasoline"
    let actualFuel = 0
    if (calcMethod === "fuel") {
      actualFuel = parseFloat(fuelAmount)
    } else {
      actualFuel = parseFloat(distance) * parseFloat(fuelRate) / 100
    }

    const { error: dbErr } = await supabase.from("scope1_records").insert({
      company_id: companyId,
      year,
      month,
      emission_category: "mobile",
      source_type: vehicleName || vehicleType,
      fuel_type: fuelType,
      consumption_amount: actualFuel,
      consumption_unit: "L",
      co2_factor: calcResult.co2_factor,
      ch4_factor: calcResult.ch4_factor,
      n2o_factor: calcResult.n2o_factor,
      gwp_ch4: 28,
      gwp_n2o: 265,
      ghg_amount_tco2e: calcResult.total_tco2e,
      data_quality: "measured",
      notes: notes || null,
    })

    if (dbErr) { setError(dbErr.message) }
    else {
      setSuccess(true)
      setFuelAmount(""); setDistance(""); setVehicleName(""); setNotes("")
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  return (
    <AppLayout title="Scope 1 — 移動燃燒" subtitle="公務車輛油耗排放">
      <div className="max-w-2xl">
        <div className="bg-white border border-border rounded p-6">
          <h2 className="font-semibold mb-6" style={{ fontFamily: 'Noto Serif TC, serif' }}>新增移動燃燒記錄</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">車輛編號/名稱</label>
                <input type="text" value={vehicleName} onChange={e => setVehicleName(e.target.value)}
                  placeholder="如：ABC-1234"
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">車型</label>
                <select value={vehicleType} onChange={e => {
                  setVehicleType(e.target.value)
                  setFuelRate(vehicleTypeMap[e.target.value]?.defaultRate || "10")
                }}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                  <option value="gasoline_car">汽油轎車（有觸媒）</option>
                  <option value="diesel_truck">柴油貨車</option>
                  <option value="lpg_vehicle">LPG 車輛</option>
                  <option value="motorcycle">機車</option>
                </select>
              </div>
            </div>

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

            {/* Calc method */}
            <div>
              <label className="block text-sm font-medium mb-1.5">計算方式</label>
              <div className="flex border border-border rounded overflow-hidden">
                <button type="button" onClick={() => setCalcMethod("fuel")}
                  className={`flex-1 py-2 text-sm ${calcMethod === "fuel" ? "bg-[#1B4332] text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}>
                  油耗法（加油量）
                </button>
                <button type="button" onClick={() => setCalcMethod("distance")}
                  className={`flex-1 py-2 text-sm ${calcMethod === "distance" ? "bg-[#1B4332] text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}>
                  里程法（行駛距離）
                </button>
              </div>
            </div>

            {calcMethod === "fuel" ? (
              <div>
                <label className="block text-sm font-medium mb-1.5">加油量（公升）<span className="text-red-500 ml-1">*</span></label>
                <div className="flex">
                  <input type="number" value={fuelAmount} onChange={e => setFuelAmount(e.target.value)}
                    placeholder="0.000" min="0" step="0.001" required
                    className="flex-1 h-9 px-3 text-sm border border-border rounded-l bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                  <span className="h-9 px-3 flex items-center bg-muted border border-l-0 border-border rounded-r text-sm text-muted-foreground">公升</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">行駛里程（km）<span className="text-red-500 ml-1">*</span></label>
                  <input type="number" value={distance} onChange={e => setDistance(e.target.value)}
                    placeholder="0" min="0" step="1" required
                    className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">油耗率（L/100km）</label>
                  <input type="number" value={fuelRate} onChange={e => setFuelRate(e.target.value)}
                    placeholder="10" min="0" step="0.1"
                    className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
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
                {calcMethod === "distance" && (
                  <div className="text-xs text-muted-foreground mt-1">
                    折算用油：{(parseFloat(distance || "0") * parseFloat(fuelRate || "10") / 100).toFixed(3)} 公升
                  </div>
                )}
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
                placeholder="說明或備注"
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
      </div>
    </AppLayout>
  )
}
