-- ============================================================
-- Row Level Security 政策
-- 執行於 schema.sql 之後
-- ============================================================

-- 啟用 RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope1_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope2_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;

-- companies: 只能看/改自己的公司
CREATE POLICY "users_own_company_select" ON companies
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "users_own_company_insert" ON companies
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "users_own_company_update" ON companies
  FOR UPDATE USING (owner_id = auth.uid());

-- facilities
CREATE POLICY "users_own_facilities" ON facilities
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_insert_facilities" ON facilities
  FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- scope1_records
CREATE POLICY "users_own_scope1" ON scope1_records
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_insert_scope1" ON scope1_records
  FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_update_scope1" ON scope1_records
  FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_delete_scope1" ON scope1_records
  FOR DELETE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- scope2_records
CREATE POLICY "users_own_scope2" ON scope2_records
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_insert_scope2" ON scope2_records
  FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_update_scope2" ON scope2_records
  FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_delete_scope2" ON scope2_records
  FOR DELETE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- scope3_records
CREATE POLICY "users_own_scope3" ON scope3_records
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_insert_scope3" ON scope3_records
  FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_update_scope3" ON scope3_records
  FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_delete_scope3" ON scope3_records
  FOR DELETE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- suppliers
CREATE POLICY "users_own_suppliers" ON suppliers
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_insert_suppliers" ON suppliers
  FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "users_update_suppliers" ON suppliers
  FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- audit_logs
CREATE POLICY "users_own_audit" ON audit_logs
  FOR SELECT USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- emission_factors: 所有登入用戶可讀
CREATE POLICY "public_emission_factors" ON emission_factors
  FOR SELECT USING (true);
