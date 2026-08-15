import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig, type PrismaConfig } from "prisma/config";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const directUrl = process.env.DIRECT_URL;

const prismaConfig = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(directUrl
    ? {
        datasource: {
          // Use direct connection for Prisma CLI (migrate, db push).
          url: directUrl,
        },
      }
    : {}),
} satisfies PrismaConfig;

export default defineConfig(prismaConfig);
