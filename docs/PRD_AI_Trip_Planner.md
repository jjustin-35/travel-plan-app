# PRD — AI 行程排列 App

## 1. 產品概述

以 AI 為核心的旅遊行程規劃 App，使用者輸入旅遊基本資訊後，AI 自動產生視覺化行程，並支援手動調整與跨裝置同步。

### 1.1 設計風格方向

整體設計採**溫暖旅遊感**：手繪風、插畫感，讓 App 體驗更像一本手作旅行手帳，而非制式排程工具。此風格貫穿三個關鍵場景：

- Onboarding 問卷：選項類欄位（旅遊性質、偏好風格）採插畫卡片呈現
- AI 等待畫面：以旅遊主題插畫動畫（行李箱打包、飛機飛行等）取代制式 loading
- 行程主畫面：時間軸節點與整體視覺語言延續手繪、插畫調性

---

## 2. 開發策略

### 階段一：Next.js PWA（快速驗證）

- 以 Next.js 全端開發，API Routes 直接承載後端邏輯
- 部署為 PWA，省略 App Store 審核，直接分享 URL 驗證
- 目標：快速驗證核心 UX 與 AI 行程產生流程

### 階段二：抽出獨立後端 + React Native（確認要做 mobile 後）

- 將 Next.js API Routes 的 business logic 搬到 Express.js / Fastify
- Next.js 改為純 frontend 打獨立 API
- React Native 與 Next.js 共用同一個後端

### 關鍵設計原則（確保階段一 → 二的搬移成本低）

API Route 只做 parse request / return response，所有邏輯集中在 service / repository 層：

```
app/api/trips/route.ts         → 只做 parse request / return response
lib/services/trip.service.ts   → 所有 business logic
lib/db/trip.repository.ts      → 所有 DB query
```

---

## 3. 技術選型

| 層 | 階段一（PWA） | 階段二（Mobile） |
|----|--------------|----------------|
| Frontend | Next.js + next-pwa | React Native |
| Backend | Next.js API Routes | Express.js 或 Fastify（獨立服務） |
| Auth | Supabase Auth | 同左 |
| AI | Claude Sonnet 4.5 | 同左 |
| Local 儲存 | IndexedDB（idb） | SQLite（op-sqlite 或 WatermelonDB） |
| Server DB | Supabase（PostgreSQL） | 同左 |
| Cache | Redis（Zeabur 內建） | 同左 |
| Queue | BullMQ | 同左 |
| Real-time | Supabase Realtime | 同左 |
| Frontend State | React Query（server state）+ Zustand（client UI state） | 同左 |
| 部署 | Zeabur（Next.js + Worker + Redis 同一專案） | 同左 |

**Zeabur 專案結構：**

```
Zeabur 專案
├── Next.js service        ← 前端 + API Routes
├── BullMQ Worker service  ← Node.js 常駐 process
└── Redis service          ← 內建，一鍵開啟

Supabase（獨立服務）       ← DB + Auth
```

選型理由：
- Dev Plan $5/月含 $5 credits，驗證階段月費幾乎為零
- 一個平台管理 Next.js、Worker、Redis，環境變數共享，比多平台方案省力
- 有亞洲節點，台灣使用者延遲低
- 未來若需要擴展，可評估搬至 Vercel + 獨立 Worker 架構

### 3.1 技術選型理由

**Supabase（Auth + DB）**

資料模型為關聯式設計（users / trips / trip_days / trip_events 互相 FK），Supabase 底層即為 PostgreSQL，與設計契合；Auth 與業務資料庫同源，不需額外維護資料同步問題。相較 Firebase（Firestore 為 NoSQL），更貼近現有 ER 設計，未來也可較低成本遷移至自架 PostgreSQL + 自架 auth。

**Prisma（ORM）**

DB 存取層與 Supabase client 解耦，未來搬到 Express/Fastify 時，Prisma schema 與 query code 可直接搬遷，不需重寫資料存取邏輯。Prisma 僅管理 `public` schema 下的業務表，不涉入 Supabase 託管的 `auth.users` / `auth.identities`。

**BullMQ（Queue）**

| | BullMQ | Bee-Queue | RabbitMQ | AWS SQS |
|---|---|---|---|---|
| 依賴 | Redis（與既有 cache 共用） | Redis | 獨立 broker | AWS 服務 |
| Node.js 整合度 | 高，TypeScript 原生支援好 | 中，功能較少 | 需額外 client library | 需額外 SDK |
| Job 狀態追蹤 | 內建狀態機 + Bull Board dashboard | 較簡單，功能少 | 需自行實作 | 需搭配 DynamoDB 等額外追蹤 |
| Retry / 延遲 job | 內建支援，設定靈活 | 支援但選項較少 | 支援但設定複雜 | 支援但須搭配 DLQ |
| 部署複雜度 | 低，共用既有 Redis | 低 | 高，多一個服務要維運 | 低，但綁定 AWS |

選擇理由：
- 已決定用 Redis 做 cache，BullMQ 可直接共用同一個 Redis instance 當 broker，不需額外維運服務
- `ai_generation_jobs.status` 需要追蹤任務狀態（pending → processing → done → failed），BullMQ 內建的 job 狀態機剛好對應
- Bull Board 提供現成 dashboard，開發階段可直觀觀察 queue 排隊、執行、重試行為，對系統架構學習有幫助
- 若未來規模擴大、需要多語言服務互通，可評估改用 RabbitMQ 或 Kafka，但現階段 BullMQ 是務實選擇

**React Query + Zustand（前端 State 管理）**

依「狀態性質」分工，而非單一工具統包：

| 狀態類型 | 工具 | 範例 |
|---------|------|------|
| Server state | React Query | trips 列表、單一 trip 詳細資料、AI job 狀態 |
| Client UI state | Zustand | 拖曳中的暫存順序、modal 開關、onboarding 問卷填寫進度 |

選擇理由：
- Server state 涉及 cache 失效策略、loading/error 管理、重複請求 dedupe、視窗 focus 自動 refetch、retry、optimistic update 等需求，React Query 皆有內建機制；若改用 Zustand 手刻，等同重新發明這些基礎設施
- 與 **Supabase Realtime 的整合度高**：DB 寫入觸發 Realtime 推播後，可直接呼叫 `queryClient.invalidateQueries()` 或 `setQueryData()` 更新 cache，所有訂閱該 query 的元件自動重新渲染，不需手動管理「哪些元件正在訂閱哪筆資料」
- 拖曳排序適合搭配 React Query 的 optimistic update 機制（UI 先樂觀更新，API 失敗才 rollback），與 5.4 節的 conflict detection（409 重試）流程自然銜接
- Client UI state（與 server 無關、不需 cache/retry/refetch 的暫時性狀態）改用 Zustand，輕量、無 boilerplate，適合拖曳暫存、modal 狀態等場景
- 評估過直接用 Next.js **Server Actions** 取代 API Routes，但 Server Actions 為 Next.js 專屬機制，無法搬遷至 Express/Fastify，也無法被 React Native 呼叫，與「階段二要抽出獨立後端、跨 client 共用」的架構目標衝突，因此不採用，仍以標準 REST API（API Routes）作為資料存取層

---

## 4. 使用者系統

### 4.1 認證方案：Supabase Auth

採用 **Supabase Auth** 處理第三方登入（Google、LINE、Facebook），不自行實作 OAuth flow。

- Supabase 內建 `auth.users` 表，負責 email、OAuth identity 儲存與驗證
- 業務層的使用者資料（name、avatar_url 等）存在獨立的 `public.users` 表，透過 `id` 對應 `auth.users.id`（同一個 UUID）
- **Account linking 邏輯交由 Supabase Auth 內建處理**：同一 email 用不同 provider 登入會自動視為同一人，不需要自行實作合併邏輯

> 原本設計的 `oauth_accounts` 表，由 Supabase 內部的 `auth.identities` 表取代，詳見第 7 節 ER Diagram 標註（標示為 Supabase 託管表）。

### 4.2 `auth.users` → `public.users` 同步：Database Trigger

此同步邏輯放在 **Supabase Database Trigger**（而非 Next.js application 層）：

- 此同步本質是 Auth 系統（Supabase）與業務資料庫的耦合，與後端用什麼框架無關，放在 DB 層可確保不管哪個開發階段都不需要額外處理
- 比起在 application 層手動 insert，DB trigger 由資料庫保證執行，不會因 callback 中斷而資料不一致

```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

> 此 trigger 為 Supabase 專案設定的一部分，**不納入 Prisma migration**（Prisma 僅管理 `public` schema 下的業務表）。

### 4.3 Prisma Client 初始化：Global Singleton Pattern

Next.js 開發環境的 hot reload 會重新執行模組，若每次都 `new PrismaClient()`，容易打爆 DB connection pool。採用 global singleton pattern 避免此問題：

```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

Development 環境下，`globalThis` 不會因 hot reload 被重置，第二次 import 會拿到同一個 instance；production 環境因無 hot reload 問題，不需此保護。

---

## 5. 核心功能

### 5.1 行程建立前：資訊蒐集

設計為 **Step-by-step** onboarding 流程（類似 Typeform，一次一題）。

| 欄位 | 類型 | 必填 |
|------|------|------|
| 旅遊地點 | 文字輸入 | ✅ |
| 人數 | 數字 | ✅ |
| 天數／夜數 | 數字 | ✅ |
| 出發 / 結束時間 | 日期時間選擇器 | ✅ |
| 旅遊性質 | 單選（情侶、家族、獨旅、朋友…） | ✅ |
| 預算範圍 | 範圍選擇 | ❌ |
| 偏好風格 | 多選（文化探索、美食、戶外冒險…） | ❌ |
| 其他要求 | 自由文字輸入（如「其中一人使用輪椅」、「有素食者」等） | ❌ |

**Step 切分與互動：**

```
Step 1：目的地（文字輸入，可搭配熱門目的地建議卡片）
Step 2：天數／夜數 + 出發/結束時間（日期選擇器，選完天數自動算夜數）
Step 3：人數
Step 4：旅遊性質（插畫卡片選擇，非制式 radio button）
Step 5：預算範圍（選填，提供「跳過」按鈕）
Step 6：偏好風格（選填，多選卡片，提供「跳過」按鈕）
Step 7：其他要求（選填，自由文字輸入，提供「跳過」按鈕）
```

- 頂部進度條呈現 7 個區段，**可點擊跳回任一已完成的 step 修改**（類似 Typeform 頂部進度條）
- 必填題（Step 1–4）不可跳過；選填題（Step 5–7）可點「跳過」，AI 以預設值或忽略處理
- 旅遊性質、偏好風格等選項類欄位，採插畫卡片呈現（一張卡片一個插畫 + 文字，點擊整張卡片選取），呼應整體溫暖旅遊感設計風格，而非傳統表單 UI
- Onboarding 過程中的暫存答案屬於 client UI state，使用獨立的 Zustand store（如 `useOnboardingStore`）管理，待使用者完成全部 step 後，一次性組成 prompt 送出 `POST /api/trips`

### 5.2 AI 行程產生

**模型選型：Claude Sonnet 4.5**

選型理由：JSON 格式指令遵循穩定、旅遊規劃內容品質高、與現有 Anthropic API 整合一致。Redis cache 攔截重複請求，成本可控，不需為節省成本降級至 Haiku。

**Prompt 設計：**

完整 prompt 設計另見 `AI_Prompt_Design.md`，摘要如下：

| 面向 | 決策 |
|------|------|
| 語言 | 英文 prompt，回傳內容繁體中文（在 Field Rules 明確指定） |
| 格式要求 | JSON schema 範例 + 欄位說明並用 |
| 節點數量 | 每天 3–8 個節點，AI 依旅遊性質、天數彈性判斷密度 |
| 場景切分 | 完全重新產生 / 局部修改（保留原 id）/ JSON 格式修正（內部重試），共用 base prompt + 場景 context block |

- 後端轉發 Claude API（API key 不暴露於 client）
- 使用 **BullMQ** 非同步處理任務
- Frontend 透過 **Supabase Realtime** 接收完成通知
- **Idempotency Key** 防止使用者重複觸發相同請求

**等待畫面：**

AI 產生／重新產生期間（BullMQ 處理可能需 10–30 秒），呈現旅遊主題插畫動畫（如行李箱打包、飛機飛行等），取代制式 loading 圈或骨架屏，呼應整體溫暖旅遊感設計風格。

**即時通知策略：Supabase Realtime（取代自行維護 WebSocket）**

不採用「worker 主動推播給特定 client」的傳統做法，改用 Supabase Realtime 基於 PostgreSQL logical replication 的機制：

```
worker 處理完 job → trip.service 把結果寫入 DB（trips 表 update）
  → Supabase Realtime 監聽該表 row 變化
  → 自動推播給訂閱該 trip_id 的前端 client
```

「通知」這件事被「資料庫寫入」直接觸發，不需要自行管理 client 與 WebSocket connection 的對應關係，worker 端不需要額外的推播步驟。

注意事項：
- 需在 Supabase 後台手動為 `trips`（及需要即時更新的表）開啟 replication，避免不必要的表也被監聽造成效能浪費
- 前端訂閱透過 `@supabase/supabase-js` 的 `channel()` API，而非原生 WebSocket API

**Service 層拆分：**

```
lib/services/
├── trip.service.ts          ← 行程 CRUD 業務邏輯（不含 AI），寫入 DB 即觸發 Realtime 推播
├── ai-generation.service.ts ← 組 prompt、呼叫 Claude API、解析回應
└── cache.service.ts         ← Redis cache 邏輯（key 產生、get/set）
```

**Worker Orchestration 流程：**

```
worker 收到 job
  → cache.service 檢查是否有 cache
  → 沒有 cache → ai-generation.service 呼叫 Claude API
  → trip.service 把結果寫入 DB     ← 寫入本身觸發 Supabase Realtime 推播給前端
```

**錯誤處理策略（分流 + 疊加）：**

AI 回應一律先過 Zod schema 驗證，作為資料正確性的最後防線；不同錯誤類型分流處理：

| 錯誤類型 | 處理方式 |
|---------|---------|
| Rate limit / Timeout（網路層錯誤） | throw 特定 error type，交由 BullMQ 外層重試，搭配 exponential backoff |
| API 回應成功但 Zod 驗證失敗（格式不符） | 不算整個 job 失敗，在 service 內部重新 prompt（夾帶錯誤訊息要求 AI 修正），設內部重試上限，超過才真正 throw 給 BullMQ |
| 驗證成功 | 回傳給 worker，繼續寫入 DB 流程 |

```typescript
// lib/services/ai-generation.service.ts
class AIRateLimitError extends Error {}
class AIValidationError extends Error {}

async function generateTrip(input: TripInput): Promise<TripSchema> {
  const MAX_INTERNAL_RETRIES = 2

  for (let attempt = 0; attempt <= MAX_INTERNAL_RETRIES; attempt++) {
    try {
      const response = await callClaudeAPI(buildPrompt(input, attempt))
      return TripResponseSchema.parse(response) // Zod 驗證
    } catch (err) {
      if (isRateLimitError(err)) throw new AIRateLimitError(err.message)
      if (err instanceof ZodError) {
        if (attempt === MAX_INTERNAL_RETRIES) {
          throw new AIValidationError('AI 多次回傳格式不符')
        }
        continue // 內部重試，prompt 會帶上修正提示
      }
      throw err
    }
  }
}
```

```typescript
// worker
const job = await queue.process(async (job) => {
  const trip = await aiGenerationService.generateTrip(job.data) // 內部重試已處理
  await tripService.saveTrip(trip) // DB 寫入 → Supabase Realtime 自動推播給前端
})
```

`AIRateLimitError` 交由 BullMQ 機制接手做外層重試；`AIValidationError` 超過內部重試上限才真正讓整個 job 失敗，前端可透過訂閱 `ai_generation_jobs.status` 變化得知失敗並提示使用者重新嘗試。

**Redis Cache 策略：**
- 同一 user 在短時間（TTL 5–10 分鐘）內送出相同 prompt，直接回傳 cache
- Cache key：`trip:{userId}:{hash(structuredInput)}`
- 使用結構化輸入欄位做 hash，而非原始文字（避免空白、大小寫差異導致 cache miss）

**AI 回傳 JSON Schema：**

```json
{
  "trip": {
    "title": "東京 3 天 2 夜",
    "days": [
      {
        "day": 1,
        "date": "2025-08-01",
        "events": [
          {
            "id": "uuid",
            "time": "09:00",
            "duration": 90,
            "title": "淺草寺",
            "location": "東京都台東區",
            "description": "...",
            "category": "景點",
            "coordinates": { "lat": 35.7148, "lng": 139.7967 }
          }
        ]
      }
    ]
  }
}
```

### 5.3 行程視覺化

- 以**垂直時間軸**方式呈現每日行程（從上到下捲動，類似手機行程表）
- **跨天切換採頂部 Tab**（Day 1 / Day 2 / Day 3…），一次只顯示一天內容，避免單一畫面塞入過多天數資訊
- 每個行程節點顯示：時間、地點名稱、類別 icon、時長
- 整體設計風格：溫暖旅遊感（手繪風、插畫感），呼應 onboarding 與等待畫面的插畫元素

### 5.4 行程 CRUD

**手勢互動設計（避免與畫面捲動衝突）：**

| 手勢 | 觸發行為 |
|------|---------|
| 一般滑動 | 捲動整個時間軸畫面 |
| 單擊節點 | 彈出小菜單（編輯／刪除／複製／換一個） |
| 長按節點 | 進入拖曳模式（節點浮起、輕微放大、其他節點讓出空間） |

單擊與長按分別對應不同意圖（短按喚出選單、長按進入拖曳），避免單一點擊手勢同時觸發排序與捲動的衝突。

| 操作 | 觸發方式 |
|------|---------|
| 新增 | 點擊 + 按鈕，填入節點資料 |
| 編輯 | 單擊節點 → 小菜單選「編輯」→ 開啟 modal |
| 刪除 | 單擊節點 → 小菜單選「刪除」→ 觸發確認 |
| 複製 | 單擊節點 → 小菜單選「複製」（例如複製景點安排到隔天） |
| 換一個 | 單擊節點 → 小菜單選「換一個」→ AI 產生 3 個備選供使用者挑選 |
| 拖曳排序 | 長按節點觸發，同天內拖曳，或拖曳至其他天 |

### 5.4.1 「換一個」備選功能

所有 category 節點皆可觸發，AI 即時產生 3 個同類型備選供使用者選擇，使用者確認後直接覆蓋原本節點。

**互動流程：**

```
使用者點擊節點 → 小菜單選「換一個」
  → 節點進入 loading 狀態（顯示骨架屏）
  → 呼叫 POST /api/trips/:id/events/:eventId/alternatives
  → AI 回傳 3 個備選選項
  → 節點展開成備選卡片 UI（3 張卡片，可垂直列出或橫向滑動）
  → 使用者選擇其中一張 → 直接覆蓋原節點 → 觸發 debounced batch update
  → 使用者可點「取消」保留原本節點
```

**State 管理（Zustand）：**

備選清單為暫時性 UI 狀態，使用者選完即消失，不寫入 DB：

```typescript
// useAlternativesStore
{
  eventId: string | null,     // 哪個節點正在替換中
  alternatives: TripEvent[], // AI 回傳的 3 個備選
  isLoading: boolean,
}
```

使用者選擇後，將選中備選直接合併進 React Query 的 trip cache，觸發 debounced batch update。

**AI 呼叫設計：**

Request 帶入原節點完整資料 + 前後節點作為地理與時間脈絡（避免 AI 推薦位置不合理的備選）：

```json
{
  "event": { ...原本節點完整資料 },
  "context": {
    "day_date": "2025-08-01",
    "surrounding_events": [...前後節點]
  }
}
```

**`sort_order` 設計：連續整數**

由於採 Debounced Batch Update（整批送出完整順序，而非單筆插入），不需考慮插入間隔留空的問題。每次 batch update 直接將該次順序重新編號（1, 2, 3...）寫回 DB。

**拖曳更新策略：Debounced Batch Update**

- 使用者停止拖曳操作後，送出完整排序（非逐步 call API）
- 新增/編輯/刪除節點同樣統一走這個 batch update endpoint，不另開獨立的 events CRUD endpoint：
  - 理由一：所有操作本來就是「送出整份行程最新狀態」，與逐筆呼叫 API 的設計邏輯衝突，避免前端要判斷「這次操作打哪支 API」
  - 理由二：conflict detection（`client_version`）是針對整份 trip 設計，若 events 走獨立 endpoint，版本控制邏輯要嘛拆到 event 層級（複雜度暴增），要嘛繞過版本檢查（變成漏洞）
- 唯一保留獨立 endpoint 的情境，是語意不適合放進 batch 的操作：AI 重新生成（非同步任務觸發）、刪除整個 trip（對整個資源的操作）

**Payload 結構：**

```json
{
  "client_version": 42,
  "client_modified_at": "2025-06-30T10:23:15.000Z",
  "days": [
    {
      "day_number": 1,
      "events": [
        { "id": "uuid-1", "title": "淺草寺", "event_time": "10:00", "sort_order": 1 },
        { "id": "uuid-2", "title": "晴空塔", "event_time": "14:00", "sort_order": 2 }
      ]
    }
  ]
}
```

Server 收到後**整份覆蓋寫入**（刪除該 trip 底下所有 events，重新 insert），不做逐筆 diff 比對，實作最簡單。

**衝突處理策略：Last-Write-Wins（搭配時間合理性檢查）**

考量目前尚無多裝置同時編輯場景，暫不實作 Three-way Merge（列為 Nice to Have），改用 LWW：

- 判斷基準使用 **client 端操作時的時間戳記**（`client_modified_at`），而非 server 收到請求的時間，避免網路延遲造成誤判
- 比較對象為 DB 現有的 `trips.updated_at`

```
收到 PATCH /api/trips/:id 請求
  → 比較 client_modified_at vs DB 現有的 trips.updated_at
      → client_modified_at 較舊 → 409 Conflict，回傳最新版本，client 需 pull 後重試
      → client_modified_at 較新 →
            → 檢查 client_modified_at 是否超前 server 當下時間 > 5 分鐘
                → 是 → 視為異常，仍接受寫入（不擋使用者操作），記錄 warning log（含 user_id、偏差秒數），供日後除錯回溯
                → 否 → 正常寫入，更新 trips.updated_at = client_modified_at
```

> 此防護目的是可觀測性（未來資料異常時可追溯是否為時間異常造成），非阻擋使用者操作。

### 5.5 重新產生行程

- 使用者可附上備註（如「多安排美食」）重新觸發 AI 產生
- 版本歷史：暫時取捨（Nice to Have）

**Regenerate 模式區分：**

| 模式 | Prompt 內容 | AI 回應 |
|------|------------|---------|
| 完全重新產生 | 僅原始問卷資訊 | 整份新行程 |
| 局部修改（使用者附帶備註） | 問卷資訊 + 當前完整行程 JSON + 使用者備註 | 整份行程 JSON，但 prompt 明確指示「除被要求修改的部分，其餘節點完全保留原樣（包含 id）」 |

即使是局部修改，AI 仍回傳**整份行程 JSON**（而非 diff），維持與手動編輯一致的「整份覆蓋」心智模型，前端與 DB 寫入邏輯不需為 regenerate 另開特殊處理路徑。改動範圍完全依賴 prompt 指示控制，不依賴程式邏輯做欄位層級的合併。

**AI Regenerate 與手動編輯的 Race Condition 處理：**

UI 層在 regenerate 進行中時，鎖定 event node 編輯操作作為第一道防線。Server 端另以 `ai_generation_jobs.status` 作為權威判斷，確保 regenerate 結果權重高於手動編輯：

```
手動編輯（PATCH /api/trips/:id）：
  → 收到請求時，先檢查該 trip 是否存在 status = 'processing' 的 job
      → 有 → 直接拒絕，回傳 409（regenerate 進行中，不接受手動編輯）
      → 沒有 → 正常走 client_modified_at 比對流程（見上方 LWW 策略）

AI Regenerate worker 寫入結果：
  → 不檢查 client_version / client_modified_at，直接覆蓋寫入（regenerate 權重最高）
  → 寫入後 trips.version += 1，使任何仍在等待中的手動編輯請求，下次送出時因版本落後被拒絕
```

---

## 5.6 行程分享

### 分享形式

| 形式 | 說明 |
|------|------|
| 分享連結 | 產生永久有效的公開連結，任何人有連結即可開啟，不需登入 |
| 匯出 PDF | 產生完整行程文件，供離線使用或列印 |

### 連結權限設計

- **預設：唯讀**（只能檢視，不能編輯）
- **分享者可開啟共同編輯權限**，對方需登入帳號才能編輯
- 同一個 trip 可同時存在多個 token（如一個唯讀連結給朋友看、一個可編輯連結給隊友共同規劃）
- 分享者可手動停用特定 token

**URL 格式：** `/share/{share_token}`

### 共同編輯衝突策略

共同編輯時維持現行 LWW 策略，但加上 **Supabase Realtime Presence** 警告機制：

```
使用者 A 開啟行程編輯頁
  → 透過 Supabase Realtime Presence 廣播「我在線上」給同一 trip_id 的訂閱者
  → 使用者 B 進入同一行程時，收到 presence 事件
  → 前端顯示警告 banner：「有其他人正在編輯此行程」
  → 不鎖定操作，使用者仍可繼續編輯
  → 使用者 A 離開頁面時，presence 自動移除，警告消失
```

Presence 功能與現有 Supabase Realtime 架構共用，不需額外維運。

### CRDT 未來路線

現行 LWW + Presence 警告為第一階段方案，未來若多人協作需求明確，可引入 **CRDT**（Conflict-free Replicated Data Type）作為根本解法：

- CRDT 將每個操作記錄為「意圖」（如「景點 A 移到景點 B 後面」），合併時依意圖推導最終狀態，不存在覆蓋問題
- 推薦方案：**Yjs**（有 `y-supabase` 社群整合，可直接搭配現有 Supabase 架構）
- 現行資料模型（`sort_order` 為單純整數、`updated_at` 為標準時間戳）未加入 LWW 專屬欄位，保持通用性，未來接入 CRDT 不需更動 schema

### PDF 匯出技術選型

採用 **`@react-pdf/renderer`**，在 server 端 render PDF：

- 可用 React component 語法定義排版，支援自訂插畫元素與整體溫暖旅遊感視覺風格
- 在 server 端處理，不佔用前端效能
- 相較 Puppeteer（headless browser 截圖）更輕量，相較 `jsPDF`（純前端）排版控制更精確



| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/api/trips` | 建立行程（觸發 AI 生成，回傳 job_id） |
| `GET` | `/api/trips` | 取得使用者所有行程列表 |
| `GET` | `/api/trips/:id` | 取得單一行程詳細內容 |
| `PATCH` | `/api/trips/:id` | 更新行程（拖曳排序、節點新增/編輯/刪除皆走此 endpoint，整份覆蓋寫入） |
| `DELETE` | `/api/trips/:id` | 刪除行程 |
| `POST` | `/api/trips/:id/regenerate` | 重新觸發 AI 生成（可附修改備註，做局部修改） |
| `GET` | `/api/jobs/:id` | 查詢 AI 生成任務狀態（搭配 Supabase Realtime，此 endpoint 作為 fallback） |
| `POST` | `/api/trips/:id/shares` | 建立分享 token（指定 permission: view \| edit） |
| `GET` | `/api/trips/:id/shares` | 取得該行程所有分享 token 列表 |
| `DELETE` | `/api/trips/:id/shares/:token` | 停用特定分享 token |
| `GET` | `/api/share/:token` | 以 share token 取得行程內容（不需登入，唯讀） |
| `GET` | `/api/trips/:id/pdf` | 產生並下載行程 PDF |
| `POST` | `/api/trips/:id/events/:eventId/alternatives` | 針對指定節點產生 3 個 AI 備選選項 |

---

## 8. 資料同步策略

- **Local**（IndexedDB）+ **Server DB**（PostgreSQL）雙寫
- 離線時仍可瀏覽已存行程，上線後自動同步
- 衝突解決採 **Last-Write-Wins**（搭配 client 時間戳記合理性檢查），詳見 5.4 節；Three-way Merge 列為 Nice to Have，待多裝置同時編輯場景明確出現後再評估導入
- `trips.version` 欄位搭配 `updated_at` 做 stale update 防護

---

## 9. ER Diagram

> 標註 `[Supabase 託管]` 的表由 Supabase Auth 內部管理，非自建 schema。列出僅為標明欄位對應關係，未來若要脫離 Supabase 自建 auth，這兩張表需要自行實作。

```
┌──────────────────────────┐       ┌──────────────────────────┐
│ auth.users [Supabase 託管]│       │ auth.identities [Supabase託管]│
├──────────────────────────┤       ├──────────────────────────┤
│ id            UUID       │──┐    │ id              UUID      │
│ email         TEXT       │  └───▶│ user_id         UUID (FK) │
│ email_confirmed_at TS    │       │ provider        TEXT      │
│ created_at    TS         │       │ provider_id     TEXT      │
└──────────────────────────┘       │ identity_data   JSONB     │
         │                         └──────────────────────────┘
         │ 1:1 (id 對應)
         ▼
┌─────────────────────┐
│   public.users      │   ← 業務層使用者資料，id 對應 auth.users.id
├─────────────────────┤
│ id            UUID  │
│ name          TEXT  │
│ avatar_url    TEXT  │
│ created_at    TS    │
└─────────────────────┘
         │ 1
         │ ∞
┌─────────────────────┐       ┌──────────────────────────┐
│        trips        │       │    ai_generation_jobs     │
├─────────────────────┤       ├──────────────────────────┤
│ id            UUID  │──┐    │ id              UUID      │
│ user_id       UUID  │  └───▶│ trip_id         UUID (FK) │
│ title         TEXT  │       │ user_id         UUID (FK) │
│ destination   TEXT  │       │ idempotency_key TEXT      │
│ people_count  INT   │       │ status          TEXT      │
│ trip_type     TEXT  │       │ prompt_hash     TEXT      │
│ start_date    DATE  │       │ prompt_input    JSONB     │
│ end_date      DATE  │       │ created_at      TS        │
│ status        TEXT  │       │ completed_at    TS        │
│ version       INT   │       └──────────────────────────┘
│ updated_at    TS    │
│ created_at    TS    │
└─────────────────────┘
         │ 1
         │ ∞
┌─────────────────────┐
│      trip_days      │
├─────────────────────┤
│ id            UUID  │
│ trip_id       UUID  │
│ day_number    INT   │
│ date          DATE  │
└─────────────────────┘
         │ 1
         │ ∞
┌─────────────────────┐
│     trip_events     │
├─────────────────────┤
│ id            UUID  │
│ trip_day_id   UUID  │
│ title         TEXT  │
│ location      TEXT  │
│ description   TEXT  │
│ category      TEXT  │
│ event_time    TIME  │
│ duration_mins INT   │
│ sort_order    INT   │
│ lat           FLOAT │
│ lng           FLOAT │
│ created_at    TS    │
└─────────────────────┘

┌─────────────────────┐
│     trip_shares     │
├─────────────────────┤
│ id            UUID  │
│ trip_id       UUID  │ ← FK → trips
│ share_token   TEXT  │ ← 唯一隨機 token，組成 /share/{token} URL
│ permission    ENUM  │ ← 'view' | 'edit'
│ created_by    UUID  │ ← FK → users
│ is_active     BOOL  │ ← 分享者可手動停用
│ created_at    TS    │
└─────────────────────┘
```

**欄位設計重點：**

- `auth.users` / `auth.identities`：Supabase 託管，負責 OAuth 登入與 account linking，不自行維護
- `public.users.id`：直接沿用 `auth.users.id`（同一個 UUID），不另外產生主鍵，方便 join
- `trip_events.sort_order`：拖曳排序的持久化欄位，batch update 時一併更新
- `trips.version`：搭配 `client_version` payload 做 conflict detection，回傳 409 時 client 重新 pull
- `ai_generation_jobs.idempotency_key`：防止重複觸發相同 AI 請求
- `ai_generation_jobs.prompt_hash`：Redis cache key 的對應，用於追蹤 cache 命中狀況
- `trip_shares.share_token`：唯一隨機 token，組成公開分享 URL（`/share/{token}`），永久有效，可透過 `is_active` 手動停用
- `trip_shares.permission`：`view`（唯讀，不需登入）或 `edit`（共同編輯，需登入），同一 trip 可同時存在多個不同權限的 token

---

## 10. PWA 特別注意事項

- **離線支援**：行程資料存 IndexedDB，Service Worker 處理資產 cache
- **拖曳體驗**：mobile web touch drag 與 native 有差距，PWA 版考慮使用 `@dnd-kit` 並評估體驗接受度
- **Realtime 背景斷線**：PWA 背景時 Supabase Realtime 連線同樣會被瀏覽器切斷，回到前景時需重新訂閱 channel；AI 產生完成的最終狀態仍可透過重新訂閱後讀取 `ai_generation_jobs.status` 補上，不會遺漏

---

## 11. Nice to Have（未來功能）

- 衝突偵測（行程時間重疊提示）
- 地圖視圖（一日行程標示於地圖）
- 版本歷史（Snapshot + gzip 壓縮儲存）
- 多裝置即時協作 CRDT（Yjs + y-supabase，取代現行 LWW 策略，參見 5.6 節）
- 行程圖片匯出（長圖或每日一張，可分享至 IG/LINE）
