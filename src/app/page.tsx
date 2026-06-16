import Link from "next/link"
import { Leaf, BarChart3, Globe, FileText, CheckCircle } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#C8102E] rounded flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[#C8102E] font-bold text-sm" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              信義房屋
            </span>
            <span className="text-muted-foreground text-sm ml-2">溫室氣體盤查系統</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm text-[#1B4332] border border-[#1B4332] rounded hover:bg-[#1B4332] hover:text-white transition-colors"
          >
            登入
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 text-sm bg-[#1B4332] text-white rounded hover:bg-[#40916C] transition-colors"
          >
            開始使用
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#1B4332] text-white py-24 px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#40916C]/40 px-4 py-1.5 rounded text-sm mb-6 text-[#74C69D]">
            <CheckCircle className="w-4 h-4" />
            符合 ISO 14064-1:2018 · GHG Protocol · 台灣環保署格式
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            信義房屋
            <br />
            溫室氣體盤查數位化平台
          </h1>
          <p className="text-[#74C69D] text-lg mb-8">
            完整涵蓋 Scope 1、Scope 2、Scope 3（15 個類別）的數位化盤查解決方案
            <br />
            基於環境部 113 年最新排放係數，符合 SBTi 1.5°C 路徑要求
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-[#74C69D] text-[#1B4332] font-semibold rounded hover:bg-[#52B788] transition-colors"
            >
              立即開始盤查
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3 border border-[#74C69D] text-[#74C69D] rounded hover:bg-[#40916C]/30 transition-colors"
            >
              已有帳號？登入
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-8 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12 text-foreground" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          一站式溫室氣體盤查解決方案
        </h2>
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white border border-border rounded">
            <div className="w-12 h-12 bg-orange-100 rounded mx-auto mb-4 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-700" />
            </div>
            <h3 className="font-semibold mb-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              Scope 1+2 精確計算
            </h3>
            <p className="text-sm text-muted-foreground">
              固定燃燒、移動燃燒、冷媒逸散、外購電力，
              即時顯示計算過程與係數來源
            </p>
          </div>
          <div className="text-center p-6 bg-white border border-border rounded">
            <div className="w-12 h-12 bg-purple-100 rounded mx-auto mb-4 flex items-center justify-center">
              <Globe className="w-6 h-6 text-purple-700" />
            </div>
            <h3 className="font-semibold mb-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              Scope 3 供應鏈管理
            </h3>
            <p className="text-sm text-muted-foreground">
              完整 15 Categories，支援支出法、平均資料法、
              供應商問卷三種計算方法
            </p>
          </div>
          <div className="text-center p-6 bg-white border border-border rounded">
            <div className="w-12 h-12 bg-green-100 rounded mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-700" />
            </div>
            <h3 className="font-semibold mb-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              報告一鍵匯出
            </h3>
            <p className="text-sm text-muted-foreground">
              自動產生 ISO 14064-1 格式 PDF 報告，
              支援環保署登錄格式 Excel 匯出
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#F0EFEB] py-12 px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-8 text-center">
          {[
            { value: "5,353", unit: "tCO₂e", label: "2023 年 Scope 1+2 排放" },
            { value: "CDP A", unit: "評級", label: "氣候透明度評比" },
            { value: "1.5°C", unit: "目標", label: "SBTi 科學基礎目標" },
            { value: "2050", unit: "年", label: "集團淨零承諾" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-mono text-2xl font-bold text-[#1B4332]">
                {stat.value}
                <span className="text-sm ml-1 text-[#40916C]">{stat.unit}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1B4332] text-[#74C69D]/60 py-8 px-8 text-center text-sm">
        <p>© 2024 信義房屋股份有限公司 · 溫室氣體盤查系統</p>
        <p className="mt-1 text-xs">依據：台灣《溫室氣體減量及管理法》· ISO 14064-1:2018 · GHG Protocol</p>
      </footer>
    </div>
  )
}
