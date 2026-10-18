# trip-share-and-pdf 行程分享與 PDF 匯出

## User Story

作為行程擁有者，我想產生分享連結並匯出 PDF，以便讓朋友檢視行程或離線列印。

## Acceptance criteria

- 分享頁 `/trips/[id]/share`：建立/列表/複製/停用（刪除）分享連結
- 公開頁 `/share/[token]`：有效 token 可**免登入**唯讀檢視行程
- 目前建立分享預設 `permission: view`（schema 支援 `edit`，UI/API 尚未完整開放共同編輯）
- PDF：使用 `@react-pdf/renderer` **於 client** 下載（`PdfDownloadButton` / `TripPdfDocument`），**非** PRD 的 `GET /api/trips/:id/pdf` server endpoint

## Out of scope

- 可編輯分享連結完整流程（登入後共同編輯）
- Supabase Realtime Presence「有人正在編輯」banner
- CRDT / Yjs
- Server-side PDF API

## Technical choice

- Client PDF via `@react-pdf/renderer`（與 PRD server render 路徑不同；以現況為準）

## Implementation

- Features to build: share CRUD APIs、share manage UI、public share page、PDF download button
- Expected UI: 分享設定頁連結列表 + 複製/停用；公開頁唯讀時間軸；匯出 PDF 區塊
- Apps and routes to change:
  - `src/app/(app)/trips/[id]/share/page.tsx`
  - `src/app/share/[token]/page.tsx`
  - `src/app/api/trips/[id]/shares/route.ts`
  - `src/app/api/trips/[id]/shares/[shareId]/route.ts`
  - `src/app/api/share/[token]/route.ts`
  - `src/components/trip/PdfDownloadButton.tsx`, `TripPdfDocument.tsx`

## Feature toggles, APIs, and permissions

- Owner APIs require auth:
  - `GET/POST /api/trips/:id/shares`
  - `DELETE /api/trips/:id/shares/:shareId`
- Public: `GET /api/share/:token` and page `/share/:token`（no login）
- Inactive token → 404 / unavailable

## Public interface

- Share create returns `{ share: { id, shareToken, permission, … } }`
- `PdfDownloadButton` props: trip title + days/events data for document
- Public share page renders read-only timeline

## Implementation steps

1. `trip_shares` model + create/list/deactivate
2. Public token resolve + read-only UI
3. Share manage page (copy link, delete)
4. Client PDF document + download button

## Test plan

### Unit test

- Share token create/deactivate repository or route auth checks
- Public token inactive → not found
- TripPdfDocument renders title/days without crashing

### Scope summary
- App: Next.js PWA
- Key paths: `src/app/(app)/trips/[id]/share/`, `src/app/share/[token]/`, `src/app/api/**/shares*`, `src/app/api/share/`, PDF components

### Feature / behavior summary
- 產生可複製的唯讀分享連結
- 可停用連結
- 匯出行程 PDF

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]
- Auth / tenant / test data: QA 帳號 `justinsqa01@gmail.com`（擁有者）+ 一筆 ready 行程；無登入的第二瀏覽器/隱私視窗

### E2E test cases

#### TC-01 — 建立並複製分享連結
1. 登入開啟 `/trips/[id]/share`
2. 建立新連結並複製
**Expected:** 剪貼簿為 `{origin}/share/{token}`

#### TC-02 — 未登入開啟分享頁
1. 無 session 開啟剛建立的 `/share/{token}`
**Expected:** 可唯讀看到行程內容，無需登入

#### TC-03 — 停用連結
1. 在分享頁停用/刪除該連結
2. 再開同一 URL
**Expected:** 無法檢視行程（404 或失效頁）

#### TC-04 — 匯出 PDF
1. 在分享頁點匯出 PDF
**Expected:** 瀏覽器觸發 PDF 下載，檔名含行程標題

### Negative / edge cases (optional)
- 非擁有者呼叫 shares API → 401/404
- 隨機 token → 不可看他人行程
