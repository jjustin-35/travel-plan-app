import { afterEach, describe, expect, it, vi } from "vitest";

import { createPrismaSslConfig } from "@/lib/db/prisma-ssl";

vi.mock("node:tls", () => ({
  default: {
    rootCertificates: ["default-root-a", "default-root-b"],
  },
}));

const originalEnv = {
  DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
  DATABASE_SSL_REJECT_UNAUTHORIZED:
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
};

describe("createPrismaSslConfig", () => {
  afterEach(() => {
    restoreEnv("DATABASE_SSL_CA", originalEnv.DATABASE_SSL_CA);
    restoreEnv(
      "DATABASE_SSL_REJECT_UNAUTHORIZED",
      originalEnv.DATABASE_SSL_REJECT_UNAUTHORIZED
    );
  });

  it("uses the default trust store when no custom CA is configured", () => {
    expect(
      createPrismaSslConfig("postgresql://user:pass@db.example.com:5432/app")
    ).toBe(true);
  });

  it("adds a custom CA without replacing Node default roots", () => {
    process.env.DATABASE_SSL_CA = "custom-root";

    expect(
      createPrismaSslConfig("postgresql://user:pass@db.example.com:5432/app")
    ).toEqual({
      ca: ["default-root-a", "default-root-b", "custom-root"],
    });
  });

  it("keeps the explicit rejectUnauthorized override ahead of custom CA", () => {
    process.env.DATABASE_SSL_CA = "custom-root";
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = "false";

    expect(
      createPrismaSslConfig("postgresql://user:pass@db.example.com:5432/app")
    ).toEqual({ rejectUnauthorized: false });
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
