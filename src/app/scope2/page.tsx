"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { calculateScope2Emission } from "@/lib/calculations/scope2"
import { GRID_FACTORS, LATEST_GRID_FACTOR } from "@/lib/constants/emissionFactors"
import { Save, Trash2, Info, Upload } from "lucide-react"
import type { Facility, Scope2Record } from "@/types/database"
import { GuideCard, type GuideStep } from "@/components/ui/GuideCard"
import { FieldHint } from "@/components/ui/FieldHint"

const SCOPE2_GUIDE: GuideStep[] = [
  { title: "這個頁面在算什麼", content: "Scope 2 是公司「外購電力」使用所產生的間接排放——也就是公司用電的碳足跡。電本身燃燒時不在你這邊排放，但發電廠燒燃料發電的過程會產生排放，這筆排放算在用電的人身上。" },
  { title: "你需要準備什麼資料", content: "每月或全年的用電度數（kWh），可以直接從電費單取得。若公司有購買綠電或再生能源憑證（REC），也可以填入 REC 度數，系統會額外算出市場基礎法的數字。" },
  { title: "地點基礎法 vs 市場基礎法", content: "地點基礎法用「全國電網平均排放係數」計算，是法規對外揭露採用的主要數字；市場基礎法則會反映你購買綠電的減碳效果（REC 越多，市場基礎法數字越低），兩者系統都會同時算出來供參考。" },
  { title: "逐月填寫還是年度加總都可以", content: "如果手上有每月電費單，逐月填寫可以看到趨勢圖；如果只有年度報告的總用電量，直接填年度加總、月份留空也沒問題，系統會自動判斷並調整顯示方式，不會被誤判為資料缺漏。" },
]

export default function Scope2Page() {
  const supabase = createClient()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [records, setRecords] = useState<Scope2Record[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [year, setYear] = useState(2024)

  // Form
  const [facilityId, setFacilityId] = useState("")
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [kwh, setKwh] = useState("")
  const [recKwh, setRecKwh] = useState("")
  const [billAmount, setBillAmount] = useState("")
  const [invoiceNo, setInvoiceNo] = useState("")
  const [notes, setNotes] = useState("")

  // Calc result
  const calcResult = kwh && parseFloat(kwh) > 0
    ? calculateScope2Emission({ electricity_kwh: parseFloat(kwh), renewable_kwh: parseFloat(recKwh || "0"), year })
    : null

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: comp } = await supabase.from("companies").select("id").eq("owner_id", user.id).single()
      if (!comp) return
      setCompanyId(comp.id)
      const [{ data: facs }, { data: recs }] = await Promise.all([
        supabase.from("facilities").select("*").eq("company_id", comp.id).eq("is_active", true),
        supabase.from("scope2_records").select("*").eq("company_id", comp.id).eq("year", year).order("month"),
      ])
      setFacilities(facs || [])
      setRecords(recs || [])
    }
    init()
  }, [year])

  async function fetchRecords() {
    if (!companyId) return
    const { data } = await supabase.from("scope2_records").select("*").eq("company_id", companyId).eq("year", year).order("month")
    setRecords(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !calcResult) return
    setLoading(true); setError("")

    const { error: dbErr } = await supabase.from("scope2_records").insert({
      company_id: companyId,
      facility_id: facilityId || null,
      year, month,
      electricity_kwh: parseFloat(kwh),
      renewable_kwh: parseFloat(recKwh || "0"),
      grid_emission_factor: calcResult.grid_factor,
      ghg_location_tco2e: calcResult.location_based_tco2e,
      ghg_market_tco2e: calcResult.market_based_tco2e,
      utility_bill_amount: billAmount ? parseFloat(billAmount) : null,
      invoice_number: invoiceNo || null,
      notes: notes || null,
    })

    if (dbErr) { setError(dbErr.message) }
    else {
      setSuccess(true)
      setKwh(""); setRecKwh(""); setBillAmount(""); setInvoiceNo(""); setNotes("")
      fetchRecords()
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  async function deleteRecord(id: string) {
    if (!confirm("確定刪除？")) return
    await supabase.from("scope2_records").delete().eq("id", id)
    fetchRecords()
  }

  const totalKwh = records.reduce((s, r) => s + (r.electricity_kwh || 0), 0)
  const totalTco2e = records.reduce((s, r) => s + (r.ghg_location_tco2e || 0), 0)

  return (
    <AppLayout title="Scope 2 電力間接排放" subtitle="外購電力排放計算">
      <GuideCard steps={SCOPE2_GUIDE} />

      {/* Info bar */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded px-4 py-3 mb-6 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          採用<strong>地點基礎法（Location-based）</strong>計算，市場基礎法同步計算供參考。
          目前使用 <strong>{year} 年電網排放係數：{GRID_FACTORS[year] || LATEST_GRID_FACTOR} kgCO₂e/kWh</strong>
          （經濟部能源署公告）
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Form */}
        <div className="col-span-1">
          <div className="bg-white border border-border rounded p-6">
            <h2 className="font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>新增電費記錄</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">設施</label>
                <select value={facilityId} onChange={e => setFacilityId(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                  <option value="">全公司</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  外購電量（度/kWh）<span className="text-red-500 ml-1">*</span>
                  <FieldHint text="這個月（或全年）的總用電度數，可直接從電費單上的「本期用電量」欄位取得。" />
                </label>
                <input type="number" value={kwh} onChange={e => setKwh(e.target.value)}
                  placeholder="0.0" min="0" step="0.1" required
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  再生能源憑證（REC）電量（kWh）
                  <span className="text-xs text-muted-foreground ml-1">選填，市場基礎法用</span>
                  <FieldHint text="如果公司有購買綠電或憑證（REC），填入這部分的度數，市場基礎法計算時會視為零碳排放，沒有的話留空即可。" />
                </label>
                <input type="number" value={recKwh} onChange={e => setRecKwh(e.target.value)}
                  placeholder="0" min="0" step="0.1"
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
              </div>

              {calcResult && (
                <div className="bg-[#F8F7F4] border border-[#E0E0DC] rounded p-3">
                  <div className="text-xs text-muted-foreground mb-2">計算結果</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">地點基礎法</span>
                      <span className="font-mono text-sm font-semibold text-blue-700">
                        {calcResult.location_based_tco2e.toFixed(4)} tCO₂e
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">市場基礎法</span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {calcResult.market_based_tco2e.toFixed(4)} tCO₂e
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                      係數：{calcResult.grid_factor} kgCO₂e/kWh（{year} 年能源署）
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">電費金額（元）</label>
                  <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">電費單號</label>
                  <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                    placeholder="選填"
                    className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}
              {success && <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-700">✓ 記錄已儲存</div>}

              <button type="submit" disabled={loading || !calcResult}
                className="w-full flex items-center justify-center gap-2 h-9 bg-[#1B4332] text-white rounded text-sm font-medium hover:bg-[#40916C] transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
                {loading ? "儲存中…" : "儲存記錄"}
              </button>
            </form>
          </div>

          {/* Grid factors table */}
          <div className="mt-4 bg-white border border-border rounded p-4">
            <div className="text-sm font-medium mb-3">歷年電網排放係數</div>
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(GRID_FACTORS).reverse().map(([y, f]) => (
                  <tr key={y} className={`border-b border-border last:border-0 ${Number(y) === year ? "bg-[#1B4332]/5" : ""}`}>
                    <td className="py-1.5 text-muted-foreground">{y} 年</td>
                    <td className="py-1.5 text-right font-mono">{f}</td>
                    <td className="py-1.5 text-right text-muted-foreground">kgCO₂e/kWh</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-muted-foreground mt-2">來源：經濟部能源署公告</div>
          </div>
        </div>

        {/* Records table */}
        <div className="col-span-2">
          <div className="bg-white border border-border rounded">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                {year} 年電力排放記錄
              </h3>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:bg-muted">
                  <Upload className="w-3.5 h-3.5" />
                  CSV 批次匯入
                </button>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">尚無記錄</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-medium">月份</th>
                    <th className="text-right px-4 py-2.5 font-medium">用電量（kWh）</th>
                    <th className="text-right px-4 py-2.5 font-medium">排放係數</th>
                    <th className="text-right px-4 py-2.5 font-medium">地點基礎法（tCO₂e）</th>
                    <th className="text-right px-4 py-2.5 font-medium">市場基礎法（tCO₂e）</th>
                    <th className="text-right px-4 py-2.5 font-medium">電費（元）</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5">{r.month ? `${r.month} 月` : "全年加總"}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{(r.electricity_kwh || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{r.grid_emission_factor}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-blue-700">{(r.ghg_location_tco2e || 0).toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{(r.ghg_market_tco2e || 0).toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-right">{r.utility_bill_amount ? r.utility_bill_amount.toLocaleString() : "—"}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => deleteRecord(r.id)} className="p-1 text-muted-foreground hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-medium">
                    <td className="px-4 py-2.5 text-sm">合計</td>
                    <td className="px-4 py-2.5 text-right font-mono">{totalKwh.toLocaleString()}</td>
                    <td />
                    <td className="px-4 py-2.5 text-right font-mono text-blue-700">{totalTco2e.toFixed(4)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
