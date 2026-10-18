# trip-timeline-crud 行程時間軸與節點 CRUD

## User Story

作為旅人，我想用垂直時間軸檢視每日行程，並透過選單、表單與拖曳調整節點，以便微調 AI 草稿。

## Acceptance criteria

- 行程詳情 `/trips/[id]`：頂部標題、Day Tab、垂直時間軸節點（時間、名稱、類別、時長）
- 單擊節點：選單（編輯／複製到其他天／換一個／刪除）
- 編輯：bottom-sheet/modal 表單，儲存後更新本地 cache 並 debounce batch `PATCH /api/trips/:id`
- 新增：FAB `+` 新增節點；刪除需確認
- 長按拖曳同天或跨天排序（`@dnd-kit`）；停止拖曳後 batch update
- Payload 含 `client_version`、`client_modified_at`、完整 `days`；server 整份覆蓋；衝突回 409
- Regenerate/`processing` job 進行中時拒絕手動 PATCH（409）
- 空天顯示引導文案

## Out of scope

- 地圖視圖
- 行程時間重疊衝突提示（Nice to Have）
- Three-way merge / CRDT

## Technical choice

None（既有 `@dnd-kit`、React Query、LWW）

## Implementation

- Features to build: TimelineView、EventCard、context menu、EditEventModal、ConfirmModal、DraggableTimeline、PATCH batch、offline hook 可選
- Expected UI: `/trips/[id]`；Day tabs；右下 +；暖色手帳風節點卡
- Apps and routes to change:
  - `src/app/(app)/trips/[id]/page.tsx`
  - `src/components/trip/TimelineView.tsx`, `EventCard.tsx`, `EventContextMenu.tsx`, `EditEventModal.tsx`, `DraggableTimeline.tsx`, `EventDetailModal.tsx`
  - `src/app/api/trips/[id]/route.ts`
  - `src/lib/db/trip.repository.ts`, `src/lib/trip-patch.ts`
  - `src/hooks/useOfflineSync.ts`（若與編輯同步相關）

## Feature toggles, APIs, and permissions

- Auth required；僅 trip owner（或未來 edit share — 見 share spec）
- `GET/PATCH/DELETE /api/trips/:id`
- 409 on stale `client_modified_at` or AI job processing

## Public interface

- `patchTrip(tripId, userId, clientVersion, clientModifiedAt, days)`
- `updateTripEvents` repository replace-all semantics
- Timeline / EventCard props: event fields + handlers `onEdit|onDelete|onCopy|onAlternative`
- EditEventModal: form fields title, category, time, duration, location, description

## Implementation steps

1. Trip detail fetch + Day tabs + timeline render
2. Context menu + edit/delete/add/copy flows
3. Drag sort with dnd-kit
4. Debounced PATCH with version/timestamp
5. Conflict / regenerating locks on server + UI

## Test plan

### Unit test

- `trip-patch` / version conflict helpers
- EventCard / EventContextMenu actions
- EditEventModal validation
- Timeline empty state
- Repository update reorders `sort_order`

### Scope summary
- App: Next.js PWA
- Key paths: `src/app/(app)/trips/[id]/`, `src/components/trip/`, `src/app/api/trips/[id]/`, `src/lib/trip-patch.ts`

### Feature / behavior summary
- 按天瀏覽垂直時間軸
- 新增/編輯/刪除/複製/拖曳調整行程
- 與 server 以整份行程 batch 同步並處理衝突

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]
- Auth / tenant / test data: QA 帳號 `justinsqa01@gmail.com`（已登入）且擁有一筆 `ready` 行程（含 ≥2 天、每天 ≥1 節點）

### E2E test cases

#### TC-01 — 切換 Day Tab
1. 開啟有多天的行程
2. 點 Day 2
**Expected:** 只顯示 Day 2 節點

#### TC-02 — 編輯節點
1. 單擊節點 → 編輯 → 修改標題 → 儲存
**Expected:** 時間軸顯示新標題；重新整理後仍存在

#### TC-03 — 刪除節點
1. 單擊節點 → 刪除 → 確認
**Expected:** 節點自時間軸移除

#### TC-04 — 拖曳排序
1. 長按節點拖到同天另一位置後放開
**Expected:** 順序更新且重新整理後保持

### Negative / edge cases (optional)
- 過期 version PATCH 回 409，UI 提示重新載入
- AI regenerate 進行中無法手動編輯
