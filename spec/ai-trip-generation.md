# ai-trip-generation AI 行程產生

## User Story

作為旅人，我想在送出問卷後由 AI 自動產生完整日行程，並在等待時看到旅遊感動畫，以便快速得到可編輯的行程草稿。

## Acceptance criteria

- 後端以英文 prompt、要求繁中內容，產生符合 Zod schema 的行程 JSON（每天約 3–8 節點）
- AI 模型為 Google Gemini（`GEMINI_API_KEY` / `GEMINI_MODEL`）；**不以 PRD 的 Claude 為準**
- Zod 驗證失敗時 service 內部重試（format correction）；rate limit 交外層重試/錯誤
- `REDIS_URL` 有值：BullMQ 非同步產生，回傳 `202` + `jobId`；trip `status=generating` → `ready`/`failed`
- `REDIS_URL` 空：同步呼叫 Gemini，`201` 回傳完整 trip
- 可選 Redis cache：相同 user + structured input hash 短 TTL 命中則不重打 AI
- Frontend 訂閱 Supabase Realtime（trips 狀態）並以 `GET /api/jobs/:id` 為 fallback
- 產生中顯示旅遊主題等待動畫（非制式 spinner）

## Out of scope

- Claude Sonnet（PRD 原文；本專案已改 Gemini）
- Bull Board dashboard 部署
- 版本歷史 / snapshot

## Technical choice

- `@google/genai`（Gemini）取代 PRD 的 Claude
- BullMQ + Redis 可選（無 Redis 時走 sync path）

## Implementation

- Features to build: prompt 組裝、Gemini 呼叫、Zod 驗證與重試、queue/worker、cache、loading UI、Realtime 訂閱
- Expected UI: 行程頁在 `generating` 時全頁 `LoadingAnimation`
- Apps and routes to change:
  - `src/lib/services/ai-generation.service.ts`
  - `src/lib/services/cache.service.ts`
  - `src/lib/services/trip.service.ts`
  - `src/lib/queue/queue.ts`, `worker/index.ts`
  - `src/app/api/trips/route.ts`, `src/app/api/jobs/[id]/route.ts`
  - `src/components/trip/LoadingAnimation.tsx`
  - `docs/AI_Prompt_Design.md`（prompt 來源）

## Feature toggles, APIs, and permissions

- Env: `GEMINI_API_KEY`, `GEMINI_MODEL` (optional), `REDIS_URL` (optional)
- `POST /api/trips` — create + generate
- `GET /api/jobs/:id` — job status fallback
- Auth required for create
- Supabase Realtime replication on `trips` (manual project setting) — *TBD* if enabled in all envs

## Public interface

- `generateTrip(input: TripInput): Promise<TripResponse>`
- `TripResponseSchema` / `TripEventSchema`
- `createTrip(userId, input)` — sync orchestration
- Cache key: `trip:{userId}:{hash(structuredInput)}`
- Errors: `AIRateLimitError`, `AIValidationError`

## Implementation steps

1. Schema + prompt templates (generate / format correction)
2. Gemini client + internal validation retries
3. Optional Redis cache
4. Sync create path + async BullMQ path
5. Worker writes days/events, updates trip status
6. Loading UI + Realtime / job polling on trip page

## Test plan

### Unit test

- `generateTrip` success / validation retry / rate-limit error
- Cache get/set key hashing
- Trip create repository mapping from AI response
- LoadingAnimation renders progress copy

### Scope summary
- App: Next.js API + optional Worker
- Key paths: `src/lib/services/ai-generation.service.ts`, `src/lib/queue/`, `worker/`, `src/app/api/trips/`, `src/app/api/jobs/`

### Feature / behavior summary
- 問卷送出後 AI 產生完整行程
- 有 Redis 時背景產生；無 Redis 時同步產生
- 等待畫面為旅遊插畫風格

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]；async 路徑另需 Redis + `npm run worker`
- Auth / tenant / test data: QA 帳號 `justinsqa01@gmail.com`（已登入）；有效 `GEMINI_API_KEY`；*TBD* E2E 是否允許打真實 Gemini 或需 fixture

### E2E test cases

#### TC-01 — 同步產生（無 Redis）
1. 確認 `REDIS_URL` 為空
2. 完成 onboarding 送出
**Expected:** 一段時間後進入行程詳情，可見多日 Tab 與節點

#### TC-02 — 產生中等待畫面
1. 建立行程使 status 為 generating（或減速網路）
2. 開啟該行程頁
**Expected:** 顯示 LoadingAnimation 與進度文案，非空白頁

### Negative / edge cases (optional)
- AI 驗證連續失敗：行程 `failed` 或 API 錯誤，使用者可重試
- Rate limit：回傳可重試錯誤（429）而不崩潰
