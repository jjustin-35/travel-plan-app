import { Queue } from "bullmq";
import IORedis from "ioredis";
import { TransportMode } from "../schemas/trip.schema";

let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return _connection;
}

function getConnectionOptions() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as unknown as undefined,
  };
}

export type TripGenerationJobData = {
  tripId: string;
  userId: string;
  input: {
    destination: string;
    startDate: string;
    endDate: string;
    days: number;
    nights: number;
    peopleCount: number;
    tripType: string;
    budgetRange?: string;
    preferredStyles?: string[];
    preferredTransportModes?: TransportMode[];
    specialRequirements?: string;
  };
  idempotencyKey: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tripQueue: Queue<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTripQueue(): Queue<any> {
  if (!tripQueue) {
    tripQueue = new Queue("trip-generation", {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return tripQueue;
}
