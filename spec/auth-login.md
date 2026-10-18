# auth-login Supabase Auth 登入

## User Story

作為旅人，我想用 Google 帳號登入「旅路」，以便跨裝置保存並管理我的行程。

## Acceptance criteria

- 未登入使用者造訪受保護頁面時，導向 `/login`
- `/login` 提供 Google OAuth 登入；成功後經 `/auth/callback` 回到 App
- OAuth 成功後，`auth.users` 透過 DB trigger 同步建立/對應 `public.users`（同 UUID）
- 登入後可進入行程列表首頁（`/`）

## Out of scope

- LINE / Facebook 登入（PRD 有提，目前未實作）
- 自行實作 OAuth / account linking（交由 Supabase Auth）
- 個人設定頁完整功能

## Technical choice

None（沿用 Supabase Auth + `@supabase/ssr`）

## Implementation

- Features to build: Google OAuth 登入頁、auth callback、受保護 layout
- Expected UI: `/login` 全頁品牌登入；暖色旅遊感；Google CTA
- Apps and routes to change:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/auth/callback/route.ts`
  - `src/app/(app)/layout.tsx`（auth gate）
  - `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
  - `supabase/seed.sql`（`handle_new_user` trigger）

## Feature toggles, APIs, and permissions

- Supabase project 需啟用 Google provider
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- 無 feature toggle

## Public interface

- `createClient()` (browser / server) — session helpers
- Login page: `handleGoogleLogin` → `signInWithOAuth({ provider: "google" })`
- Callback route exchanges code for session then redirects

## Implementation steps

1. Wire Supabase browser/server clients
2. Login page Google OAuth
3. Auth callback route
4. Protect `(app)` routes; redirect unauthenticated users
5. Ensure DB trigger syncs `public.users`

## Test plan

### Unit test

- Auth helpers / callback error handling where isolated
- Login UI shows error query / OAuth error message when present

### Scope summary
- App: Next.js PWA
- Key paths: `src/app/(auth)/`, `src/lib/supabase/`, `supabase/seed.sql`

### Feature / behavior summary
- Google 一鍵登入進入「旅路」
- 登入後可使用個人行程資料
- 未登入無法使用 onboarding / 行程編輯等受保護流程

### Prerequisites
- Local: [`npm run dev` → http://localhost:3000]
- Auth / tenant / test data: Supabase Google OAuth 已設定；QA 帳號 `justinsqa01@gmail.com`

### E2E test cases

#### TC-01 — 未登入導向登入頁
1. 以無 session 開新瀏覽器造訪 `/`
2. 觀察導向結果
**Expected:** 進入 `/login`（或同等登入閘道）

#### TC-02 — Google 登入成功
1. 開啟 `/login`
2. 點擊 Google 登入並完成 OAuth
**Expected:** 回到 App 首頁，顯示使用者名稱或問候語

### Negative / edge cases (optional)
- OAuth 失敗或取消時，登入頁顯示可理解錯誤，不進入空白頁
- Callback `error` query 時顯示錯誤訊息
