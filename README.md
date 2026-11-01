# 旅路 — AI 行程規劃 App

以 AI 為核心的旅遊行程規劃 PWA，使用者輸入旅遊基本資訊後，Gemini AI 自動產生視覺化行程，並支援手動調整。

## 技術棧

- **框架**: Next.js 15 (App Router) + TypeScript
- **樣式**: Tailwind CSS v4
- **Auth**: Supabase Auth (Google OAuth)
- **DB**: Supabase PostgreSQL + Prisma v7 (`@prisma/adapter-pg`)
- **AI**: Google Gemini (`@google/genai`)
- **Queue**: BullMQ + Redis（production: Upstash；worker: Vercel Daemon）
- **State**: React Query + Zustand
- **PWA**: next-pwa + IndexedDB
- **Deploy**: Vercel（Next.js + `bullmq-worker` Daemon via `Dockerfile.worker`）
## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.local.example .env.local
# 填入 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY、GEMINI_API_KEY

# 3. 產生 Prisma Client 並執行 DB Migration（需先在 .env.local 設定 DATABASE_URL 和 DIRECT_URL）
# DATABASE_URL: Supabase > Project Settings > Database > Transaction mode connection string（執行時連線）
# DIRECT_URL: Supabase > Project Settings > Database > Session mode connection string（migrate 用）
npm run db:generate
npm run db:migrate -- --name init

# 4. 在 Supabase SQL Editor 執行 auth trigger 與 RLS policies
# 複製 supabase/seed.sql 內容貼上執行

# 5. 啟動開發伺服器
npm run dev

# 6.（可選）非同步 AI 產生：設定 REDIS_URL 後另開 worker
npm run worker
```

Production 的 BullMQ worker 由 Vercel Daemon（`vercel.json` → `daemons.bullmq-worker`）以 `Dockerfile.worker` 部署；本機可用 Docker 驗證映像：

```bash
docker build -f Dockerfile.worker -t bullmq-worker .
docker run --env-file .env.local bullmq-worker
```

## 開發文件

- [PRD](docs/PRD_AI_Trip_Planner.md)
- [AI Prompt 設計](docs/AI_Prompt_Design.md)
- [UI Wireframe](docs/UI_Wireframe_Prompts.md)
