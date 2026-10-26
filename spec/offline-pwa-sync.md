# offline-pwa-sync PWA 離線快取與同步

## User Story

作為旅人，我想在短暫離線時仍能瀏覽已載入的行程，並在恢復連線後與伺服器同步，以便在旅途中不穩網路下使用。

## Acceptance criteria

- PWA：`next-pwa` + Service Worker 快取靜態資產（`public/sw.js` / registrar）
- 行程資料可寫入 IndexedDB（`idb`）；線上拉取成功時更新本地 cache
- 離線時可讀取已快取行程；上線後依 LWW（`client_modified_at` vs `updated_at`）同步，衝突 409 則 pull 重試
- App 回前景時需能恢復資料訂閱／補抓 job 狀態（Realtime 可能被瀏覽器切斷）

## Out of scope

- 完整離線新增行程並離線觸發 AI
- Three-way merge
- Native mobile SQLite（階段二）

## Technical choice

None（`idb` + `next-pwa`；衝突策略同行程 PATCH）

## Implementation

- Features to build: IndexedDB schema helpers、useOfflineSync hook、SW registrar
- Expected UI: 無獨立設定頁；離線時仍可開已快取行程詳情（降級行為）
- Apps and routes to change:
  - `src/lib/db/idb.ts`
  - `src/hooks/useOfflineSync.ts`
  - `src/components/ui/ServiceWorkerRegistrar.tsx`
  - `public/sw.js`, `public/manifest.json`
  - trip detail page integration

## Feature toggles, APIs, and permissions

- 無 toggle
- Sync uses existing `PATCH/GET /api/trips/:id`
- SW 僅在支援的瀏覽器註冊

## Public interface

- `idb`: save/get/list cached trips helpers
- `useOfflineSync(tripId)` — cache on fetch; flush pending patches when online
- `ServiceWorkerRegistrar` — register SW on client

## Implementation steps

1. IndexedDB trip cache API
2. Hook: cache server trip; queue local edits; flush on online
3. SW + manifest + registrar
4. Handle 409 by refetch

## Test plan

### Unit test

- idb save/get roundtrip（fake-indexeddb）
- useOfflineSync caches on data arrival and attempts flush when online
- ServiceWorkerRegistrar registers once

### Scope summary
- App: Next.js PWA
- Key paths: `src/lib/db/idb.ts`, `src/hooks/useOfflineSync.ts`, `src/components/ui/ServiceWorkerRegistrar.tsx`, `public/sw.js`

### Feature / behavior summary
- 已載入行程可離線瀏覽
- 恢復連線後同步變更
- 可安裝為 PWA（manifest）

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]（注意 dev 下 PWA/SW 行為可能與 prod 不同）
- Auth / tenant / test data: QA 帳號 `justinsqa01@gmail.com`（已登入）且曾成功開啟至少一筆行程；*TBD* 是否需 `next start` 驗證 SW

### E2E test cases

#### TC-01 — 線上載入後離線仍可開啟
1. 登入並開啟行程詳情（確保已快取）
2. 切換瀏覽器離線
3. 重新整理或再次進入該行程
**Expected:** 仍可看到先前快取的行程內容（或明確離線提示但不白屏）

#### TC-02 — 恢復連線後資料可用
1. 離線狀態結束後恢復 online
2. 再開行程或停留於行程頁
**Expected:** 可再次與 server 互動（例如成功儲存一筆小編輯）

### Negative / edge cases (optional)
- 從未開啟過的行程在離線時無法載入
- 衝突 409 時提示重新載入而非靜默覆蓋
