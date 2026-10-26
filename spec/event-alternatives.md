# event-alternatives 「換一個」AI 備選

## User Story

作為旅人，我想把不滿意的節點換成同類型的其他選項，以便在不重排整天的前提下微調行程。

## Acceptance criteria

- 節點選單「換一個」→ loading → `POST /api/trips/:id/events/:eventId/alternatives`
- AI 回傳恰好 3 個同 category 備選（獨立 alternatives prompt；帶 surrounding events）
- Zod `AlternativeEventsSchema`（length 3）；失敗內部重試後仍失敗則對使用者顯示錯誤
- UI 展開 3 張備選卡；選一張覆蓋原節點並觸發 batch PATCH；可取消保留原節點
- 備選狀態存在 Zustand `useAlternativesStore`，不寫入 DB 直到使用者確認

## Out of scope

- 一次替換多個節點
- 備選結果持久化歷史

## Technical choice

None（Gemini + 既有 Zod；獨立 prompt 見 `AI_Prompt_Design.md`）

## Implementation

- Features to build: alternatives API、prompt、store、AlternativesPanel UI
- Expected UI: 原節點位置展開 3 卡 + 取消；選中後收合為新節點
- Apps and routes to change:
  - `src/app/api/trips/[id]/events/[eventId]/alternatives/route.ts`
  - `src/lib/services/ai-generation.service.ts`（alternatives prompt）
  - `src/stores/alternatives.store.ts`
  - `src/components/trip/AlternativesPanel.tsx`
  - wired from trip detail / EventContextMenu

## Feature toggles, APIs, and permissions

- Auth + trip ownership
- `POST /api/trips/:id/events/:eventId/alternatives`
- Env: `GEMINI_API_KEY`

## Public interface

- `useAlternativesStore`: `{ eventId, alternatives, isLoading }` + load/select/cancel actions
- `AlternativesPanel` props: alternatives list, onSelect, onCancel
- API returns array of 3 `TripEvent`

## Implementation steps

1. Alternatives prompt + Zod length(3)
2. API route with context (day + surrounding)
3. Store + panel UI
4. On select → merge into trip cache → debounced PATCH

## Test plan

### Unit test

- Alternatives prompt/parse length 3
- Store loading / select / cancel transitions
- AlternativesPanel select/cancel callbacks

### Scope summary
- App: Next.js PWA
- Key paths: `src/app/api/trips/[id]/events/[eventId]/alternatives/`, `src/stores/alternatives.store.ts`, `src/components/trip/AlternativesPanel.tsx`

### Feature / behavior summary
- 對單一節點取得 3 個同類型備選
- 選擇後覆蓋原節點
- 可取消不變更

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]
- Auth / tenant / test data: QA 帳號 `justinsqa01@gmail.com`（已登入）、`ready` 行程；有效 Gemini key（或 mock API）

### E2E test cases

#### TC-01 — 選擇備選覆蓋
1. 開啟行程，單擊節點 → 換一個
2. 等待 3 張卡出現，點其中一張「選擇」
**Expected:** 原位置變為所選備選；取消鈕消失

#### TC-02 — 取消備選
1. 觸發「換一個」並等到備選出現
2. 點「取消」
**Expected:** 恢復原節點內容

### Negative / edge cases (optional)
- AI 失敗：顯示「目前無法產生備選，請稍後再試」，原節點可繼續操作
