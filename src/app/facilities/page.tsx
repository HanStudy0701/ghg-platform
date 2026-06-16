"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/lib/supabase/client"
import { Building2, Plus, Pencil, Trash2, Check, X } from "lucide-react"
import type { Facility } from "@/types/database"

export default function FacilitiesPage() {
  const supabase = createClient()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [area, setArea] = useState("")
  const [facilityType, setFacilityType] = useState("branch")

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: comp } = await supabase.from("companies").select("id").eq("owner_id", user.id).single()
      if (!comp) return
      setCompanyId(comp.id)
      const { data: facs } = await supabase.from("facilities").select("*").eq("company_id", comp.id).order("name")
      setFacilities(facs || [])
      setLoading(false)
    }
    init()
  }, [])

  async function fetchFacilities() {
    if (!companyId) return
    const { data } = await supabase.from("facilities").select("*").eq("company_id", companyId).order("name")
    setFacilities(data || [])
  }

  const resetForm = () => { setName(""); setAddress(""); setCity(""); setArea(""); setFacilityType("branch"); setEditId(null) }

  const startEdit = (f: Facility) => {
    setEditId(f.id)
    setName(f.name)
    setAddress(f.address || "")
    setCity(f.city || "")
    setArea(String(f.area_sqm || ""))
    setFacilityType(f.facility_type || "branch")
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    setError(""); setSuccess("")

    const payload = {
      company_id: companyId,
      name,
      address: address || null,
      city: city || null,
      area_sqm: area ? parseFloat(area) : null,
      facility_type: facilityType,
    }

    const { error: dbErr } = editId
      ? await supabase.from("facilities").update(payload).eq("id", editId)
      : await supabase.from("facilities").insert(payload)

    if (dbErr) { setError(dbErr.message) }
    else {
      setSuccess(editId ? "設施已更新" : "設施已新增")
      resetForm()
      setShowForm(false)
      fetchFacilities()
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("facilities").update({ is_active: !current }).eq("id", id)
    fetchFacilities()
  }

  async function deleteF(id: string) {
    if (!confirm("確定刪除此設施？相關排放記錄將保留但解除關聯。")) return
    await supabase.from("facilities").delete().eq("id", id)
    fetchFacilities()
  }

  const typeLabels: Record<string, string> = { branch: "分店", hq: "總部", warehouse: "倉庫" }

  return (
    <AppLayout title="設施管理" subtitle="管理各分店、總部及倉庫設施">
      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-muted-foreground">共 {facilities.length} 個設施</div>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="flex items-center gap-2 px-4 h-9 bg-[#1B4332] text-white rounded text-sm hover:bg-[#40916C]">
          <Plus className="w-4 h-4" />
          新增設施
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-border rounded p-6 mb-6">
          <h3 className="font-semibold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            {editId ? "編輯設施" : "新增設施"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">設施名稱 <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="如：忠孝分店" className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">設施類型</label>
              <select value={facilityType} onChange={e => setFacilityType(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]">
                <option value="branch">分店</option>
                <option value="hq">總部</option>
                <option value="warehouse">倉庫</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">縣市</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)}
                placeholder="台北市" className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">使用面積（坪）</label>
              <input type="number" value={area} onChange={e => setArea(e.target.value)}
                placeholder="0.00" className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">地址</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="完整地址" className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]" />
            </div>
            {error && <div className="col-span-2 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="px-4 h-9 bg-[#1B4332] text-white rounded text-sm hover:bg-[#40916C]">儲存</button>
              <button type="button" onClick={() => { resetForm(); setShowForm(false) }}
                className="px-4 h-9 border border-border rounded text-sm hover:bg-muted">取消</button>
            </div>
          </form>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded px-4 py-2.5 text-sm text-green-700 mb-4 flex items-center gap-2">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Facilities table */}
      <div className="bg-white border border-border rounded">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">載入中…</div>
        ) : facilities.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">尚未新增任何設施</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs text-muted-foreground font-medium">設施名稱</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">類型</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">縣市</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">地址</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">面積（坪）</th>
                <th className="text-center px-4 py-3 text-xs text-muted-foreground font-medium">狀態</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {facilities.map(f => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{typeLabels[f.facility_type || "branch"] || f.facility_type}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{f.city || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{f.address || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{f.area_sqm?.toLocaleString() || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(f.id, f.is_active || false)}
                      className={`text-xs px-2 py-0.5 rounded ${f.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                      {f.is_active ? "啟用中" : "停用"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => startEdit(f)} className="p-1 text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteF(f.id)} className="p-1 text-muted-foreground hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  )
}
