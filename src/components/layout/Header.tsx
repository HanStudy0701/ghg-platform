"use client"

import { useRouter } from "next/navigation"
import { Bell, LogOut, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <header className="bg-white border-b border-border px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
        </button>
        <button className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <User className="w-4 h-4" />
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          登出
        </button>
      </div>
    </header>
  )
}
