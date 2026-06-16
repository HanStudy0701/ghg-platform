"use client"

import { useState } from "react"
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react"

export interface GuideStep {
  title: string
  content: string
}

interface GuideCardProps {
  title?: string
  steps: GuideStep[]
  defaultOpen?: boolean
}

/**
 * 新手指引卡片（可收合）。放在每個 Scope 頁面最上方，
 * 讓完全不懂溫室氣體盤查的人也能照步驟填寫。
 */
export function GuideCard({ title = "新手填寫指引", steps, defaultOpen = false }: GuideCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-amber-50 border border-amber-200 rounded mb-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-amber-900"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {title}（不熟悉碳盤查也能填，點開看步驟）
        </span>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-amber-200 pt-3">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-medium mt-0.5">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-medium text-amber-900">{s.title}</div>
                <div className="text-xs text-amber-800 mt-0.5 leading-relaxed">{s.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
