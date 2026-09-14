import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

type ServiceWorkerListener = (event: {
  request?: {
    url: string;
    mode?: string;
    method?: string;
    destination?: string;
  };
  respondWith?: (response: Promise<Response>) => void;
  waitUntil?: (promise: Promise<unknown>) => void;
}) => void;

function loadServiceWorker() {
  const listeners = new Map<string, ServiceWorkerListener>();
  const addAll = vi.fn().mockResolvedValue(undefined);
  const match = vi.fn();

  const context = {
    URL,
    Response,
    console,
    fetch: vi.fn(),
    caches: {
      open: vi.fn().mockResolvedValue({ addAll }),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
      match,
    },
    self: {
      addEventListener: vi.fn((event: string, listener: ServiceWorkerListener) => {
        listeners.set(event, listener);
      }),
      skipWaiting: vi.fn().mockResolvedValue(undefined),
      clients: {
        claim: vi.fn().mockResolvedValue(undefined),
      },
    },
  };

  const script = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
  vi.stubGlobal("self", context.self);
  vi.stubGlobal("caches", context.caches);
  vi.stubGlobal("fetch", context.fetch);
  runInNewContext(script, context);

  return { ...context, listeners, addAll, match };
}

describe("service worker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not precache authenticated navigation pages", async () => {
    const { listeners, addAll } = loadServiceWorker();
    const install = listeners.get("install");
    expect(install).toBeDefined();

    const pending: Promise<unknown>[] = [];
    install?.({
      waitUntil: (promise) => {
        pending.push(promise);
      },
    });
    await Promise.all(pending);

    expect(addAll).toHaveBeenCalledWith(["/manifest.json"]);
  });

  it("returns a generic offline response instead of cached root for navigation failures", async () => {
    const { fetch, listeners, match } = loadServiceWorker();
    fetch.mockRejectedValue(new Error("offline"));
    const fetchListener = listeners.get("fetch");
    expect(fetchListener).toBeDefined();

    let responsePromise: Promise<Response> | undefined;
    fetchListener?.({
      request: {
        url: "https://example.test/trips/trip-1",
        mode: "navigate",
        method: "GET",
        destination: "document",
      },
      respondWith: (response) => {
        responsePromise = response;
      },
    });

    const response = await responsePromise;
    expect(response?.status).toBe(503);
    expect(await response?.text()).toBe("Offline");
    expect(match).not.toHaveBeenCalledWith("/");
  });
});
