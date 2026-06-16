"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { Flame, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { Scope1Record } from "@/types/database"
import { GuideCard, type GuideStep } from "@/components/ui/GuideCard"
import { FieldHint } from "@/components/ui/FieldHint"

const CATEGORY_LABELS: Record<string, string> = {
  stationary: "固定燃燒",
  mobile: "移動燃燒",
  fugitive: "逸散排放",
}
const MONTH_NAMES = ["一","二","三","四","五","六","七","八","九","十","十一","十二"]

const SCOPE1_GUIDE: GuideStep[] = [
  { title: "這個頁面在算什麼", content: "Scope 1 是公司「自己直接」燃燒燃料或排放氣體產生的排放，分三種：固定燃燒（鍋爐、發電機等固定設備燒燃料）、移動燃燒（公司自有車輛燒油）、逸散排放（冷媒、滅火器等氣體洩漏）。" },
  { title: "你需要準備什麼資料", content: "各類燃料或冷媒的使用量，例如柴油公升數、天然氣立方公尺、冷媒公斤數。通常可以從加油記錄、燃料採購發票、設備保養紀錄取得。" },
  { title: "怎麼開始填寫", content: "點選上方「+ 新增固定燃燒」「+ 新增移動燃燒」「+ 新增逸散排放」，依公司實際情況分別填入用量，系統會自動套用環境部公告係數計算排放量，不需要自己換算。" },
  { title: "逐月填寫還是年度加總都可以", content: "如果有每月的數據（如每月加油量），逐月填寫可以看到趨勢圖；如果只有年度報告的總數，直接填年度加總也沒問題，系統會自動判斷並調整顯示方式。" },
]

export default function Scope1Page() {
  const supabase = createClient()
  const [records, setRecords] = useState<Scope1Record[]>([])
  const [year, setYear] = useState(2024)
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    fetchRecords()
  }, [year])

  async function fetchRecords() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: comp } = await supabase.from("companies").select("id").eq("owner_id", user.id).single()
    if (!comp) return
    setCompanyId(comp.id)

    const { data } = await supabase.from("scope1_records")
      .select("*, facilities(name)")
      .eq("company_id", comp.id)
      .eq("year", year)
      .order("month", { ascending: true })

    setRecords(data || [])
    setLoading(false)
  }

  async function deleteRecord(id: string) {
    if (!confirm("確定刪除此筆記錄？")) return
    await supabase.from("scope1_records").delete().eq("id", id)
    fetchRecords()
  }

  const total = records.reduce((sum, r) => sum + (r.ghg_amount_tco2e || 0), 0)

  const byCategory = [
    { name: "固定燃燒", value: records.filter(r => r.emission_category === "stationary").reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0), color: "#F97316" },
    { name: "移動燃燒", value: records.filter(r => r.emission_category === "mobile").reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0), color: "#EF4444" },
    { name: "逸散排放", value: records.filter(r => r.emission_category === "fugitive").reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0), color: "#F59E0B" },
  ].filter(d => d.value > 0)

  return (
    <AppLayout title="Scope 1 直接排放" subtitle="固定燃燒、移動燃燒、逸散排放">
      <GuideCard steps={SCOPE1_GUIDE} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">年度</span>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="h-8 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
            {[2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y} 年</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Link href="/scope1/stationary" className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded hover:bg-muted">
            + 新增固定燃燒
          </Link>
          <Link href="/scope1/mobile" className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded hover:bg-muted">
            + 新增移動燃燒
          </Link>
          <Link href="/scope1/fugitive" className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#1B4332] text-white rounded hover:bg-[#40916C]">
            + 新增逸散排放
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-border rounded p-5 col-span-1">
          <div className="text-sm text-muted-foreground mb-1">Scope 1 合計</div>
          <div className="font-mono text-2xl font-semibold text-orange-700">{total.toFixed(4)}</div>
          <div className="text-xs text-muted-foreground">tCO₂e</div>
        </div>
        {["stationary", "mobile", "fugitive"].map(cat => {
          const catTotal = records.filter(r => r.emission_category === cat).reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0)
          return (
            <div key={cat} className="bg-white border border-border rounded p-5">
              <div className="text-sm text-muted-foreground mb-1">{CATEGORY_LABELS[cat]}</div>
              <div className="font-mono text-xl font-semibold text-foreground">{catTotal.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">tCO₂e</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2">
          {/* Records table */}
          <div className="bg-white border border-border rounded">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-sm" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                排放記錄
                <FieldHint text="這裡列出所有已輸入的固定燃燒、移動燃燒、逸散排放記錄。若某筆是以「年度加總」方式輸入（沒有拆分到月），月份欄會顯示「—」，這是正常的，不代表資料缺漏。" />
              </h3>
            </div>
            {loading ? (
              <div className="p-12 text-center text-muted-foreground text-sm">載入中…</div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center">
                <Flame className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">尚無 {year} 年排放記錄</p>
                <Link href="/scope1/stationary" className="text-sm text-[#40916C] hover:underline mt-2 block">
                  新增第一筆資料 →
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs">月份</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs">類別</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs">排放源</th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs">用量</th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs">排放量(tCO₂e)</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5">{r.month ? `${r.month} 月` : "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          r.emission_category === "stationary" ? "bg-orange-100 text-orange-800" :
                          r.emission_category === "mobile" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {CATEGORY_LABELS[r.emission_category] || r.emission_category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.source_type}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{r.consumption_amount?.toFixed(2)} {r.consumption_unit}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium">{(r.ghg_amount_tco2e || 0).toFixed(4)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => deleteRecord(r.id)}
                            className="p-1 text-muted-foreground hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="px-4 py-2.5 text-sm font-medium text-right">合計</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-orange-700">{total.toFixed(4)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-white border border-border rounded p-6">
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>各類別佔比</h3>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v.toFixed(4)} tCO₂e`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">無資料</div>
          )}
          <div className="border-t border-border pt-4 mt-2 space-y-1">
            <div className="text-xs text-muted-foreground">係數來源</div>
            <div className="text-xs">環境部 113 年 2 月 5 日公告</div>
            <div className="text-xs text-muted-foreground mt-1">GWP：IPCC AR6（CH₄=28, N₂O=265）</div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
