import tls from "node:tls";

type PrismaSslConfig =
  | boolean
  | {
      rejectUnauthorized: false;
    }
  | {
      ca: string[];
    };

export function createPrismaSslConfig(
  connectionString: string
): PrismaSslConfig {
  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  if (isLocal || process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false") {
    return { rejectUnauthorized: false };
  }

  if (process.env.DATABASE_SSL_CA) {
    return {
      ca: [...tls.rootCertificates, process.env.DATABASE_SSL_CA],
    };
  }

  return true;
}
