"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Leaf, Eye, EyeOff, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [mode, setMode] = useState<"password" | "magic">("password")

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("帳號或密碼錯誤，請重新確認")
      } else if (error.message.includes("Email not confirmed")) {
        setError("請先確認您的 Email 後再登入")
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      router.push("/dashboard")
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setMagicLinkSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-2/5 bg-[#1B4332] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#C8102E] rounded flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold" style={{ fontFamily: 'Noto Serif TC, serif' }}>信義房屋</div>
            <div className="text-[#74C69D] text-xs">溫室氣體盤查系統</div>
          </div>
        </div>
        <div>
          <blockquote className="text-[#74C69D] text-lg leading-relaxed mb-6" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            「數位化盤查，讓淨零減碳
            <br />
            從報告變成行動」
          </blockquote>
          <div className="space-y-3 text-sm text-[#74C69D]/70">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#74C69D] rounded-full" />
              符合 ISO 14064-1:2018
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#74C69D] rounded-full" />
              GHG Protocol Scope 3 Standard
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#74C69D] rounded-full" />
              台灣環境部 113 年最新係數
            </div>
          </div>
        </div>
        <div className="text-[#74C69D]/40 text-xs">
          © 2024 信義房屋股份有限公司
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              登入盤查系統
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              尚未有帳號？{" "}
              <Link href="/auth/register" className="text-[#40916C] hover:underline">
                立即註冊
              </Link>
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex mb-6 border border-border rounded overflow-hidden">
            <button
              onClick={() => setMode("password")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "password" ? "bg-[#1B4332] text-white" : "bg-white text-muted-foreground hover:bg-muted"
              }`}
            >
              密碼登入
            </button>
            <button
              onClick={() => setMode("magic")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "magic" ? "bg-[#1B4332] text-white" : "bg-white text-muted-foreground hover:bg-muted"
              }`}
            >
              Magic Link
            </button>
          </div>

          {magicLinkSent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-700" />
              </div>
              <h3 className="font-semibold mb-2">登入連結已寄出</h3>
              <p className="text-sm text-muted-foreground">
                請到 <strong>{email}</strong> 信箱點擊登入連結
              </p>
            </div>
          ) : (
            <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">電子郵件</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full h-9 px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white"
                />
              </div>

              {mode === "password" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium">密碼</label>
                    <Link href="/auth/forgot-password" className="text-xs text-[#40916C] hover:underline">
                      忘記密碼？
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-9 px-3 py-2 pr-10 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 bg-[#1B4332] text-white rounded text-sm font-medium hover:bg-[#40916C] transition-colors disabled:opacity-50"
              >
                {loading ? "處理中…" : mode === "password" ? "登入" : "寄送 Magic Link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
