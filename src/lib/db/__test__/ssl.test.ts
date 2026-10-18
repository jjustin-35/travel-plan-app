import { describe, expect, it } from "vitest";

import { getDatabaseSslConfig } from "@/lib/db/ssl";

describe("getDatabaseSslConfig", () => {
  it("keeps certificate verification enabled for remote URLs with localhost in query params", () => {
    const ssl = getDatabaseSslConfig(
      "postgresql://user:pass@db.example.com:5432/app?application_name=localhost",
      {}
    );

    expect(ssl).toBe(true);
  });

  it("keeps custom CA verification for remote URLs with local-looking query params", () => {
    const ssl = getDatabaseSslConfig(
      "postgresql://user:pass@db.example.com:5432/app?target=127.0.0.1",
      { DATABASE_SSL_CA: "ca-cert" }
    );

    expect(ssl).toEqual({ ca: "ca-cert" });
  });

  it("allows explicitly disabled certificate verification", () => {
    const ssl = getDatabaseSslConfig("postgresql://user:pass@db.example.com/app", {
      DATABASE_SSL_REJECT_UNAUTHORIZED: "false",
    });

    expect(ssl).toEqual({ rejectUnauthorized: false });
  });

  it("uses the local database SSL behavior only for local hostnames", () => {
    const ssl = getDatabaseSslConfig("postgresql://user:pass@localhost:5432/app", {});

    expect(ssl).toEqual({ rejectUnauthorized: false });
  });
});
