"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { FileText, Sheet, Download, Loader2, CheckCircle } from "lucide-react"
import type { Company, Scope1Record, Scope2Record, Scope3Record } from "@/types/database"

interface SummaryData {
  scope1_total: number
  scope2_total: number
  scope3_total: number
  grand_total: number
  scope1_by_category: Record<string, number>
  scope3_by_cat: Record<number, number>
  monthly_scope1: number[]
  monthly_scope2: number[]
}

export default function ReportPage() {
  const supabase = createClient()
  const [company, setCompany] = useState<Company | null>(null)
  const [year, setYear] = useState(2024)
  const [loading, setLoading] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [scope1Records, setScope1Records] = useState<Scope1Record[]>([])
  const [scope2Records, setScope2Records] = useState<Scope2Record[]>([])
  const [scope3Records, setScope3Records] = useState<Scope3Record[]>([])
  const [pdfDone, setPdfDone] = useState(false)
  const [xlsDone, setXlsDone] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: comp } = await supabase.from("companies").select("*").eq("owner_id", user.id).single()
      setCompany(comp)
    }
    init()
  }, [])

  async function loadData() {
    if (!company) return
    setLoading(true)
    const [
      { data: s1 },
      { data: s2 },
      { data: s3 },
    ] = await Promise.all([
      supabase.from("scope1_records").select("*").eq("company_id", company.id).eq("year", year),
      supabase.from("scope2_records").select("*").eq("company_id", company.id).eq("year", year),
      supabase.from("scope3_records").select("*").eq("company_id", company.id).eq("year", year),
    ])
    const r1 = s1 || []; const r2 = s2 || []; const r3 = s3 || []
    setScope1Records(r1); setScope2Records(r2); setScope3Records(r3)

    const scope1_total = r1.reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0)
    const scope2_total = r2.reduce((s, r) => s + (r.ghg_location_tco2e || 0), 0)
    const scope3_total = r3.reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0)

    const scope1_by_category: Record<string, number> = {}
    r1.forEach(r => {
      const cat = r.emission_category || "other"
      scope1_by_category[cat] = (scope1_by_category[cat] || 0) + (r.ghg_amount_tco2e || 0)
    })

    const scope3_by_cat: Record<number, number> = {}
    r3.forEach(r => {
      const n = r.category_number || 0
      scope3_by_cat[n] = (scope3_by_cat[n] || 0) + (r.ghg_amount_tco2e || 0)
    })

    const monthly_scope1 = Array(12).fill(0)
    const monthly_scope2 = Array(12).fill(0)
    r1.forEach(r => { if (r.month) monthly_scope1[r.month - 1] += (r.ghg_amount_tco2e || 0) })
    r2.forEach(r => { if (r.month) monthly_scope2[r.month - 1] += (r.ghg_location_tco2e || 0) })

    setSummary({
      scope1_total, scope2_total, scope3_total,
      grand_total: scope1_total + scope2_total + scope3_total,
      scope1_by_category, scope3_by_cat, monthly_scope1, monthly_scope2,
    })
    setLoading(false)
    setDataReady(true)
    setPdfDone(false); setXlsDone(false)
  }

  async function exportPDF() {
    if (!summary || !company) return
    const { default: jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

    // Helper
    const addPage = () => { doc.addPage() }
    const GREEN = [27, 67, 50]
    const GRAY = [100, 100, 100]

    // Cover page
    doc.setFillColor(...GREEN as [number, number, number])
    doc.rect(0, 0, 210, 297, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(28)
    doc.text("溫室氣體盤查報告書", 105, 80, { align: "center" })
    doc.setFontSize(14)
    doc.text(`${company.name}`, 105, 100, { align: "center" })
    doc.setFontSize(12)
    doc.text(`盤查年度：${year} 年`, 105, 120, { align: "center" })
    doc.text(`組織邊界：運營控制法`, 105, 135, { align: "center" })
    doc.text(`盤查標準：ISO 14064-1:2018、GHG Protocol`, 105, 148, { align: "center" })
    doc.setFontSize(10)
    doc.setTextColor(200, 200, 200)
    doc.text(`產生日期：${new Date().toLocaleDateString("zh-TW")}`, 105, 280, { align: "center" })

    // Page 2 — Executive Summary
    addPage()
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("1. 執行摘要", 20, 25)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...GRAY as [number, number, number])
    doc.text(`本報告依據 ISO 14064-1:2018 及 GHG Protocol 企業標準，揭露 ${company.name} ${year} 年度溫室氣體排放量。`, 20, 37, { maxWidth: 170 })

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text("排放總量摘要", 20, 55)

    autoTable(doc, {
      startY: 60,
      head: [["範疇", "類別", "排放量 (tCO₂e)", "佔比 (%)"]],
      body: [
        ["Scope 1", "直接排放", summary.scope1_total.toFixed(4), ((summary.scope1_total / (summary.grand_total || 1)) * 100).toFixed(1) + "%"],
        ["Scope 2", "電力間接排放（地點基礎法）", summary.scope2_total.toFixed(4), ((summary.scope2_total / (summary.grand_total || 1)) * 100).toFixed(1) + "%"],
        ["Scope 3", "其他間接排放", summary.scope3_total.toFixed(4), ((summary.scope3_total / (summary.grand_total || 1)) * 100).toFixed(1) + "%"],
        ["", "合計", summary.grand_total.toFixed(4), "100%"],
      ],
      headStyles: { fillColor: GREEN as [number, number, number], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      styles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [248, 247, 244] },
    })

    // Page 3 — Scope 1 Details
    addPage()
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("2. Scope 1 直接排放", 20, 25)

    const s1Body = scope1Records.map(r => [
      `${r.year}/${String(r.month).padStart(2, "0")}`,
      r.emission_category === "stationary" ? "固定燃燒" : r.emission_category === "mobile" ? "移動燃燒" : "逸散排放",
      r.source_type || "",
      r.fuel_type || r.refrigerant_type || "",
      (r.consumption_amount || 0).toFixed(3),
      r.consumption_unit || "",
      (r.ghg_amount_tco2e || 0).toFixed(6),
    ])

    autoTable(doc, {
      startY: 35,
      head: [["年月", "排放類別", "排放源", "燃料/冷媒", "消耗量", "單位", "排放量(tCO₂e)"]],
      body: s1Body,
      headStyles: { fillColor: GREEN as [number, number, number], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 247, 244] },
    })

    const s1Y = (doc as any).lastAutoTable.finalY + 5
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(`Scope 1 合計：${summary.scope1_total.toFixed(4)} tCO₂e`, 20, s1Y)

    // Page 4 — Scope 2 Details
    addPage()
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("3. Scope 2 電力間接排放", 20, 25)

    const s2Body = scope2Records.map(r => [
      `${r.year}/${String(r.month).padStart(2, "0")}`,
      (r.electricity_kwh || 0).toLocaleString(),
      (r.renewable_kwh || 0).toLocaleString(),
      (r.grid_emission_factor || 0).toString(),
      (r.ghg_location_tco2e || 0).toFixed(4),
      (r.ghg_market_tco2e || 0).toFixed(4),
    ])

    autoTable(doc, {
      startY: 35,
      head: [["年月", "外購電量(kWh)", "REC電量(kWh)", "排放係數", "地點基礎法(tCO₂e)", "市場基礎法(tCO₂e)"]],
      body: s2Body,
      headStyles: { fillColor: GREEN as [number, number, number], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 247, 244] },
    })

    const s2Y = (doc as any).lastAutoTable.finalY + 5
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(`Scope 2 合計（地點基礎法）：${summary.scope2_total.toFixed(4)} tCO₂e`, 20, s2Y)

    // Page 5 — Scope 3 Summary
    addPage()
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("4. Scope 3 其他間接排放", 20, 25)

    const s3CategoryNames: Record<number, string> = {
      1: "採購商品與服務", 2: "資本財", 3: "燃料與能源相關活動", 4: "上游運輸與配送",
      5: "業務活動廢棄物", 6: "商務旅行", 7: "員工通勤", 8: "上游租賃資產",
      9: "下游運輸與配送", 10: "銷售產品加工", 11: "使用銷售產品", 12: "銷售產品廢棄處理",
      13: "下游租賃資產", 14: "特許加盟", 15: "投資",
    }

    const s3Body = Object.entries(summary.scope3_by_cat).map(([cat, total]) => [
      `Category ${cat}`,
      s3CategoryNames[Number(cat)] || `類別 ${cat}`,
      total.toFixed(4),
      ((total / (summary.scope3_total || 1)) * 100).toFixed(1) + "%",
    ])

    autoTable(doc, {
      startY: 35,
      head: [["類別編號", "類別名稱", "排放量(tCO₂e)", "佔比"]],
      body: s3Body,
      headStyles: { fillColor: GREEN as [number, number, number], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 247, 244] },
    })

    const s3Y = (doc as any).lastAutoTable.finalY + 5
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(`Scope 3 合計：${summary.scope3_total.toFixed(4)} tCO₂e`, 20, s3Y)

    // Page 6 — Methodology
    addPage()
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("5. 盤查方法說明", 20, 25)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...GRAY as [number, number, number])
    const methods = [
      "5.1 組織邊界：採用「運營控制法」，涵蓋信義房屋對其業務具有運營控制的設施與活動。",
      "5.2 排放係數來源：",
      "    • 固定/移動燃燒：環境部 113 年 2 月 5 日公告排放係數（kg/TJ）",
      "    • 冷媒逸散：IPCC AR5 GWP 值（R-410A=2088, R-22=1760, R-32=675 等）",
      "    • 電力：2024 年電網排放係數 0.474 kgCO₂e/kWh（經濟部能源署）",
      "    • 商務旅行（航空）：DEFRA 2024 + RFI=1.9",
      "    • 員工通勤：交通部/IPCC 各運具排放係數",
      "    • 採購商品（Scope 3 Cat.1）：USEEIO 花費基礎法，TWD/USD=31.5",
      "5.3 GWP 值：採用 IPCC AR6（CO₂=1, CH₄=28, N₂O=265）",
      "5.4 全球暖化潛勢：100 年時間框架（GWP100）",
      "5.5 盤查邊界：本報告涵蓋 Scope 1、Scope 2（地點基礎法）及 Scope 3 各類別",
    ]
    methods.forEach((line, i) => {
      doc.text(line, 20, 40 + i * 10, { maxWidth: 170 })
    })

    // Footer on each page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      if (i > 1) {
        doc.setTextColor(150, 150, 150)
        doc.setFontSize(8)
        doc.text(`${company.name}｜${year} 年溫室氣體盤查報告書`, 20, 290)
        doc.text(`第 ${i} 頁 / 共 ${pageCount} 頁`, 190, 290, { align: "right" })
      }
    }

    doc.save(`${company.name}_${year}年GHG盤查報告.pdf`)
    setPdfDone(true)
    setTimeout(() => setPdfDone(false), 5000)
  }

  async function exportExcel() {
    if (!summary || !company) return
    const XLSX = await import("xlsx")

    const wb = XLSX.utils.book_new()

    // Sheet 1: Summary
    const summaryData = [
      ["信義房屋溫室氣體盤查報告書", "", "", ""],
      [`盤查年度：${year} 年`, "", "", ""],
      ["產生日期：" + new Date().toLocaleDateString("zh-TW"), "", "", ""],
      [],
      ["【排放量摘要】", "", "", ""],
      ["範疇", "說明", "排放量 (tCO₂e)", "佔比 (%)"],
      ["Scope 1", "直接排放", summary.scope1_total, ((summary.scope1_total / (summary.grand_total || 1)) * 100).toFixed(2)],
      ["Scope 2", "電力間接排放（地點基礎法）", summary.scope2_total, ((summary.scope2_total / (summary.grand_total || 1)) * 100).toFixed(2)],
      ["Scope 3", "其他間接排放", summary.scope3_total, ((summary.scope3_total / (summary.grand_total || 1)) * 100).toFixed(2)],
      ["合計", "", summary.grand_total, "100.00"],
      [],
      ["【Scope 1 分類】", "", "", ""],
      ["排放類別", "排放量 (tCO₂e)", "", ""],
      ...Object.entries(summary.scope1_by_category).map(([cat, val]) => [
        cat === "stationary" ? "固定燃燒" : cat === "mobile" ? "移動燃燒" : "逸散排放", val, "", ""
      ]),
      [],
      ["【月度排放量】", "", "", ""],
      ["月份", "Scope 1 (tCO₂e)", "Scope 2 (tCO₂e)", "合計 (tCO₂e)"],
      ...summary.monthly_scope1.map((v, i) => [
        `${i + 1} 月`, v, summary.monthly_scope2[i], v + summary.monthly_scope2[i]
      ]),
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    ws1["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws1, "摘要報告")

    // Sheet 2: Scope 1
    const s1Header = ["年份", "月份", "排放類別", "設備類型", "燃料類型", "冷媒類型", "消耗量", "單位", "CO2 係數", "CH4 係數", "N2O 係數", "排放量(tCO₂e)", "備注"]
    const s1Data = scope1Records.map(r => [
      r.year, r.month,
      r.emission_category === "stationary" ? "固定燃燒" : r.emission_category === "mobile" ? "移動燃燒" : "逸散排放",
      r.source_type, r.fuel_type, r.refrigerant_type,
      r.consumption_amount, r.consumption_unit,
      r.co2_factor, r.ch4_factor, r.n2o_factor,
      r.ghg_amount_tco2e, r.notes,
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([s1Header, ...s1Data])
    ws2["!cols"] = s1Header.map((_, i) => ({ wch: i < 3 ? 12 : 16 }))
    XLSX.utils.book_append_sheet(wb, ws2, "Scope 1 直接排放")

    // Sheet 3: Scope 2
    const s2Header = ["年份", "月份", "設施", "外購電量(kWh)", "REC電量(kWh)", "排放係數", "地點基礎(tCO₂e)", "市場基礎(tCO₂e)", "電費金額(元)", "電費單號"]
    const s2Data = scope2Records.map(r => [
      r.year, r.month, r.facility_id,
      r.electricity_kwh, r.renewable_kwh, r.grid_emission_factor,
      r.ghg_location_tco2e, r.ghg_market_tco2e,
      r.utility_bill_amount, r.invoice_number,
    ])
    const ws3 = XLSX.utils.aoa_to_sheet([s2Header, ...s2Data])
    ws3["!cols"] = s2Header.map(() => ({ wch: 18 }))
    XLSX.utils.book_append_sheet(wb, ws3, "Scope 2 電力排放")

    // Sheet 4: Scope 3
    const s3Header = ["年份", "月份", "類別編號", "類別名稱", "活動資料", "單位", "排放係數", "排放量(tCO₂e)", "計算方法", "備注"]
    const s3Data = scope3Records.map(r => [
      r.year, r.month, r.category_number, r.category_name,
      r.activity_data, r.activity_unit, r.emission_factor,
      r.ghg_amount_tco2e, r.calculation_method, r.notes,
    ])
    const ws4 = XLSX.utils.aoa_to_sheet([s3Header, ...s3Data])
    ws4["!cols"] = s3Header.map((_, i) => ({ wch: i < 3 ? 10 : 18 }))
    XLSX.utils.book_append_sheet(wb, ws4, "Scope 3 其他間接排放")

    // Sheet 5: Emission Factors Reference
    const efData = [
      ["【排放係數參考資料】", "", "", ""],
      ["燃料/活動", "CO2係數", "CH4係數", "N2O係數"],
      ["柴油 (kg/TJ)", "74,100", "3.9", "3.9"],
      ["汽油 (kg/TJ)", "69,300", "25", "8"],
      ["LPG (kg/TJ)", "63,100", "5", "0.1"],
      ["天然氣 (kg/TJ)", "56,100", "1", "0.1"],
      [],
      ["電力", "係數 (kgCO₂e/kWh)", "", ""],
      ["2024 年（最新）", "0.474", "", ""],
      ["2023 年", "0.494", "", ""],
      ["2022 年", "0.495", "", ""],
      [],
      ["冷媒", "GWP (IPCC AR5)", "", ""],
      ["R-410A", "2088", "", ""],
      ["R-22", "1760", "", ""],
      ["R-32", "675", "", ""],
      ["R-134a", "1430", "", ""],
      [],
      ["GWP 值 (IPCC AR6)", "", "", ""],
      ["CO₂", "1", "", ""],
      ["CH₄", "28", "", ""],
      ["N₂O", "265", "", ""],
    ]
    const ws5 = XLSX.utils.aoa_to_sheet(efData)
    ws5["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, ws5, "排放係數參考")

    XLSX.writeFile(wb, `${company.name}_${year}年GHG盤查_${new Date().toISOString().split("T")[0]}.xlsx`)
    setXlsDone(true)
    setTimeout(() => setXlsDone(false), 5000)
  }

  const s1Cat: Record<string, string> = { stationary: "固定燃燒", mobile: "移動燃燒", fugitive: "逸散排放" }

  return (
    <AppLayout title="報告匯出" subtitle="產生 PDF 盤查報告書或 Excel 工作底稿">
      <div className="max-w-3xl space-y-6">

        {/* Year selector + load */}
        <div className="bg-white border border-border rounded p-6">
          <h2 className="font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>選擇盤查年度</h2>
          <div className="flex items-center gap-4">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
              {[2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y} 年</option>)}
            </select>
            <button onClick={loadData} disabled={loading || !company}
              className="flex items-center gap-2 px-4 h-9 bg-[#1B4332] text-white rounded text-sm hover:bg-[#40916C] disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "載入中…" : "載入資料"}
            </button>
          </div>
        </div>

        {/* Summary preview */}
        {dataReady && summary && (
          <div className="bg-white border border-border rounded p-6">
            <h2 className="font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              {year} 年排放量摘要
            </h2>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "Scope 1 直接排放", val: summary.scope1_total, color: "text-orange-700" },
                { label: "Scope 2 電力排放", val: summary.scope2_total, color: "text-blue-700" },
                { label: "Scope 3 其他間接", val: summary.scope3_total, color: "text-purple-700" },
                { label: "總排放量", val: summary.grand_total, color: "text-[#1B4332]" },
              ].map(item => (
                <div key={item.label} className="bg-[#F8F7F4] rounded p-4">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className={`font-mono text-lg font-semibold ${item.color}`}>{item.val.toFixed(4)}</div>
                  <div className="text-xs text-muted-foreground">tCO₂e</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium mb-2 text-xs text-muted-foreground uppercase tracking-wide">Scope 1 分類</div>
                {Object.entries(summary.scope1_by_category).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between py-1 border-b border-border last:border-0">
                    <span>{s1Cat[cat] || cat}</span>
                    <span className="font-mono">{val.toFixed(4)} tCO₂e</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="font-medium mb-2 text-xs text-muted-foreground uppercase tracking-wide">Scope 3 各類別</div>
                {Object.entries(summary.scope3_by_cat).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between py-1 border-b border-border last:border-0">
                    <span>Category {cat}</span>
                    <span className="font-mono">{val.toFixed(4)} tCO₂e</span>
                  </div>
                ))}
                {Object.keys(summary.scope3_by_cat).length === 0 && (
                  <div className="text-muted-foreground text-xs">尚無資料</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Export buttons */}
        {dataReady && (
          <div className="grid grid-cols-2 gap-4">
            {/* PDF */}
            <div className="bg-white border border-border rounded p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <div className="font-semibold text-sm">PDF 盤查報告書</div>
                  <div className="text-xs text-muted-foreground">A4 格式，含封面、摘要、各範疇明細</div>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                <li>• 封面頁（企業名稱、年度、標準）</li>
                <li>• 執行摘要（三範疇合計）</li>
                <li>• Scope 1/2/3 明細表</li>
                <li>• 盤查方法說明</li>
                <li>• 頁首/頁尾/頁碼</li>
              </ul>
              <button onClick={exportPDF}
                className="w-full flex items-center justify-center gap-2 h-9 bg-red-700 text-white rounded text-sm hover:bg-red-800 transition-colors">
                {pdfDone ? <CheckCircle className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {pdfDone ? "已匯出！" : "匯出 PDF"}
              </button>
            </div>

            {/* Excel */}
            <div className="bg-white border border-border rounded p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
                  <Sheet className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Excel 工作底稿</div>
                  <div className="text-xs text-muted-foreground">.xlsx 格式，含原始數據與係數參考</div>
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                <li>• 摘要報告（含月度分析）</li>
                <li>• Scope 1 直接排放明細</li>
                <li>• Scope 2 電力排放明細</li>
                <li>• Scope 3 各類別明細</li>
                <li>• 排放係數參考資料</li>
              </ul>
              <button onClick={exportExcel}
                className="w-full flex items-center justify-center gap-2 h-9 bg-green-700 text-white rounded text-sm hover:bg-green-800 transition-colors">
                {xlsDone ? <CheckCircle className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {xlsDone ? "已匯出！" : "匯出 Excel"}
              </button>
            </div>
          </div>
        )}

        {!dataReady && (
          <div className="bg-[#F8F7F4] border border-border rounded p-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">請先選擇年度並點擊「載入資料」以預覽摘要並產生報告</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
