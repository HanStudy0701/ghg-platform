import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get("year") || "2024")

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", user.id)
    .single()

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

  const [{ data: s1 }, { data: s2 }, { data: s3 }] = await Promise.all([
    supabase.from("scope1_records").select("ghg_amount_tco2e, emission_category, month")
      .eq("company_id", company.id).eq("year", year),
    supabase.from("scope2_records").select("ghg_location_tco2e, ghg_market_tco2e, month")
      .eq("company_id", company.id).eq("year", year),
    supabase.from("scope3_records").select("ghg_amount_tco2e, category_number, month")
      .eq("company_id", company.id).eq("year", year),
  ])

  const scope1_total = (s1 || []).reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0)
  const scope2_total = (s2 || []).reduce((s, r) => s + (r.ghg_location_tco2e || 0), 0)
  const scope3_total = (s3 || []).reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0)

  const monthly: { month: number; scope1: number; scope2: number; scope3: number }[] = []
  for (let m = 1; m <= 12; m++) {
    monthly.push({
      month: m,
      scope1: (s1 || []).filter(r => r.month === m).reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0),
      scope2: (s2 || []).filter(r => r.month === m).reduce((s, r) => s + (r.ghg_location_tco2e || 0), 0),
      scope3: (s3 || []).filter(r => r.month === m).reduce((s, r) => s + (r.ghg_amount_tco2e || 0), 0),
    })
  }

  const scope1_by_category: Record<string, number> = {}
  ;(s1 || []).forEach(r => {
    const cat = r.emission_category || "other"
    scope1_by_category[cat] = (scope1_by_category[cat] || 0) + (r.ghg_amount_tco2e || 0)
  })

  const scope3_by_category: Record<number, number> = {}
  ;(s3 || []).forEach(r => {
    const cat = r.category_number || 0
    scope3_by_category[cat] = (scope3_by_category[cat] || 0) + (r.ghg_amount_tco2e || 0)
  })

  return NextResponse.json({
    year,
    company_id: company.id,
    scope1_total,
    scope2_total,
    scope3_total,
    grand_total: scope1_total + scope2_total + scope3_total,
    scope1_by_category,
    scope3_by_category,
    monthly,
  })
}
