# 旅路 — AI 行程規劃 App

以 AI 為核心的旅遊行程規劃 PWA，使用者輸入旅遊基本資訊後，Claude AI 自動產生視覺化行程，並支援手動調整。

## 技術棧

- **框架**: Next.js 15 (App Router) + TypeScript
- **樣式**: Tailwind CSS v4
- **Auth**: Supabase Auth (Google OAuth)
- **DB**: Supabase PostgreSQL + Prisma v5
- **AI**: Claude Sonnet 4.5 (Anthropic)
- **Queue**: BullMQ + Redis
- **State**: React Query + Zustand
- **PWA**: next-pwa + IndexedDB

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.local.example .env.local
# 填入 SUPABASE_URL、SUPABASE_ANON_KEY、ANTHROPIC_API_KEY

# 3. 執行 DB Migration（需先在 .env.local 設定 DATABASE_URL 和 DIRECT_URL）
# DATABASE_URL: Supabase > Project Settings > Database > Transaction mode connection string
# DIRECT_URL: Supabase > Project Settings > Database > Session mode connection string
npx prisma migrate dev --name init

# 4. 在 Supabase SQL Editor 執行 trigger
# 複製 supabase/seed.sql 內容貼上執行

# 5. 啟動開發伺服器
npm run dev
```

## 開發文件

- [PRD](docs/PRD_AI_Trip_Planner.md)
- [AI Prompt 設計](docs/AI_Prompt_Design.md)
- [UI Wireframe](docs/UI_Wireframe_Prompts.md)
