"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { SCOPE3_CATEGORIES } from "@/lib/constants/emissionFactors"
import { CheckCircle, Clock, AlertCircle, MinusCircle } from "lucide-react"
import Link from "next/link"
import { GuideCard, type GuideStep } from "@/components/ui/GuideCard"
import { FieldHint } from "@/components/ui/FieldHint"

interface CategoryStatus {
  category_number: number
  ghg_total: number
  record_count: number
}

const RELEVANCE_LABELS: Record<string, string> = {
  high: "高度相關",
  medium: "中度相關",
  low: "低度相關",
}
const RELEVANCE_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-600",
}

const SCOPE3_OVERVIEW_GUIDE: GuideStep[] = [
  { title: "這個頁面在算什麼", content: "Scope 3 是公司「價值鏈」上下游所產生的間接排放，例如員工通勤、商務旅行、採購商品、產品使用後的排放等，依 GHG Protocol 共分 15 個類別。這通常是企業排放佔比最大、但最難盤查的部分。" },
  { title: "不用每個類別都從頭開始", content: "並不是所有類別都適用每家公司。系統已先依信義房屋的業務性質標記每個類別的「相關性」（高/中/低），不適用的類別可以直接標記「不適用」並附上理由，不需要硬填數字。" },
  { title: "先做高相關性的類別", content: "建議優先填寫標示「高度相關」的類別（對信義房屋而言是 Category 11 使用銷售產品、Category 6 商務旅行、Category 7 員工通勤），這些通常佔 Scope 3 排放量的大宗，能用最少力氣涵蓋最多排放量。" },
  { title: "每個類別可以填很多筆資料", content: "點進任一類別後，可以依不同供應商、不同採購項目分別新增多筆記錄（例如 Category 1 採購商品可以一個供應商一筆），系統會自動加總，也支援自訂的活動數據與排放係數，不限於系統內建的選項。" },
]

export default function Scope3Page() {
  const supabase = createClient()
  const [year, setYear] = useState(2024)
  const [statuses, setStatuses] = useState<CategoryStatus[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: comp } = await supabase.from("companies").select("id").eq("owner_id", user.id).single()
      if (!comp) return
      setCompanyId(comp.id)

      const { data: records } = await supabase.from("scope3_records")
        .select("category_number, ghg_amount_tco2e")
        .eq("company_id", comp.id)
        .eq("year", year)

      const grouped: Record<number, CategoryStatus> = {}
      ;(records || []).forEach(r => {
        const cat = r.category_number || 0
        if (!grouped[cat]) grouped[cat] = { category_number: cat, ghg_total: 0, record_count: 0 }
        grouped[cat].ghg_total += r.ghg_amount_tco2e || 0
        grouped[cat].record_count += 1
      })
      setStatuses(Object.values(grouped))
      setLoading(false)
    }
    load()
  }, [year])

  const totalScope3 = statuses.reduce((s, c) => s + c.ghg_total, 0)
  const completedCount = statuses.filter(s => s.record_count > 0).length
  const applicableCategories = SCOPE3_CATEGORIES.filter(c => c.applicable)

  const getCategoryStatus = (catNum: number, applicable: boolean) => {
    if (!applicable) return "na"
    const s = statuses.find(s => s.category_number === catNum)
    if (!s || s.record_count === 0) return "pending"
    return "completed"
  }

  return (
    <AppLayout title="Scope 3 其他間接排放" subtitle="價值鏈排放 — 15 個類別">
      <GuideCard steps={SCOPE3_OVERVIEW_GUIDE} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">年度</span>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="h-8 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
            {[2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y} 年</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-border rounded p-5">
          <div className="text-sm text-muted-foreground mb-1">Scope 3 合計</div>
          <div className="font-mono text-2xl font-semibold text-purple-700">{totalScope3.toFixed(4)}</div>
          <div className="text-xs text-muted-foreground">tCO₂e</div>
        </div>
        <div className="bg-white border border-border rounded p-5">
          <div className="text-sm text-muted-foreground mb-1">已完成 Categories</div>
          <div className="font-mono text-2xl font-semibold text-foreground">{completedCount} / {applicableCategories.length}</div>
          <div className="text-xs text-muted-foreground">適用類別</div>
        </div>
        <div className="bg-white border border-border rounded p-5 col-span-2">
          <div className="text-sm font-medium mb-2">盤查進度</div>
          <div className="h-2 bg-muted rounded overflow-hidden mb-1">
            <div className="h-full bg-purple-600 rounded transition-all"
              style={{ width: `${applicableCategories.length > 0 ? (completedCount / applicableCategories.length) * 100 : 0}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">
            {completedCount} 個已完成，{applicableCategories.length - completedCount} 個待填寫
          </div>
        </div>
      </div>

      {/* Scope 3 importance note */}
      <div className="bg-amber-50 border border-amber-200 rounded px-4 py-3 mb-6 text-sm text-amber-800">
        <strong>重要性提醒：</strong>依 GHG Protocol，任何超過 Scope 3 總量 5% 的類別都應盤查。
        信義房屋最重要的類別為 <strong>Category 11（使用銷售產品排放）</strong>，其次為 Category 6（商務旅行）、Category 7（員工通勤）。
        <FieldHint text="右上角的「高度相關／中度相關／低度相關」標籤就是依這個重要性原則標記的，建議按優先順序填寫。" />
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-3 gap-4">
        {SCOPE3_CATEGORIES.map(cat => {
          const status = getCategoryStatus(cat.number, cat.applicable)
          const s = statuses.find(s => s.category_number === cat.number)

          return (
            <div key={cat.number} className={`bg-white border rounded p-4 ${
              cat.relevance === "high" ? "border-purple-200 bg-purple-50/30" : "border-border"
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">Cat. {cat.number}</span>
                  {status === "completed" && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {status === "pending" && cat.applicable && <Clock className="w-4 h-4 text-yellow-500" />}
                  {status === "na" && <MinusCircle className="w-4 h-4 text-muted-foreground" />}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${RELEVANCE_COLORS[cat.relevance]}`}>
                  {RELEVANCE_LABELS[cat.relevance]}
                </span>
              </div>

              <div className="text-sm font-medium mb-2">{cat.name}</div>

              {s && s.ghg_total > 0 ? (
                <div className="font-mono text-sm font-semibold text-purple-700 mb-2">
                  {s.ghg_total.toFixed(4)} tCO₂e
                </div>
              ) : status === "na" ? (
                <div className="text-xs text-muted-foreground mb-2">不適用</div>
              ) : (
                <div className="text-xs text-muted-foreground mb-2">尚未填寫</div>
              )}

              {cat.applicable && (
                <Link
                  href={`/scope3/category/${cat.number}`}
                  className={`block w-full text-center text-xs py-1.5 rounded transition-colors ${
                    status === "completed"
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-[#1B4332] text-white hover:bg-[#40916C]"
                  }`}
                >
                  {status === "completed" ? "查看/編輯" : "填寫資料"}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
