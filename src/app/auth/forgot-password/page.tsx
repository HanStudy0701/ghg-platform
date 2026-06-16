"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Leaf, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#C8102E] rounded flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>忘記密碼</h1>
        </div>

        <div className="bg-white border border-border rounded p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-700" />
              </div>
              <h3 className="font-semibold mb-2">重設密碼信件已寄出</h3>
              <p className="text-sm text-muted-foreground mb-6">
                請查看 <strong>{email}</strong> 的信箱，點擊重設連結
              </p>
              <Link href="/auth/login" className="text-sm text-[#40916C] hover:underline">
                返回登入
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                輸入您的帳號 Email，我們將寄送密碼重設連結
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5">電子郵件</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full h-9 px-3 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-[#1B4332] bg-white"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 bg-[#1B4332] text-white rounded text-sm font-medium hover:bg-[#40916C] transition-colors disabled:opacity-50"
              >
                {loading ? "寄送中…" : "寄送重設連結"}
              </button>
              <div className="text-center">
                <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-[#40916C]">
                  ← 返回登入
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
