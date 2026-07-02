import { describe, it, expect, beforeEach } from "vitest";
import { useAlternativesStore } from "@/stores/alternatives.store";
import { uiTripEvent } from "@/__test__/fixtures";

describe("useAlternativesStore", () => {
  beforeEach(() => {
    useAlternativesStore.getState().clear();
  });

  it("starts with empty state", () => {
    const state = useAlternativesStore.getState();
    expect(state.eventId).toBeNull();
    expect(state.alternatives).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("");
  });

  it("enters loading state when startLoading is called", () => {
    useAlternativesStore.getState().startLoading("event-1");
    const state = useAlternativesStore.getState();
    expect(state.eventId).toBe("event-1");
    expect(state.isLoading).toBe(true);
    expect(state.alternatives).toEqual([]);
    expect(state.error).toBe("");
  });

  it("stores alternatives after successful fetch", () => {
    const alternatives = [uiTripEvent, { ...uiTripEvent, id: "alt-2", title: "晴空塔" }];
    useAlternativesStore.getState().setAlternatives("event-1", alternatives);
    const state = useAlternativesStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.alternatives).toEqual(alternatives);
    expect(state.error).toBe("");
  });

  it("stores error and stops loading on failure", () => {
    useAlternativesStore.getState().startLoading("event-1");
    useAlternativesStore.getState().setError("無法產生備選");
    const state = useAlternativesStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("無法產生備選");
  });

  it("clears state back to initial", () => {
    useAlternativesStore.getState().startLoading("event-1");
    useAlternativesStore.getState().setAlternatives("event-1", [uiTripEvent]);
    useAlternativesStore.getState().clear();
    const state = useAlternativesStore.getState();
    expect(state.eventId).toBeNull();
    expect(state.alternatives).toEqual([]);
    expect(state.isLoading).toBe(false);
  });
});
