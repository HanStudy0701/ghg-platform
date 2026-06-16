"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"

/**
 * 欄位旁的小提示圖示。滑鼠移上去或點擊會顯示白話說明，
 * 用於協助不熟悉碳盤查術語的使用者理解每個欄位該填什麼。
 */
export function FieldHint({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.preventDefault(); setShow(s => !s) }}
        className="text-muted-foreground hover:text-[#1B4332] align-middle"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {show && (
        <span className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 text-xs bg-[#1B4332] text-white rounded px-2.5 py-2 leading-relaxed shadow-lg">
          {text}
        </span>
      )}
    </span>
  )
}
