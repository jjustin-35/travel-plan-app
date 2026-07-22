import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const seedSql = readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8");

const protectedTables = [
  "users",
  "trips",
  "trip_days",
  "trip_events",
  "ai_generation_jobs",
  "trip_shares",
];

describe("Supabase RLS bootstrap", () => {
  it("enables RLS for every Prisma-managed public table", () => {
    for (const table of protectedTables) {
      expect(seedSql).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("does not leave direct table access open to anonymous clients", () => {
    expect(seedSql).toMatch(/revoke\s+all\s+on\s+table[\s\S]*from anon;/i);
  });

  it("keeps direct Supabase writes disabled for authenticated browser clients", () => {
    expect(seedSql).toMatch(/revoke\s+insert,\s+update,\s+delete\s+on\s+table[\s\S]*from authenticated;/i);
  });

  it("defines owner-scoped read policies for authenticated clients", () => {
    expect(seedSql).toContain('create policy "Users can read own profile"');
    expect(seedSql).toContain('create policy "Users can read own trips"');
    expect(seedSql).toContain('create policy "Users can read own trip days"');
    expect(seedSql).toContain('create policy "Users can read own trip events"');
    expect(seedSql).toContain('create policy "Users can read own generation jobs"');
    expect(seedSql).toContain('create policy "Users can read own trip shares"');
  });
});
