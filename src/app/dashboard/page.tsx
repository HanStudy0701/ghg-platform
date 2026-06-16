"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { KPICard } from "@/components/dashboard/KPICard"
import { createClient } from "@/lib/supabase/client"
import { Flame, Zap, Globe, Activity, AlertCircle, Plus, FileDown } from "lucide-react"
import Link from "next/link"
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import { SCOPE3_CATEGORIES } from "@/lib/constants/emissionFactors"

interface SummaryData {
  scope1_total: number
  scope2_total: number
  scope3_total: number
  monthly_scope1: { month: number; total: number }[]
  monthly_scope2: { month: number; total: number }[]
  scope3_by_category: { category: number; name: string; total: number }[]
  scope1_by_category: { category: string; total: number }[]
  scope3_completed: number
  hasMonthlyScope1: boolean
  hasMonthlyScope2: boolean
}

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"]

export default function DashboardPage() {
  const supabase = createClient()
  const [year, setYear] = useState(2024)
  const [company, setCompany] = useState<{ name: string; reporting_year: number } | null>(null)
  const [data, setData] = useState<SummaryData>({
    scope1_total: 0,
    scope2_total: 0,
    scope3_total: 0,
    monthly_scope1: [],
    monthly_scope2: [],
    scope3_by_category: [],
    scope1_by_category: [],
    scope3_completed: 0,
    hasMonthlyScope1: false,
    hasMonthlyScope2: false,
  })
  const [loading, setLoading] = useState(true)
  const [missingMonths, setMissingMonths] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [year])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get company
    const { data: comp } = await supabase.from("companies")
      .select("id, name, reporting_year")
      .eq("owner_id", user.id)
      .single()

    if (!comp) { setLoading(false); return }
    setCompany(comp)

    const companyId = comp.id

    // Scope 1
    const { data: s1 } = await supabase.from("scope1_records")
      .select("emission_category, ghg_amount_tco2e, month")
      .eq("company_id", companyId)
      .eq("year", year)

    const scope1_total = (s1 || []).reduce((sum, r) => sum + (r.ghg_amount_tco2e || 0), 0)

    // Monthly scope1 (only meaningful if records actually carry a month value;
    // annual-aggregate imports have month = null and shouldn't render as "all zero")
    const hasMonthlyScope1 = (s1 || []).some(r => r.month !== null && r.month !== undefined)
    const monthly_scope1 = MONTH_NAMES.map((_, i) => ({
      month: i + 1,
      total: (s1 || []).filter(r => r.month === i + 1).reduce((sum, r) => sum + (r.ghg_amount_tco2e || 0), 0)
    }))

    // Scope1 by category
    const catMap: Record<string, number> = {}
    ;(s1 || []).forEach(r => {
      const cat = r.emission_category
      catMap[cat] = (catMap[cat] || 0) + (r.ghg_amount_tco2e || 0)
    })
    const scope1_by_category = [
      { category: "固定燃燒", total: catMap["stationary"] || 0 },
      { category: "移動燃燒", total: catMap["mobile"] || 0 },
      { category: "逸散排放", total: catMap["fugitive"] || 0 },
    ]

    // Scope 2
    const { data: s2 } = await supabase.from("scope2_records")
      .select("ghg_location_tco2e, month")
      .eq("company_id", companyId)
      .eq("year", year)

    const scope2_total = (s2 || []).reduce((sum, r) => sum + (r.ghg_location_tco2e || 0), 0)
    const hasMonthlyScope2 = (s2 || []).some(r => r.month !== null && r.month !== undefined)
    const monthly_scope2 = MONTH_NAMES.map((_, i) => ({
      month: i + 1,
      total: (s2 || []).filter(r => r.month === i + 1).reduce((sum, r) => sum + (r.ghg_location_tco2e || 0), 0)
    }))

    // Missing months (Scope 2) — only applicable when this year is actually
    // tracked at monthly granularity. If the year was imported as a single
    // annual total (month = null), there's nothing "missing": the full-year
    // figure is already recorded, so don't show a false alert.
    let missing: string[] = []
    if (hasMonthlyScope2) {
      const s2Months = (s2 || []).map(r => r.month)
      for (let m = 1; m <= 12; m++) {
        if (!s2Months.includes(m)) missing.push(`${m} 月電費單`)
      }
    }
    setMissingMonths(missing.slice(0, 3))

    // Scope 3
    const { data: s3 } = await supabase.from("scope3_records")
      .select("category_number, category_name, ghg_amount_tco2e")
      .eq("company_id", companyId)
      .eq("year", year)

    const scope3_total = (s3 || []).reduce((sum, r) => sum + (r.ghg_amount_tco2e || 0), 0)
    const scope3_completed = new Set((s3 || []).map(r => r.category_number)).size

    setData({
      scope1_total,
      scope2_total,
      scope3_total,
      monthly_scope1,
      monthly_scope2,
      scope3_by_category: (s3 || []),
      scope1_by_category,
      scope3_completed,
      hasMonthlyScope1,
      hasMonthlyScope2,
    })
    setLoading(false)
  }

  const totalEmission = data.scope1_total + data.scope2_total + data.scope3_total

  const monthlyData = MONTH_NAMES.map((name, i) => ({
    name,
    scope1: data.monthly_scope1[i]?.total || 0,
    scope2: data.monthly_scope2[i]?.total || 0,
  }))

  const pieData = [
    { name: "Scope 1 直接排放", value: data.scope1_total, color: "#F97316" },
    { name: "Scope 2 電力排放", value: data.scope2_total, color: "#3B82F6" },
    { name: "Scope 3 其他排放", value: data.scope3_total, color: "#8B5CF6" },
  ].filter(d => d.value > 0)

  return (
    <AppLayout
      title="排放總覽儀表板"
      subtitle={`${company?.name || ""} · ${year} 年度溫室氣體盤查`}
    >
      {/* Year selector & actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">盤查年度</span>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="h-8 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
          >
            {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
              <option key={y} value={y}>{y} 年</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Link
            href="/scope2"
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增排放資料
          </Link>
          <Link
            href="/report"
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#1B4332] text-white rounded hover:bg-[#40916C] transition-colors"
          >
            <FileDown className="w-4 h-4" />
            下載年度報告
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Scope 1 直接排放"
          value={data.scope1_total}
          colorClass="text-orange-700"
          icon={<Flame className="w-4 h-4" />}
          subtitle="固定燃燒 + 移動燃燒 + 逸散"
        />
        <KPICard
          title="Scope 2 能源間接排放"
          value={data.scope2_total}
          colorClass="text-blue-700"
          icon={<Zap className="w-4 h-4" />}
          subtitle="外購電力（地點基礎法）"
        />
        <KPICard
          title="Scope 3 其他間接排放"
          value={data.scope3_total}
          colorClass="text-purple-700"
          icon={<Globe className="w-4 h-4" />}
          subtitle={`${data.scope3_completed}/15 Categories 已完成`}
        />
        <KPICard
          title="合計排放量"
          value={totalEmission}
          colorClass="text-[#1B4332]"
          icon={<Activity className="w-4 h-4" />}
          subtitle="Scope 1 + 2 + 3 總計"
        />
      </div>

      {/* Alerts */}
      {missingMonths.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-yellow-800">資料缺漏提醒</div>
            <div className="text-sm text-yellow-700 mt-0.5">
              {year} 年尚未輸入：{missingMonths.join("、")} 等電費單
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Monthly trend */}
        <div className="col-span-2 bg-white border border-border rounded p-6">
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            月份排放趨勢（{year} 年）
          </h3>
          {(data.hasMonthlyScope1 || data.hasMonthlyScope2) ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(4)} tCO₂e`]} />
                <Legend />
                <Line type="monotone" dataKey="scope1" name="Scope 1" stroke="#F97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="scope2" name="Scope 2" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div>
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded px-3 py-2 text-xs text-blue-800">
                {year} 年的資料是以「年度加總」方式輸入（沒有拆分到每個月），因此無法繪製月份趨勢圖，已改為顯示年度總量比較。若要看到月份趨勢，請到 Scope 1 / Scope 2 頁面以「每月」新增記錄。
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: "Scope 1", total: data.scope1_total, fill: "#F97316" },
                    { name: "Scope 2", total: data.scope2_total, fill: "#3B82F6" },
                  ]}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(4)} tCO₂e`]} />
                  <Bar dataKey="total" name="年度總量" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white border border-border rounded p-6">
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            排放來源分佈
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v.toFixed(4)} tCO₂e`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              尚無排放資料
            </div>
          )}
        </div>
      </div>

      {/* Scope 1 breakdown + Scope 3 progress */}
      <div className="grid grid-cols-3 gap-6">
        {/* Scope 1 bar */}
        <div className="col-span-2 bg-white border border-border rounded p-6">
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            Scope 1 各排放源
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.scope1_by_category} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEB" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(4)} tCO₂e`]} />
              <Bar dataKey="total" name="排放量" fill="#1B4332" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Scope 3 progress */}
        <div className="bg-white border border-border rounded p-6">
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            Scope 3 盤查進度
          </h3>
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">已完成 Categories</span>
              <span className="font-mono font-medium">{data.scope3_completed}/15</span>
            </div>
            <div className="h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-[#40916C] rounded transition-all"
                style={{ width: `${(data.scope3_completed / 15) * 100}%` }}
              />
            </div>
          </div>
          <div className="space-y-1.5 mt-4">
            {SCOPE3_CATEGORIES.filter(c => c.relevance === "high").map(cat => {
              const done = data.scope3_by_category?.some(r => r.category_number === cat.number)
              return (
                <div key={cat.number} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cat. {cat.number} {cat.name}</span>
                  <span className={done ? "text-green-600" : "text-yellow-600"}>
                    {done ? "✓ 完成" : "待填"}
                  </span>
                </div>
              )
            })}
          </div>
          <Link href="/scope3" className="block mt-4 text-center text-xs text-[#40916C] hover:underline">
            前往 Scope 3 填寫 →
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
