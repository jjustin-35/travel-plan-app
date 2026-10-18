# onboarding-flow 行程建立前 Onboarding 問卷

## User Story

作為旅人，我想用一步一題的問卷填寫旅遊資訊，以便 AI 依我的條件產生行程。

## Acceptance criteria

- 7 個 step：目的地、日期（天數/夜數）、人數、旅遊性質、預算（可跳過）、偏好風格（可跳過）、其他要求（可跳過）
- 頂部進度條可點回已完成 step 修改
- Step 1–4 必填不可跳過；Step 5–7 可「跳過」
- 完成後顯示摘要頁，確認後送出 `POST /api/trips`
- 問卷暫存於 Zustand `useOnboardingStore`，送出後可 reset

## Out of scope

- 熱門目的地建議卡片的後端資料源（UI 可有靜態建議）
- 地圖選點輸入目的地

## Technical choice

None（Zustand client state）

## Implementation

- Features to build: step UI、進度條、摘要頁、組裝 `TripInput` 送 API
- Expected UI: `/onboarding`；Typeform 式一次一題；插畫卡片選項（性質/風格）
- Apps and routes to change:
  - `src/app/(app)/onboarding/page.tsx`
  - `src/components/onboarding/*`
  - `src/stores/onboarding.store.ts`
  - `src/lib/schemas/trip.schema.ts`（`TripInputSchema`）

## Feature toggles, APIs, and permissions

- Requires authenticated user
- `POST /api/trips` body: `TripInput`
- 無 feature toggle

## Public interface

- `useOnboardingStore`: `setDestination`, `setDates`, `setPeopleCount`, `setTripType`, `setBudgetRange`, `toggleStyle`, `setSpecialRequirements`, `toTripInput`, `reset`, step navigation
- Components: `ProgressBar`, `StepDestination`, `StepDates`, `StepPeople`, `StepTripType`, `StepBudget`, `StepStyles`, `StepRequirements`, `SummaryPage`
- `TripInputSchema` validates payload before/at API

## Implementation steps

1. Onboarding store + `toTripInput`
2. Seven step components + progress bar
3. Validation for required steps; skip for optional
4. Summary page submits to create-trip API
5. Navigate to trip detail / loading state after success

## Test plan

### Unit test

- Store date → days/nights calculation
- `toTripInput` shape matches schema
- Progress / step validity (required vs optional)
- SummaryPage submit payload

### Scope summary
- App: Next.js PWA
- Key paths: `src/app/(app)/onboarding/`, `src/components/onboarding/`, `src/stores/onboarding.store.ts`

### Feature / behavior summary
- 一步一題收集旅遊條件
- 選填題可跳過
- 摘要確認後觸發 AI 建立行程

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]
- Auth / tenant / test data: QA 帳號 `justinsqa01@gmail.com`（已登入）；AI/DB 可用（或 mock）

### E2E test cases

#### TC-01 — 完成必填並送出
1. 登入後從首頁點 + 進入 `/onboarding`
2. 填 Step 1–4，Step 5–7 跳過，於摘要按送出
**Expected:** 成功建立行程並進入行程頁或產生中狀態

#### TC-02 — 進度條跳回修改
1. 前進到 Step 4
2. 點進度條回到 Step 1，修改目的地後再前進
**Expected:** 目的地更新反映在後續摘要

#### TC-03 — 必填未完成不可下一步
1. 在 Step 1 不填目的地
2. 嘗試下一步
**Expected:** 無法進入 Step 2（按鈕 disabled 或同等阻擋）

### Negative / edge cases (optional)
- 結束日早於開始日不可通過日期 step
- 人數 < 1 不可下一步
