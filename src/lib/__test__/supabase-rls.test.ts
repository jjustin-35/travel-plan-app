import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

const seedSql = readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8");
const migrationsDir = join(process.cwd(), "prisma", "migrations");
const migrationSql = existsSync(migrationsDir)
  ? readdirSync(migrationsDir)
      .filter((entry) => entry.match(/^\d+_/))
      .map((entry) =>
        readFileSync(join(migrationsDir, entry, "migration.sql"), "utf8")
      )
      .join("\n")
  : "";

const protectedTables = [
  "users",
  "trips",
  "trip_days",
  "trip_events",
  "ai_generation_jobs",
  "trip_shares",
];

describe("Supabase RLS bootstrap", () => {
  it("applies RLS for every Prisma-managed public table in migrations", () => {
    for (const table of protectedTables) {
      expect(migrationSql.toLowerCase()).toContain(
        `alter table public.${table} enable row level security;`
      );
    }
  });

  it("does not leave direct table access open to anonymous clients in migrations", () => {
    expect(migrationSql).toMatch(/revoke\s+all\s+on\s+table[\s\S]*from anon;/i);
  });

  it("keeps direct Supabase writes disabled for authenticated browser clients in migrations", () => {
    expect(migrationSql).toMatch(
      /revoke\s+insert,\s+update,\s+delete\s+on\s+table[\s\S]*from authenticated;/i
    );
  });

  it("defines owner-scoped read policies for authenticated clients in migrations", () => {
    expect(migrationSql).toContain('CREATE POLICY "Users can read own profile"');
    expect(migrationSql).toContain('CREATE POLICY "Users can read own trips"');
    expect(migrationSql).toContain('CREATE POLICY "Users can read own trip days"');
    expect(migrationSql).toContain('CREATE POLICY "Users can read own trip events"');
    expect(migrationSql).toContain('CREATE POLICY "Users can read own generation jobs"');
    expect(migrationSql).toContain('CREATE POLICY "Users can read own trip shares"');
  });

  it("keeps the legacy Supabase seed script aligned with migration RLS", () => {
    for (const table of protectedTables) {
      expect(seedSql).toContain(`alter table public.${table} enable row level security;`);
    }
  });
});
