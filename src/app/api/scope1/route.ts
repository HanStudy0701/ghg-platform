import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get("year") || "2024")
  const category = searchParams.get("category")

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: company } = await supabase.from("companies").select("id").eq("owner_id", user.id).single()
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

  let query = supabase.from("scope1_records").select("*")
    .eq("company_id", company.id)
    .eq("year", year)
    .order("month")

  if (category) query = query.eq("emission_category", category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = (data || []).reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0)
  return NextResponse.json({ records: data, total_tco2e: total, count: data?.length || 0 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase.from("scope1_records").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
