import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig, env } from "prisma/config";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use direct connection for Prisma CLI (migrate, db push)
    url: env("DIRECT_URL"),
  },
});
