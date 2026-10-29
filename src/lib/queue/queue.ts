import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return _connection;
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
    specialRequirements?: string;
  };
  idempotencyKey: string;
};

let tripQueue: Queue<TripGenerationJobData> | null = null;

export function getTripQueue(): Queue<TripGenerationJobData> {
  if (!tripQueue) {
    tripQueue = new Queue("trip-generation", {
      connection: getRedisConnection() as unknown as ConnectionOptions,
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
