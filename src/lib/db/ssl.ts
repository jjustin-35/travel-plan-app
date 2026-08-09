import type { PoolConfig } from "pg";

type DatabaseSslEnv = {
  DATABASE_SSL_CA?: string;
  DATABASE_SSL_REJECT_UNAUTHORIZED?: string;
};

export function getDatabaseSslConfig(
  connectionString: string,
  env: DatabaseSslEnv = process.env
): PoolConfig["ssl"] {
  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  if (isLocal) {
    return undefined;
  }

  if (env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false") {
    return { rejectUnauthorized: false };
  }

  if (env.DATABASE_SSL_CA) {
    return {
      ca: env.DATABASE_SSL_CA,
    };
  }

  return true;
}
