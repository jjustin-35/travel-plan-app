# trip-regenerate 重新產生行程

## User Story

作為旅人，我想在現有行程上重新觸發 AI（可附備註做局部調整），以便在不重填問卷的情況下得到更新後的行程。

## Acceptance criteria

- 行程頁可觸發「重新產生」；可附使用者備註
- `POST /api/trips/:id/regenerate`：完整重產或帶 notes 的局部修改（回傳整份 JSON，保留未改節點 id）
- Regenerate 進行中：UI 鎖定節點編輯；server 拒絕手動 PATCH（409）
- Worker/同步寫入結果時不走 LWW client_version 檢查，寫入後 `trips.version` 遞增
- 產生中顯示等待動畫；完成後時間軸更新

## Out of scope

- 版本歷史 / 還原上一版（Nice to Have）
- Diff-only API（一律整份行程覆蓋）

## Technical choice

None（Gemini regenerate context block；見 `AI_Prompt_Design.md`）

## Implementation

- Features to build: regenerate API、prompt context、UI trigger + notes、lock while processing
- Expected UI: 行程頂部「重新產生」；可輸入備註；進行中 LoadingAnimation
- Apps and routes to change:
  - `src/app/api/trips/[id]/regenerate/route.ts`
  - `src/lib/services/ai-generation.service.ts`
  - `src/app/(app)/trips/[id]/page.tsx`

## Feature toggles, APIs, and permissions

- Auth + ownership
- `POST /api/trips/:id/regenerate` body: optional `{ notes?: string, input?: TripInput }`；未傳 `input` 時由現有 trip 欄位組裝
- 現況 regenerate 路由以同步 Gemini 為主（與 create 的 BullMQ 分流不一定相同）

## Public interface

- `generateTrip(input, …)` with regenerate context (`currentTrip` + `userNotes`)
- Regenerate route updates trip days/events and status
- Trip page: regenerate control disables edit gestures while `generating`/`processing`

## Implementation steps

1. Regenerate prompt context block
2. API route + job/sync write path
3. Block PATCH while processing
4. Trip page UI + loading + Realtime refresh

## Test plan

### Unit test

- Regenerate prompt includes notes + preserves id instructions
- PATCH rejected when job processing
- Service overwrite increments version

### Scope summary
- App: Next.js PWA (+ optional worker)
- Key paths: `src/app/api/trips/[id]/regenerate/`, `src/lib/services/ai-generation.service.ts`, trip detail page

### Feature / behavior summary
- 一鍵重產或依備註局部調整
- 進行中鎖定手動編輯
- 完成後整份行程更新

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]
- Auth / tenant / test data: QA 帳號 `justinsqa01@gmail.com`（已登入）、`ready` 行程；Gemini 可用

### E2E test cases

#### TC-01 — 完整重新產生
1. 開啟行程，觸發重新產生（不附備註或清空備註）
2. 等待完成
**Expected:** 行程內容更新為新版本；status 回到 ready

#### TC-02 — 附備註局部修改
1. 重新產生並輸入備註（如「多安排美食」）
2. 等待完成
**Expected:** 行程更新且與備註相關的調整可見；無關節點盡量保留

#### TC-03 — 產生中不可編輯
1. 在 regenerate 進行中嘗試編輯節點
**Expected:** UI 鎖定或儲存失敗提示，不破壞 regenerating 結果

### Negative / edge cases (optional)
- Regenerate 失敗：行程標記 failed 或保留舊資料並提示重試（依實作）
