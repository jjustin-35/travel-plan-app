import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queueConstructor: vi.fn(),
  redisConstructor: vi.fn(),
  redisInstances: [] as Array<{ url: string; options: unknown }>,
}));

vi.mock("ioredis", () => ({
  default: vi.fn((url: string, options: unknown) => {
    const instance = { url, options };
    mocks.redisInstances.push(instance);
    mocks.redisConstructor(url, options);
    return instance;
  }),
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn((name: string, options: unknown) => {
    mocks.queueConstructor(name, options);
    return { name, options };
  }),
}));

describe("queue", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.queueConstructor.mockClear();
    mocks.redisConstructor.mockClear();
    mocks.redisInstances = [];
    delete process.env.REDIS_URL;
  });

  it("uses the complete REDIS_URL when creating the BullMQ connection", async () => {
    const redisUrl = "rediss://default:secret@redis.example.com:6380/2";
    process.env.REDIS_URL = redisUrl;

    const { getTripQueue } = await import("@/lib/queue/queue");

    getTripQueue();

    expect(mocks.redisConstructor).toHaveBeenCalledWith(redisUrl, {
      maxRetriesPerRequest: null,
    });
    expect(mocks.queueConstructor).toHaveBeenCalledWith(
      "trip-generation",
      expect.objectContaining({
        connection: mocks.redisInstances[0],
      })
    );
  });
});
