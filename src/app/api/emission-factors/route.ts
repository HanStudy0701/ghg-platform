import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("emission_factors")
    .select("*")
    .order("category")
    .order("sub_category")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ emission_factors: data })
}
