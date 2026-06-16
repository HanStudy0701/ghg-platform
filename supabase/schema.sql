-- ============================================================
-- 信義房屋溫室氣體盤查平台 — 資料庫 Schema
-- 執行順序：schema.sql → seed.sql → rls.sql
-- ============================================================

-- 1. companies（公司資料）
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  unified_number  TEXT UNIQUE,
  industry        TEXT,
  employee_count  INTEGER,
  base_year       INTEGER DEFAULT 2017,
  reporting_year  INTEGER NOT NULL DEFAULT 2024,
  org_boundary    TEXT DEFAULT 'operational_control',
  contact_email   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. facilities（設施/分店）
CREATE TABLE IF NOT EXISTS facilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT,
  area_sqm      NUMERIC(10,2),
  city          TEXT,
  facility_type TEXT DEFAULT 'branch',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. scope1_records（Scope 1 直接排放）
CREATE TABLE IF NOT EXISTS scope1_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID REFERENCES companies(id) ON DELETE CASCADE,
  facility_id         UUID REFERENCES facilities(id),
  year                INTEGER NOT NULL,
  month               INTEGER CHECK (month BETWEEN 1 AND 12),
  emission_category   TEXT NOT NULL,
  source_type         TEXT NOT NULL,
  fuel_type           TEXT,
  refrigerant_type    TEXT,
  consumption_amount  NUMERIC(15,6),
  consumption_unit    TEXT,
  co2_factor          NUMERIC(15,9),
  ch4_factor          NUMERIC(15,9),
  n2o_factor          NUMERIC(15,9),
  gwp_ch4             NUMERIC(5,1) DEFAULT 28,
  gwp_n2o             NUMERIC(5,1) DEFAULT 265,
  ghg_amount_tco2e    NUMERIC(15,6),
  data_quality        TEXT DEFAULT 'measured',
  notes               TEXT,
  data_source_doc     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. scope2_records（Scope 2 電力間接排放）
CREATE TABLE IF NOT EXISTS scope2_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID REFERENCES companies(id) ON DELETE CASCADE,
  facility_id           UUID REFERENCES facilities(id),
  year                  INTEGER NOT NULL,
  month                 INTEGER CHECK (month BETWEEN 1 AND 12),
  electricity_kwh       NUMERIC(15,4),
  steam_gj              NUMERIC(15,4) DEFAULT 0,
  grid_emission_factor  NUMERIC(8,6) DEFAULT 0.474,
  renewable_kwh         NUMERIC(15,4) DEFAULT 0,
  ghg_location_tco2e   NUMERIC(15,6),
  ghg_market_tco2e     NUMERIC(15,6),
  utility_bill_amount   NUMERIC(12,2),
  invoice_number        TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 5. scope3_records（Scope 3 其他間接排放）
CREATE TABLE IF NOT EXISTS scope3_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID REFERENCES companies(id) ON DELETE CASCADE,
  year                  INTEGER NOT NULL,
  category_number       INTEGER CHECK (category_number BETWEEN 1 AND 15),
  category_name         TEXT NOT NULL,
  subcategory           TEXT,
  calculation_method    TEXT,
  activity_data         NUMERIC(15,6),
  activity_unit         TEXT,
  spend_amount_twd      NUMERIC(15,2),
  emission_factor       NUMERIC(15,9),
  emission_factor_unit  TEXT,
  emission_factor_source TEXT,
  ghg_amount_tco2e     NUMERIC(15,6),
  supplier_name         TEXT,
  data_availability     TEXT DEFAULT 'available',
  relevance_score       INTEGER CHECK (relevance_score BETWEEN 1 AND 5),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 6. emission_factors（排放係數查找表）
CREATE TABLE IF NOT EXISTS emission_factors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_type   TEXT NOT NULL,
  name_zh       TEXT NOT NULL,
  name_en       TEXT,
  value_co2     NUMERIC(15,9),
  value_ch4     NUMERIC(15,9),
  value_n2o     NUMERIC(15,9),
  value_gwp     NUMERIC(10,1),
  unit          TEXT NOT NULL,
  source        TEXT,
  valid_year    INTEGER,
  notes         TEXT
);

-- 7. suppliers（供應商資料庫）
CREATE TABLE IF NOT EXISTS suppliers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name                        TEXT NOT NULL,
  contact_email               TEXT,
  industry                    TEXT,
  annual_spend_twd            NUMERIC(15,2),
  questionnaire_sent_at       TIMESTAMPTZ,
  questionnaire_responded_at  TIMESTAMPTZ,
  supplier_ghg_tco2e          NUMERIC(15,6),
  tier                        TEXT DEFAULT 'tier1',
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- 8. audit_logs（稽核日誌）
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id),
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scope1_company_year ON scope1_records(company_id, year);
CREATE INDEX IF NOT EXISTS idx_scope2_company_year ON scope2_records(company_id, year);
CREATE INDEX IF NOT EXISTS idx_scope3_company_year ON scope3_records(company_id, year);
CREATE INDEX IF NOT EXISTS idx_facilities_company ON facilities(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scope1_updated_at BEFORE UPDATE ON scope1_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scope2_updated_at BEFORE UPDATE ON scope2_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scope3_updated_at BEFORE UPDATE ON scope3_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
