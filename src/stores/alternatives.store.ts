import { create } from "zustand";
import type { TripEvent } from "@/lib/schemas/trip.schema";

type AlternativesState = {
  eventId: string | null;
  alternatives: TripEvent[];
  isLoading: boolean;
  error: string;
};

type AlternativesActions = {
  startLoading: (eventId: string) => void;
  setAlternatives: (eventId: string, alternatives: TripEvent[]) => void;
  setError: (error: string) => void;
  clear: () => void;
};

const initialState: AlternativesState = {
  eventId: null,
  alternatives: [],
  isLoading: false,
  error: "",
};

export const useAlternativesStore = create<AlternativesState & AlternativesActions>(
  (set) => ({
    ...initialState,
    startLoading: (eventId) =>
      set({ eventId, alternatives: [], isLoading: true, error: "" }),
    setAlternatives: (eventId, alternatives) =>
      set({ eventId, alternatives, isLoading: false, error: "" }),
    setError: (error) => set({ isLoading: false, error }),
    clear: () => set(initialState),
  })
);
