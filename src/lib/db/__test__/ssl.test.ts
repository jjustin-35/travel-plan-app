import { describe, expect, it } from "vitest";

import { getDatabaseSslConfig } from "@/lib/db/ssl";

describe("getDatabaseSslConfig", () => {
  it("does not require SSL for localhost Postgres", () => {
    expect(
      getDatabaseSslConfig("postgresql://user:pass@localhost:5432/travel")
    ).toBeUndefined();
  });

  it("does not require SSL for 127.0.0.1 Postgres", () => {
    expect(
      getDatabaseSslConfig("postgresql://user:pass@127.0.0.1:5432/travel")
    ).toBeUndefined();
  });

  it("allows self-signed remote certificates when explicitly configured", () => {
    expect(
      getDatabaseSslConfig("postgresql://user:pass@db.example.com:5432/travel", {
        DATABASE_SSL_REJECT_UNAUTHORIZED: "false",
      })
    ).toEqual({ rejectUnauthorized: false });
  });

  it("uses a provided CA for remote database connections", () => {
    expect(
      getDatabaseSslConfig("postgresql://user:pass@db.example.com:5432/travel", {
        DATABASE_SSL_CA: "test-ca",
      })
    ).toEqual({ ca: "test-ca" });
  });

  it("requires SSL for remote database connections by default", () => {
    expect(
      getDatabaseSslConfig("postgresql://user:pass@db.example.com:5432/travel")
    ).toBe(true);
  });
});
