# trip-list-home 行程列表首頁

## User Story

作為已登入旅人，我想在首頁看到即將到來與過去的行程，並快速開始新規劃。

## Acceptance criteria

- `/` 顯示品牌「旅路」、使用者問候與頭像區
- 行程依結束日分為「即將到來」與「過去」
- 空狀態引導點右下角 + 開始規劃
- 行程卡片顯示標題、日期區間、人數、旅遊性質等摘要；點擊進入 `/trips/[id]`
- FAB `+` 進入 `/onboarding`

## Out of scope

- 搜尋已存行程（UI wireframe 可選，目前非必須）
- 「有人正在編輯」Presence badge（PRD 5.6，未實作）
- 完整個人設定頁

## Technical choice

None

## Implementation

- Features to build: server-rendered trip list、TripCard、AddFab、empty state
- Expected UI: App 首頁 `/`；暖色列表；右下 FAB
- Apps and routes to change:
  - `src/app/(app)/page.tsx`
  - `src/components/trip/TripCard.tsx`
  - `src/components/ui/AddFab.tsx`
  - `listTrips` in `trip.service.ts`

## Feature toggles, APIs, and permissions

- Auth required
- Data via `listTrips(userId)` / `GET /api/trips` for client refetch if used
- 無 feature toggle

## Public interface

- `listTrips(userId)`
- `TripCard` props: trip summary fields (`id`, `title`, `destination`, dates, `peopleCount`, `tripType`, `status`)
- `AddFab` navigates to onboarding

## Implementation steps

1. Fetch user trips on home
2. Split upcoming / past
3. TripCard + empty state + FAB

## Test plan

### Unit test

- TripCard renders title/dates/labels
- Upcoming vs past filtering logic if extracted
- Empty state copy

### Scope summary
- App: Next.js PWA
- Key paths: `src/app/(app)/page.tsx`, `src/components/trip/TripCard.tsx`, `src/components/ui/AddFab.tsx`

### Feature / behavior summary
- 首頁總覽個人行程
- 空狀態引導建立第一趟旅程
- + 開始 onboarding

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]
- Auth / tenant / test data: QA 帳號 `justinsqa01@gmail.com`（已登入）；至少 0 / 1 / 多筆行程樣本

### E2E test cases

#### TC-01 — 空狀態
1. 以無行程帳號登入開啟 `/`
**Expected:** 顯示「還沒有行程」引導與 FAB

#### TC-02 — 開啟現有行程
1. 以有行程帳號開啟 `/`
2. 點一張 TripCard
**Expected:** 進入 `/trips/[id]`

#### TC-03 — 建立新行程入口
1. 在首頁點 FAB +
**Expected:** 進入 `/onboarding`

### Negative / edge cases (optional)
- `status=failed` 的行程仍出現在列表且可點入查看/重試（行為依實作）
