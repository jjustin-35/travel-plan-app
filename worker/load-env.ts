import { config } from "dotenv";
import { resolve } from "path";

// Load env vars as a side effect on import. This module MUST be imported
// before any module that reads process.env (e.g. the Prisma client), because
// ES module imports are hoisted and evaluated before the importing module body.
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });
