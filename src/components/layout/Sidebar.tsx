"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Flame,
  Zap,
  Globe,
  FileText,
  Settings,
  ChevronRight,
  Leaf,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    label: "儀表板",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "設施管理",
    href: "/facilities",
    icon: Building2,
  },
  {
    label: "Scope 1 直接排放",
    href: "/scope1",
    icon: Flame,
    children: [
      { label: "固定燃燒", href: "/scope1/stationary" },
      { label: "移動燃燒", href: "/scope1/mobile" },
      { label: "逸散排放", href: "/scope1/fugitive" },
    ],
  },
  {
    label: "Scope 2 電力排放",
    href: "/scope2",
    icon: Zap,
  },
  {
    label: "Scope 3 價值鏈排放",
    href: "/scope3",
    icon: Globe,
  },
  {
    label: "年度報告",
    href: "/report",
    icon: FileText,
  },
  {
    label: "系統設定",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-[#1B4332] min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#40916C]/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#C8102E] rounded flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              信義房屋
            </div>
            <div className="text-[#74C69D] text-xs">溫室氣體盤查系統</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = hasChildren && isActive

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors",
                  isActive
                    ? "bg-[#40916C] text-white"
                    : "text-[#74C69D] hover:bg-[#40916C]/30 hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {hasChildren && (
                  <ChevronRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")} />
                )}
              </Link>

              {/* Sub-items */}
              {hasChildren && isExpanded && (
                <div className="ml-7 mt-1 space-y-1">
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block px-3 py-2 rounded text-xs transition-colors",
                          childActive
                            ? "bg-[#74C69D]/20 text-white"
                            : "text-[#74C69D]/70 hover:text-white hover:bg-[#40916C]/20"
                        )}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#40916C]/30">
        <div className="text-[#74C69D]/60 text-xs text-center">
          <div>ISO 14064-1:2018</div>
          <div>GHG Protocol</div>
        </div>
      </div>
    </aside>
  )
}
