"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Leaf, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Step = 1 | 2 | 3

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Step 1: Account
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Step 2: Company
  const [companyName, setCompanyName] = useState("信義房屋股份有限公司")
  const [unifiedNumber, setUnifiedNumber] = useState("")
  const [industry, setIndustry] = useState("real_estate")
  const [employeeCount, setEmployeeCount] = useState("")

  // Step 3: Reporting
  const [baseYear, setBaseYear] = useState("2017")
  const [reportingYear, setReportingYear] = useState("2024")

  const validateStep1 = () => {
    if (!email || !password || !confirmPassword) return "請填寫所有欄位"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email 格式不正確"
    if (password.length < 8) return "密碼至少需要 8 個字元"
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return "密碼需包含大小寫字母及數字"
    if (password !== confirmPassword) return "兩次密碼輸入不一致"
    return ""
  }

  const validateStep2 = () => {
    if (!companyName) return "請填寫公司名稱"
    if (unifiedNumber && !/^\d{8}$/.test(unifiedNumber)) return "統一編號須為 8 碼數字"
    return ""
  }

  const handleNext = () => {
    setError("")
    if (step === 1) {
      const err = validateStep1()
      if (err) { setError(err); return }
    }
    if (step === 2) {
      const err = validateStep2()
      if (err) { setError(err); return }
    }
    setStep((step + 1) as Step)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError("")

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: companyError } = await supabase.from("companies").insert({
        owner_id: authData.user.id,
        name: companyName,
        unified_number: unifiedNumber || null,
        industry,
        employee_count: employeeCount ? parseInt(employeeCount) : null,
        base_year: parseInt(baseYear),
        reporting_year: parseInt(reportingYear),
        org_boundary: "operational_control",
        contact_email: email,
      })

      if (companyError) {
        setError("公司資料建立失敗：" + companyError.message)
        setLoading(false)
        return
      }
    }

    router.push("/dashboard")
  }

  const steps = [
    { number: 1, label: "帳號設定" },
    { number: 2, label: "公司資料" },
    { number: 3, label: "盤查設定" },
  ]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#C8102E] rounded flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-[#C8102E] font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>信義房屋溫室氣體盤查系統</span>
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>新用戶註冊</h1>
          <p className="text-sm text-muted-foreground mt-1">
            已有帳號？{" "}
            <Link href="/auth/login" className="text-[#40916C] hover:underline">立即登入</Link>
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step > s.number
                    ? "bg-[#40916C] text-white"
                    : step === s.number
                    ? "bg-[#1B4332] text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step > s.number ? <Check className="w-4 h-4" /> : s.number}
                </div>
                <span className="text-xs mt-1 text-muted-foreground">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-16 h-0.5 mb-4 ${step > s.number ? "bg-[#40916C]" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded p-8">
          {/* Step 1: Account */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground mb-4">步驟 1：帳號設定</h2>
              <div>
                <label className="block text-sm font-medium mb-1.5">電子郵件 <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">密碼 <span className="text-red-500">*</span></label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="至少 8 碼，需含大小寫+數字" required
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">確認密碼 <span className="text-red-500">*</span></label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="再次輸入密碼" required
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white" />
              </div>
            </div>
          )}

          {/* Step 2: Company */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold mb-4">步驟 2：公司資料</h2>
              <div>
                <label className="block text-sm font-medium mb-1.5">公司名稱 <span className="text-red-500">*</span></label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="信義房屋股份有限公司"
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">統一編號（選填）</label>
                <input type="text" value={unifiedNumber} onChange={e => setUnifiedNumber(e.target.value)}
                  placeholder="8 碼數字" maxLength={8}
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">產業別</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white">
                  <option value="real_estate">不動產業</option>
                  <option value="service">服務業</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">員工人數（選填）</label>
                <input type="number" value={employeeCount} onChange={e => setEmployeeCount(e.target.value)}
                  placeholder="如：6000"
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white" />
              </div>
            </div>
          )}

          {/* Step 3: Reporting */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold mb-4">步驟 3：盤查設定</h2>
              <div>
                <label className="block text-sm font-medium mb-1.5">基準年</label>
                <select value={baseYear} onChange={e => setBaseYear(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white">
                  {Array.from({length: 9}, (_, i) => 2015 + i).map(y => (
                    <option key={y} value={y}>{y} 年</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">盤查年度</label>
                <select value={reportingYear} onChange={e => setReportingYear(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white">
                  {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                    <option key={y} value={y}>{y} 年</option>
                  ))}
                </select>
              </div>
              <div className="bg-[#F8F7F4] border border-border rounded p-4">
                <div className="text-sm font-medium mb-1">組織邊界方法</div>
                <div className="text-sm text-[#1B4332] font-medium">營運控制法（Operational Control Approach）</div>
                <p className="text-xs text-muted-foreground mt-1">
                  依 ISO 14064-1:2018，信義房屋採用此方法，涵蓋所有具有完全營運控制權的設施。此設定不可更改。
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as Step)}
                className="flex-1 h-9 border border-border text-foreground rounded text-sm hover:bg-muted transition-colors"
              >
                上一步
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-9 bg-[#1B4332] text-white rounded text-sm font-medium hover:bg-[#40916C] transition-colors"
              >
                下一步
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-9 bg-[#1B4332] text-white rounded text-sm font-medium hover:bg-[#40916C] transition-colors disabled:opacity-50"
              >
                {loading ? "建立中…" : "建立帳號"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
