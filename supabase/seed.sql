-- ============================================================
-- 排放係數種子資料
-- 來源：環境部 113 年 2 月 5 日公告 + 能源署 2024 年公告
-- ============================================================

-- 清除舊資料（避免重複）
TRUNCATE TABLE emission_factors RESTART IDENTITY;

-- ── Scope 1 固定燃燒係數 ──────────────────────────────────────
-- 欄位：factor_type, name_zh, name_en, value_co2, value_ch4, value_n2o, value_gwp, unit, source, valid_year, notes
INSERT INTO emission_factors (factor_type, name_zh, name_en, value_co2, value_ch4, value_n2o, value_gwp, unit, source, valid_year, notes) VALUES

-- ── Scope 1 固定燃燒係數 ──────────────────────────────────────
('fuel_stationary', '車用汽油（固定燃燒）', 'Gasoline (stationary)', 69300, 3, 0.6, NULL, 'kg/TJ', '環境部113年2月5日公告', 2024, '熱值7800 kcal/L'),
('fuel_stationary', '柴油（固定燃燒）', 'Diesel (stationary)', 74100, 3, 0.6, NULL, 'kg/TJ', '環境部113年2月5日公告', 2024, '熱值8400 kcal/L'),
('fuel_stationary', '液化石油氣（LPG）', 'LPG', 63100, 1, 0.1, NULL, 'kg/TJ', '環境部113年2月5日公告', 2024, '熱值6635 kcal/L'),
('fuel_stationary', '天然氣', 'Natural Gas', 56100, 1, 0.1, NULL, 'kg/TJ', '環境部113年2月5日公告', 2024, '熱值9000 kcal/m3'),

-- ── Scope 1 移動燃燒係數 ──────────────────────────────────────
('fuel_mobile', '車用汽油（輕型車，有觸媒）', 'Gasoline (light duty, catalyst)', 69300, 3.8, 5.7, NULL, 'kg/TJ', '環境部113年2月5日公告', 2024, '汽油輕型車1995年後'),
('fuel_mobile', '柴油（車用）', 'Diesel (mobile)', 74100, 3.9, 3.9, NULL, 'kg/TJ', '環境部113年2月5日公告', 2024, '柴油車'),

-- ── 逸散排放（冷媒 GWP，IPCC AR5）──────────────────────────────
('refrigerant', 'R-22（HCFC-22）', 'R-22', NULL, NULL, NULL, 1760, 'tCO2e/t', '環境部113年2月5日公告 IPCC AR5', 2024, '已限制使用，舊設備維修用'),
('refrigerant', 'R-134a（HFC-134a）', 'R-134a', NULL, NULL, NULL, 1430, 'tCO2e/t', '環境部113年2月5日公告 IPCC AR5', 2024, '汽車冷氣常見'),
('refrigerant', 'R-410A', 'R-410A', NULL, NULL, NULL, 2088, 'tCO2e/t', '環境部113年2月5日公告 IPCC AR5', 2024, '2024年前主流冷氣冷媒'),
('refrigerant', 'R-32', 'R-32', NULL, NULL, NULL, 675, 'tCO2e/t', '環境部113年2月5日公告 IPCC AR5', 2024, '新型節能冷媒'),
('refrigerant', 'R-404A', 'R-404A', NULL, NULL, NULL, 3922, 'tCO2e/t', '環境部113年2月5日公告 IPCC AR5', 2024, '商業冷凍用'),
('refrigerant', 'R-407C', 'R-407C', NULL, NULL, NULL, 1774, 'tCO2e/t', '環境部113年2月5日公告 IPCC AR5', 2024, '工業空調'),
('refrigerant', 'R-1234yf', 'R-1234yf', NULL, NULL, NULL, 4, 'tCO2e/t', 'IPCC AR6', 2024, '新世代低GWP，車用'),

-- ── Scope 2 電網排放係數（台灣）────────────────────────────────
('grid_electricity', '台灣電網排放係數（2020）', 'Taiwan Grid Factor 2020', 0.502, NULL, NULL, NULL, 'kgCO2e/kWh', '經濟部能源署', 2020, NULL),
('grid_electricity', '台灣電網排放係數（2021）', 'Taiwan Grid Factor 2021', 0.509, NULL, NULL, NULL, 'kgCO2e/kWh', '經濟部能源署', 2021, NULL),
('grid_electricity', '台灣電網排放係數（2022）', 'Taiwan Grid Factor 2022', 0.495, NULL, NULL, NULL, 'kgCO2e/kWh', '經濟部能源署', 2022, NULL),
('grid_electricity', '台灣電網排放係數（2023）', 'Taiwan Grid Factor 2023', 0.494, NULL, NULL, NULL, 'kgCO2e/kWh', '經濟部能源署', 2023, NULL),
('grid_electricity', '台灣電網排放係數（2024）', 'Taiwan Grid Factor 2024', 0.474, NULL, NULL, NULL, 'kgCO2e/kWh', '經濟部能源署113年4月23日公告', 2024, '最新公告值'),

-- ── Scope 3 Category 6 航空排放係數（含RFI=1.9）────────────────
('transport_air', '航空-國內線（<500km）經濟艙', 'Air domestic economy', 0.255, NULL, NULL, NULL, 'kgCO2e/pkm', 'DEFRA 2024', 2024, '含輻射強迫效應RFI=1.9'),
('transport_air', '航空-短程國際（500-3700km）經濟艙', 'Air short-haul economy', 0.156, NULL, NULL, NULL, 'kgCO2e/pkm', 'DEFRA 2024', 2024, '含RFI=1.9'),
('transport_air', '航空-短程國際（500-3700km）商務艙', 'Air short-haul business', 0.234, NULL, NULL, NULL, 'kgCO2e/pkm', 'DEFRA 2024', 2024, '含RFI=1.9'),
('transport_air', '航空-長程國際（>3700km）經濟艙', 'Air long-haul economy', 0.151, NULL, NULL, NULL, 'kgCO2e/pkm', 'DEFRA 2024', 2024, '含RFI=1.9'),
('transport_air', '航空-長程國際（>3700km）商務艙', 'Air long-haul business', 0.429, NULL, NULL, NULL, 'kgCO2e/pkm', 'DEFRA 2024', 2024, '含RFI=1.9'),

-- ── Scope 3 Category 7 通勤排放係數 ──────────────────────────
('transport_commute', '汽車（汽油）', 'Car (gasoline)', 0.171, NULL, NULL, NULL, 'kgCO2e/km/person', 'GHG Protocol', 2024, NULL),
('transport_commute', '機車（125cc）', 'Motorcycle 125cc', 0.083, NULL, NULL, NULL, 'kgCO2e/km/person', 'GHG Protocol', 2024, NULL),
('transport_commute', '捷運/高鐵', 'MRT/HSR', 0.035, NULL, NULL, NULL, 'kgCO2e/km/person', 'GHG Protocol', 2024, NULL),
('transport_commute', '公車', 'Bus', 0.089, NULL, NULL, NULL, 'kgCO2e/km/person', 'GHG Protocol', 2024, NULL),
('transport_commute', '電動機車', 'Electric scooter', 0.022, NULL, NULL, NULL, 'kgCO2e/km/person', 'GHG Protocol', 2024, NULL),
('transport_commute', '步行/腳踏車', 'Walk/Bicycle', 0, NULL, NULL, NULL, 'kgCO2e/km/person', 'GHG Protocol', 2024, NULL),

-- ── 台灣國內交通（商務旅行）────────────────────────────────────
('transport_ground', '高鐵', 'HSR', 0.041, NULL, NULL, NULL, 'kgCO2e/pkm', 'GHG Protocol', 2024, NULL),
('transport_ground', '台鐵', 'TRA', 0.029, NULL, NULL, NULL, 'kgCO2e/pkm', 'GHG Protocol', 2024, NULL),
('transport_ground', '商務用車（汽油）', 'Company car (gasoline)', 0.171, NULL, NULL, NULL, 'kgCO2e/pkm', 'GHG Protocol', 2024, NULL),
('transport_ground', '計程車', 'Taxi', 0.211, NULL, NULL, NULL, 'kgCO2e/pkm', 'GHG Protocol', 2024, NULL),

-- ── 廢棄物處理係數 ────────────────────────────────────────────
('waste', '焚化', 'Incineration', 0.53, NULL, NULL, NULL, 'tCO2e/ton', 'IPCC 2006 Vol.5', 2024, NULL),
('waste', '掩埋', 'Landfill', 0.48, NULL, NULL, NULL, 'tCO2e/ton', 'IPCC 2006 Vol.5', 2024, NULL),
('waste', '回收（金屬）', 'Recycling (metal)', 0.01, NULL, NULL, NULL, 'tCO2e/ton', 'IPCC 2006 Vol.5', 2024, NULL),
('waste', '回收（紙類）', 'Recycling (paper)', 0.021, NULL, NULL, NULL, 'tCO2e/ton', 'IPCC 2006 Vol.5', 2024, NULL),
('waste', '回收（塑膠）', 'Recycling (plastic)', 0.029, NULL, NULL, NULL, 'tCO2e/ton', 'IPCC 2006 Vol.5', 2024, NULL);
