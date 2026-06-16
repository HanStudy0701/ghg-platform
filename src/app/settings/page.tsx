"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { Save, CheckCircle, Building2, Calendar, Zap, Globe, Info } from "lucide-react"
import { GRID_FACTORS, REFRIGERANT_GWP, GWP } from "@/lib/constants/emissionFactors"
import type { Company } from "@/types/database"

type Tab = "company" | "inventory" | "factors" | "account"

export default function SettingsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>("company")
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  // Company form
  const [companyName, setCompanyName] = useState("")
  const [companyIndustry, setCompanyIndustry] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyContact, setCompanyContact] = useState("")
  const [companyUnifiedNumber, setCompanyUnifiedNumber] = useState("")

  // Inventory settings
  const [baseYear, setBaseYear] = useState(2021)
  const [reportingYear, setReportingYear] = useState(2024)
  const [orgBoundary] = useState("operational_control")

  // Account
  const [userEmail, setUserEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwError, setPwError] = useState("")

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email || "")
      if (!user) return
      const { data: comp } = await supabase.from("companies").select("*").eq("owner_id", user.id).single()
      if (!comp) return
      setCompany(comp)
      setCompanyName(comp.name || "")
      setCompanyIndustry(comp.industry || "")
      setCompanyAddress(comp.address || "")
      setCompanyContact(comp.contact_person || "")
      setCompanyUnifiedNumber(comp.unified_business_no || "")
      setBaseYear(comp.base_year || 2021)
      setReportingYear(comp.reporting_year || 2024)
    }
    init()
  }, [])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 4000)
  }

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return
    setLoading(true); setError("")
    const { error: dbErr } = await supabase.from("companies").update({
      name: companyName,
      industry: companyIndustry,
      address: companyAddress,
      contact_person: companyContact,
      unified_business_no: companyUnifiedNumber,
    }).eq("id", company.id)
    if (dbErr) setError(dbErr.message)
    else showSuccess("公司資料已更新")
    setLoading(false)
  }

  const saveInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return
    setLoading(true); setError("")
    const { error: dbErr } = await supabase.from("companies").update({
      base_year: baseYear,
      reporting_year: reportingYear,
    }).eq("id", company.id)
    if (dbErr) setError(dbErr.message)
    else showSuccess("盤查設定已更新")
    setLoading(false)
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError("")
    if (newPassword !== confirmPassword) { setPwError("兩次密碼不一致"); return }
    if (newPassword.length < 8) { setPwError("密碼至少 8 個字元"); return }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPwError("密碼需包含大寫、小寫及數字"); return
    }
    setLoading(true)
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
    if (pwErr) setPwError(pwErr.message)
    else { showSuccess("密碼已變更"); setNewPassword(""); setConfirmPassword("") }
    setLoading(false)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "company", label: "公司資料", icon: <Building2 className="w-4 h-4" /> },
    { id: "inventory", label: "盤查設定", icon: <Calendar className="w-4 h-4" /> },
    { id: "factors", label: "排放係數", icon: <Zap className="w-4 h-4" /> },
    { id: "account", label: "帳號安全", icon: <Globe className="w-4 h-4" /> },
  ]

  return (
    <AppLayout title="系統設定" subtitle="管理公司資料、盤查設定與帳號">
      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-52 flex-shrink-0">
          <nav className="bg-white border border-border rounded overflow-hidden">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left border-b border-border last:border-0 transition-colors ${
                  tab === t.id ? "bg-[#1B4332] text-white" : "text-foreground hover:bg-muted"
                }`}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-4 py-2.5 text-sm text-green-700 mb-4">
              <CheckCircle className="w-4 h-4" /> {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded px-4 py-2.5 text-sm text-red-700 mb-4">{error}</div>
          )}

          {/* ─── Company Tab ─── */}
          {tab === "company" && (
            <div className="bg-white border border-border rounded p-6">
              <h2 className="font-semibold mb-6" style={{ fontFamily: 'Noto Serif TC, serif' }}>公司基本資料</h2>
              <form onSubmit={saveCompany} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">公司名稱 <span className="text-red-500">*</span></label>
                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required
                      className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">統一編號</label>
                    <input type="text" value={companyUnifiedNumber} onChange={e => setCompanyUnifiedNumber(e.target.value)}
                      placeholder="12345678"
                      className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">產業別</label>
                    <select value={companyIndustry} onChange={e => setCompanyIndustry(e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                      <option value="">請選擇</option>
                      <option value="real_estate">不動產業</option>
                      <option value="finance">金融保險業</option>
                      <option value="retail">零售業</option>
                      <option value="manufacturing">製造業</option>
                      <option value="service">服務業</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">聯絡人</label>
                    <input type="text" value={companyContact} onChange={e => setCompanyContact(e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1.5">公司地址</label>
                    <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 px-4 h-9 bg-[#1B4332] text-white rounded text-sm hover:bg-[#40916C] disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  儲存公司資料
                </button>
              </form>
            </div>
          )}

          {/* ─── Inventory Tab ─── */}
          {tab === "inventory" && (
            <div className="space-y-4">
              <div className="bg-white border border-border rounded p-6">
                <h2 className="font-semibold mb-6" style={{ fontFamily: 'Noto Serif TC, serif' }}>盤查設定</h2>
                <form onSubmit={saveInventory} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">基準年度</label>
                      <select value={baseYear} onChange={e => setBaseYear(Number(e.target.value))}
                        className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                        {[2020, 2021, 2022, 2023].map(y => <option key={y} value={y}>{y} 年</option>)}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">供量化目標設定與趨勢比較使用</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">盤查年度</label>
                      <select value={reportingYear} onChange={e => setReportingYear(Number(e.target.value))}
                        className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                        {[2022, 2023, 2024, 2025].map(y => <option key={y} value={y}>{y} 年</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">組織邊界設定</label>
                    <div className="flex items-center gap-3 h-9 px-3 bg-[#F8F7F4] border border-border rounded text-sm text-muted-foreground">
                      <span>運營控制法（Operational Control）</span>
                      <span className="text-xs bg-[#1B4332]/10 text-[#1B4332] px-2 py-0.5 rounded">鎖定</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">依 GHG Protocol 及 ISO 14064-1:2018，組織邊界為運營控制法，不可更改</p>
                  </div>

                  <button type="submit" disabled={loading}
                    className="flex items-center gap-2 px-4 h-9 bg-[#1B4332] text-white rounded text-sm hover:bg-[#40916C] disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    儲存盤查設定
                  </button>
                </form>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800 flex gap-3">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>GWP 值設定：</strong>本平台固定採用 IPCC AR6 第六次評估報告 GWP100 值（CH₄=28, N₂O=265）。
                  冷媒 GWP 採用 IPCC AR5（依環境部公告）。
                </div>
              </div>
            </div>
          )}

          {/* ─── Emission Factors Tab ─── */}
          {tab === "factors" && (
            <div className="space-y-4">
              <div className="bg-white border border-border rounded p-6">
                <h2 className="font-semibold mb-1" style={{ fontFamily: 'Noto Serif TC, serif' }}>排放係數參考</h2>
                <p className="text-xs text-muted-foreground mb-4">係數依環境部公告及 IPCC 標準，由系統內建，不可手動修改。</p>

                {/* GWP */}
                <div className="mb-6">
                  <div className="text-sm font-medium mb-2">全球暖化潛勢（GWP）— IPCC AR6</div>
                  <div className="flex gap-4">
                    {[["CO₂", "1"], ["CH₄", "28"], ["N₂O", "265"]].map(([gas, val]) => (
                      <div key={gas} className="bg-[#F8F7F4] rounded px-4 py-3 text-center">
                        <div className="text-xs text-muted-foreground">{gas}</div>
                        <div className="font-mono font-semibold text-lg">{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid factors */}
                <div className="mb-6">
                  <div className="text-sm font-medium mb-2">電網排放係數（kgCO₂e/kWh）— 經濟部能源署</div>
                  <table className="w-full text-sm border border-border rounded overflow-hidden">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left px-4 py-2 text-xs font-medium">年度</th>
                        <th className="text-right px-4 py-2 text-xs font-medium">係數</th>
                        <th className="text-left px-4 py-2 text-xs font-medium">狀態</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(GRID_FACTORS).reverse().map(([y, f]) => (
                        <tr key={y} className="border-t border-border">
                          <td className="px-4 py-2">{y} 年</td>
                          <td className="px-4 py-2 text-right font-mono">{f}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {Number(y) === 2024 ? <span className="text-green-700 font-medium">最新（預設）</span> : "歷史"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Refrigerant GWP */}
                <div>
                  <div className="text-sm font-medium mb-2">冷媒 GWP 值 — IPCC AR5（環境部公告）</div>
                  <table className="w-full text-sm border border-border rounded overflow-hidden">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left px-4 py-2 text-xs font-medium">冷媒型號</th>
                        <th className="text-left px-4 py-2 text-xs font-medium">名稱</th>
                        <th className="text-right px-4 py-2 text-xs font-medium">GWP100</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(REFRIGERANT_GWP).map(([key, val]) => (
                        <tr key={key} className="border-t border-border">
                          <td className="px-4 py-2 font-mono text-sm">{key}</td>
                          <td className="px-4 py-2 text-muted-foreground">{val.name_zh}</td>
                          <td className="px-4 py-2 text-right font-mono">{val.gwp.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Account Tab ─── */}
          {tab === "account" && (
            <div className="space-y-4">
              <div className="bg-white border border-border rounded p-6">
                <h2 className="font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>帳號資訊</h2>
                <div className="flex items-center gap-3 bg-[#F8F7F4] border border-border rounded px-4 py-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-sm font-medium">
                    {userEmail[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{userEmail}</div>
                    <div className="text-xs text-muted-foreground">帳號 Email（不可修改）</div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border rounded p-6">
                <h2 className="font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>變更密碼</h2>
                <form onSubmit={changePassword} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">新密碼 <span className="text-red-500">*</span></label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                      placeholder="至少 8 字元，含大小寫及數字"
                      className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">確認新密碼 <span className="text-red-500">*</span></label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                      className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
                  </div>
                  {pwError && <div className="text-sm text-red-600">{pwError}</div>}
                  <button type="submit" disabled={loading}
                    className="flex items-center gap-2 px-4 h-9 bg-[#1B4332] text-white rounded text-sm hover:bg-[#40916C] disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    更新密碼
                  </button>
                </form>
              </div>

              <div className="bg-white border border-border rounded p-6">
                <h2 className="font-semibold mb-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>登出</h2>
                <p className="text-sm text-muted-foreground mb-4">登出後需重新以 Email 登入</p>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.href = "/auth/login"
                  }}
                  className="px-4 h-9 border border-red-200 text-red-700 rounded text-sm hover:bg-red-50 transition-colors">
                  登出帳號
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
