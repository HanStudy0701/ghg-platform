export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          unified_number: string | null
          industry: string | null
          employee_count: number | null
          base_year: number | null
          reporting_year: number
          org_boundary: string | null
          contact_email: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          owner_id?: string | null
          name: string
          unified_number?: string | null
          industry?: string | null
          employee_count?: number | null
          base_year?: number | null
          reporting_year?: number
          org_boundary?: string | null
          contact_email?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string | null
          name?: string
          unified_number?: string | null
          industry?: string | null
          employee_count?: number | null
          base_year?: number | null
          reporting_year?: number
          org_boundary?: string | null
          contact_email?: string | null
          created_at?: string | null
        }
      }
      facilities: {
        Row: {
          id: string
          company_id: string | null
          name: string
          address: string | null
          area_sqm: number | null
          city: string | null
          facility_type: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          company_id?: string | null
          name: string
          address?: string | null
          area_sqm?: number | null
          city?: string | null
          facility_type?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string | null
          name?: string
          address?: string | null
          area_sqm?: number | null
          city?: string | null
          facility_type?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      scope1_records: {
        Row: {
          id: string
          company_id: string | null
          facility_id: string | null
          year: number
          month: number | null
          emission_category: string
          source_type: string
          fuel_type: string | null
          refrigerant_type: string | null
          consumption_amount: number | null
          consumption_unit: string | null
          co2_factor: number | null
          ch4_factor: number | null
          n2o_factor: number | null
          gwp_ch4: number | null
          gwp_n2o: number | null
          ghg_amount_tco2e: number | null
          data_quality: string | null
          notes: string | null
          data_source_doc: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['scope1_records']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['scope1_records']['Insert']>
      }
      scope2_records: {
        Row: {
          id: string
          company_id: string | null
          facility_id: string | null
          year: number
          month: number | null
          electricity_kwh: number | null
          steam_gj: number | null
          grid_emission_factor: number | null
          renewable_kwh: number | null
          ghg_location_tco2e: number | null
          ghg_market_tco2e: number | null
          utility_bill_amount: number | null
          invoice_number: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['scope2_records']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['scope2_records']['Insert']>
      }
      scope3_records: {
        Row: {
          id: string
          company_id: string | null
          year: number
          category_number: number | null
          category_name: string
          subcategory: string | null
          calculation_method: string | null
          activity_data: number | null
          activity_unit: string | null
          spend_amount_twd: number | null
          emission_factor: number | null
          emission_factor_unit: string | null
          emission_factor_source: string | null
          ghg_amount_tco2e: number | null
          supplier_name: string | null
          data_availability: string | null
          relevance_score: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['scope3_records']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['scope3_records']['Insert']>
      }
      emission_factors: {
        Row: {
          id: string
          factor_type: string
          name_zh: string
          name_en: string | null
          value_co2: number | null
          value_ch4: number | null
          value_n2o: number | null
          value_gwp: number | null
          unit: string
          source: string | null
          valid_year: number | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['emission_factors']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['emission_factors']['Insert']>
      }
      suppliers: {
        Row: {
          id: string
          company_id: string | null
          name: string
          contact_email: string | null
          industry: string | null
          annual_spend_twd: number | null
          questionnaire_sent_at: string | null
          questionnaire_responded_at: string | null
          supplier_ghg_tco2e: number | null
          tier: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
      }
    }
  }
}

// 便利型別別名
export type Company = Database['public']['Tables']['companies']['Row']
export type Facility = Database['public']['Tables']['facilities']['Row']
export type Scope1Record = Database['public']['Tables']['scope1_records']['Row']
export type Scope2Record = Database['public']['Tables']['scope2_records']['Row']
export type Scope3Record = Database['public']['Tables']['scope3_records']['Row']
export type EmissionFactor = Database['public']['Tables']['emission_factors']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
