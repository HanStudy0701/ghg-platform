# 信義房屋 GHG 盤查平台 — 安裝與部署指南

## 系統需求

- Node.js 18.17 以上
- npm 9 以上（或 pnpm / yarn）
- Supabase 帳號（免費方案即可）

---

## 步驟一：建立 Supabase 專案

1. 前往 [https://supabase.com](https://supabase.com) 建立新帳號或登入
2. 點擊「New Project」，選擇離台灣最近的區域（Tokyo — ap-northeast-1）
3. 輸入專案名稱（如：`sinyi-ghg`）並設定強密碼
4. 等待專案建立完成（約 2–3 分鐘）

---

## 步驟二：建立資料庫結構

在 Supabase 專案左側選單，點擊「SQL Editor」，依序執行以下 SQL 腳本：

### 2-1. 建立資料表與索引

```sql
-- 執行檔案：supabase/schema.sql
-- 複製該檔案全部內容並在 SQL Editor 執行
```

### 2-2. 設定 Row Level Security 政策

```sql
-- 執行檔案：supabase/rls.sql
-- 複製該檔案全部內容並在 SQL Editor 執行
```

### 2-3. 匯入排放係數種子資料

```sql
-- 執行檔案：supabase/seed.sql
-- 複製該檔案全部內容並在 SQL Editor 執行
```

---

## 步驟三：取得 Supabase 金鑰

在 Supabase 專案左側選單，點擊「Settings → API」：

- **Project URL**：類似 `https://xxxxxxxxxxxx.supabase.co`
- **anon/public key**：以 `eyJ...` 開頭的 JWT
- **service_role key**（機密，勿外洩）：另一個較長的 JWT

---

## 步驟四：設定環境變數

複製 `.env.local.example` 為 `.env.local`：

```bash
cp .env.local.example .env.local
```

編輯 `.env.local`，填入從 Supabase 取得的值：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...（anon key）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...（service role key，機密）
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 步驟五：設定 Supabase Auth 重新導向網址

在 Supabase 專案「Authentication → URL Configuration」：

- **Site URL**：`http://localhost:3000`（開發）或正式網域
- **Redirect URLs** 新增：
  - `http://localhost:3000/auth/callback`
  - `https://你的正式網域.com/auth/callback`（部署後）

---

## 步驟六：安裝相依套件

```bash
cd sinyi-ghg-platform
npm install
```

主要相依套件：

| 套件 | 版本 | 用途 |
|------|------|------|
| next | 15.x | 框架 |
| @supabase/ssr | latest | Supabase SSR 客戶端 |
| @supabase/supabase-js | latest | Supabase JS SDK |
| tailwindcss | 3.x | 樣式框架 |
| recharts | latest | 圖表 |
| jspdf | latest | PDF 匯出 |
| jspdf-autotable | latest | PDF 表格 |
| xlsx | latest | Excel 匯出 |
| zod | latest | 資料驗證 |
| react-hook-form | latest | 表單管理 |
| lucide-react | latest | 圖示 |
| @radix-ui/* | latest | UI 基礎元件 |

---

## 步驟七：啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000)

---

## 步驟八：首次使用

1. 點擊「立即開始盤查」或前往 `/auth/register`
2. 填寫步驟一：Email 與密碼（需含大寫、小寫、數字，至少 8 字元）
3. 填寫步驟二：公司名稱、產業別（選「不動產業」）
4. 填寫步驟三：基準年（2021）、盤查年度（2024）
5. 完成後自動導向 Dashboard

---

## 頁面路由說明

| 路由 | 說明 |
|------|------|
| `/` | 首頁（未登入可見） |
| `/auth/login` | 登入（Email/密碼 + Magic Link） |
| `/auth/register` | 三步驟註冊 |
| `/auth/forgot-password` | 忘記密碼 |
| `/dashboard` | 儀表板（三範疇總覽圖表） |
| `/scope1` | Scope 1 排放記錄總覽 |
| `/scope1/stationary` | 固定燃燒輸入 |
| `/scope1/mobile` | 移動燃燒輸入 |
| `/scope1/fugitive` | 冷媒逸散輸入 |
| `/scope2` | Scope 2 電力排放輸入 |
| `/scope3` | Scope 3 十五類別總覽 |
| `/scope3/category/[id]` | Scope 3 各類別輸入（1–15） |
| `/facilities` | 設施管理（分店/總部/倉庫） |
| `/report` | PDF + Excel 報告匯出 |
| `/settings` | 系統設定（公司資料、係數參考） |

---

## API Routes

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/summary?year=2024` | GET | 三範疇年度合計與月度資料 |
| `/api/scope1?year=2024` | GET | Scope 1 記錄查詢 |
| `/api/scope1?id=xxx` | DELETE | 刪除 Scope 1 記錄 |
| `/api/emission-factors` | GET | 取得所有排放係數（公開） |

---

## 部署至 Vercel（建議）

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# 部署
vercel --prod
```

在 Vercel 專案設定 → Environment Variables，加入與 `.env.local` 相同的三個環境變數。

---

## 排放係數來源說明

| 類型 | 係數來源 |
|------|---------|
| 固定/移動燃燒 | 環境部 113 年 2 月 5 日公告（kg/TJ） |
| 電力（Scope 2） | 2024 年電網排放係數 0.474 kgCO₂e/kWh（經濟部能源署） |
| 冷媒逸散 | IPCC AR5 GWP100（環境部公告） |
| 航空商務旅行 | DEFRA 2024 + RFI 輻射強迫因子 1.9 |
| 員工通勤 | 交通部/IPCC 各運具係數 |
| 採購商品 | USEEIO 花費基礎法（TWD÷31.5→USD × EEIO係數） |
| GWP 值 | IPCC AR6 第六次評估報告（CH₄=28, N₂O=265） |

---

## 資料庫資料表說明

| 資料表 | 說明 |
|-------|------|
| `companies` | 公司/組織基本資料，每用戶一筆 |
| `facilities` | 設施（分店、總部、倉庫） |
| `scope1_records` | Scope 1 直接排放記錄（固定/移動/逸散） |
| `scope2_records` | Scope 2 電力排放記錄 |
| `scope3_records` | Scope 3 各類別排放記錄 |
| `emission_factors` | 排放係數主表（seed.sql 匯入） |
| `suppliers` | 供應商資料（Scope 3 Cat.1 適用） |
| `audit_logs` | 資料異動稽核日誌 |

---

## 常見問題

**Q: 登入後轉跳空白頁？**
A: 確認 Supabase Auth URL 設定中已加入 `/auth/callback` 重新導向網址。

**Q: 資料無法存入資料庫？**
A: 確認已執行 `rls.sql`，且 Supabase Auth 的 `anon key` 正確設定。

**Q: Magic Link 收不到信？**
A: Supabase 免費方案每小時限制寄出 2 封測試信。正式部署請設定自訂 SMTP（設定 → Auth → SMTP Settings）。

**Q: PDF 匯出字體顯示方塊？**
A: `jsPDF` 不原生支援中文字體。本平台使用英數混排，中文欄位在 PDF 中顯示原始資料值。如需全中文 PDF，可整合 `jsPDF` 的自訂字體功能或改用 Puppeteer 伺服器端渲染。

---

## 技術架構

```
sinyi-ghg-platform/
├── src/
│   ├── app/                    # Next.js App Router 頁面
│   │   ├── api/               # API Routes
│   │   ├── auth/              # 認證頁面
│   │   ├── dashboard/         # 儀表板
│   │   ├── scope1/            # Scope 1 頁面群
│   │   ├── scope2/            # Scope 2 頁面
│   │   ├── scope3/            # Scope 3 頁面群
│   │   ├── facilities/        # 設施管理
│   │   ├── report/            # 報告匯出
│   │   └── settings/          # 系統設定
│   ├── components/
│   │   ├── layout/            # AppLayout, Sidebar, Header
│   │   └── ui/                # Button, Card, Input, Select 等
│   ├── lib/
│   │   ├── supabase/          # client.ts, server.ts, middleware.ts
│   │   ├── calculations/      # scope1.ts, scope2.ts, scope3.ts
│   │   ├── constants/         # emissionFactors.ts
│   │   └── utils.ts
│   └── types/
│       └── database.ts        # 完整 TypeScript 型別
├── supabase/
│   ├── schema.sql             # 資料表建立 SQL
│   ├── rls.sql                # Row Level Security 政策
│   └── seed.sql               # 排放係數種子資料
├── .env.local.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

*信義房屋 GHG 盤查平台 v1.0 — 依據 ISO 14064-1:2018、GHG Protocol 及台灣環境部 113 年公告排放係數建置*
