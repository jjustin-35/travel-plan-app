# Playwright E2E

## Auth (storageState)

Authenticated cases need a saved browser session (Google OAuth cannot be automated reliably).

1. Start the app: `npm run dev`
2. Run the interactive setup and complete Google login in the opened browser:

```bash
npx playwright test e2e/auth.setup.ts --headed
```

3. Session is written to `e2e/.auth/user.json` (gitignored). Override with `E2E_STORAGE_STATE`.

## Run

```bash
npm run test:e2e
npm run test:e2e:ui
```

`webServer` starts `npm run dev` when nothing is already listening on `http://localhost:3000`.
