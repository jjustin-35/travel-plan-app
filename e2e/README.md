# Playwright E2E

## Auth (storageState)

Authenticated cases need a saved browser session (Google OAuth cannot be automated reliably).

Google often blocks Playwright’s **bundled Chromium** as an “unsafe browser”. Auth setup therefore launches your installed **Google Chrome** (`channel: "chrome"`).

1. Install [Google Chrome](https://www.google.com/chrome/) if needed.
2. Start the app: `npm run dev` (optional; Playwright can start it via `webServer`).
3. Run interactive auth setup:

```bash
yarn test:e2e:auth
```

4. In the opened Chrome window, complete Google login for the app.
5. Session is written to `e2e/.auth/user.json` (gitignored). Override with `E2E_STORAGE_STATE`.

If Google still blocks login:

- Prefer a personal / non–high-risk Google account for local E2E.
- Log in once in normal Chrome to `http://localhost:3000`, then try setup again (same machine / IP helps).
- As a last resort, launch Chrome with remote debugging and reuse that profile (advanced).

## Run

```bash
npm run test:e2e
npm run test:e2e:ui
```

`webServer` starts `npm run dev` when nothing is already listening on `http://localhost:3000`.
