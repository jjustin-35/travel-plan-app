import type { PoolConfig } from "pg";

type DatabaseSslEnv = {
  DATABASE_SSL_CA?: string;
  DATABASE_SSL_REJECT_UNAUTHORIZED?: string;
};

function getDatabaseHostname(connectionString: string): string {
  try {
    const { hostname } = new URL(connectionString);
    return hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return "";
  }
}

export function getDatabaseSslConfig(
  connectionString: string,
  env: DatabaseSslEnv = process.env
): PoolConfig["ssl"] {
  const hostname = getDatabaseHostname(connectionString);
  const isLocal =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (isLocal || env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false") {
    return { rejectUnauthorized: false };
  }

  if (env.DATABASE_SSL_CA) {
    return {
      ca: env.DATABASE_SSL_CA,
    };
  }

  return true;
}
