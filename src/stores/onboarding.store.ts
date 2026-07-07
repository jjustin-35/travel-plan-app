import { create } from "zustand";
import { TripInput, TransportMode } from "@/lib/schemas/trip.schema";

type OnboardingState = {
  currentStep: number;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  nights: number;
  peopleCount: number;
  tripType: string;
  budgetRange: string;
  preferredStyles: string[];
  preferredTransportModes: TransportMode[];
  specialRequirements: string;
};

type OnboardingActions = {
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setDestination: (destination: string) => void;
  setDates: (startDate: string, endDate: string) => void;
  setPeopleCount: (count: number) => void;
  setTripType: (type: string) => void;
  setBudgetRange: (range: string) => void;
  toggleStyle: (style: string) => void;
  toggleTransportMode: (mode: TransportMode) => void;
  setSpecialRequirements: (req: string) => void;
  reset: () => void;
  toTripInput: () => TripInput;
};

const TOTAL_STEPS = 8;

const initialState: OnboardingState = {
  currentStep: 1,
  destination: "",
  startDate: "",
  endDate: "",
  days: 0,
  nights: 0,
  peopleCount: 2,
  tripType: "",
  budgetRange: "",
  preferredStyles: [],
  preferredTransportModes: [],
  specialRequirements: "",
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>(
  (set, get) => ({
    ...initialState,

    setStep: (step) => set({ currentStep: Math.min(Math.max(step, 1), TOTAL_STEPS) }),
    nextStep: () =>
      set((s) => ({ currentStep: Math.min(s.currentStep + 1, TOTAL_STEPS) })),
    prevStep: () =>
      set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

    setDestination: (destination) => set({ destination }),

    setDates: (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diff = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      set({ startDate, endDate, days: diff + 1, nights: diff });
    },

    setPeopleCount: (peopleCount) => set({ peopleCount }),
    setTripType: (tripType) => set({ tripType }),
    setBudgetRange: (budgetRange) => set({ budgetRange }),

    toggleStyle: (style) =>
      set((s) => ({
        preferredStyles: s.preferredStyles.includes(style)
          ? s.preferredStyles.filter((x) => x !== style)
          : [...s.preferredStyles, style],
      })),

    toggleTransportMode: (mode) =>
      set((s) => ({
        preferredTransportModes: s.preferredTransportModes.includes(mode)
          ? s.preferredTransportModes.filter((x) => x !== mode)
          : [...s.preferredTransportModes, mode],
      })),

    setSpecialRequirements: (specialRequirements) =>
      set({ specialRequirements }),

    reset: () => set(initialState),

    toTripInput: (): TripInput => {
      const s = get();
      return {
        destination: s.destination,
        startDate: s.startDate,
        endDate: s.endDate,
        days: s.days,
        nights: s.nights,
        peopleCount: s.peopleCount,
        tripType: s.tripType,
        budgetRange: s.budgetRange || undefined,
        preferredStyles:
          s.preferredStyles.length > 0 ? s.preferredStyles : undefined,
        preferredTransportModes:
          s.preferredTransportModes.length > 0
            ? s.preferredTransportModes
            : undefined,
        specialRequirements: s.specialRequirements || undefined,
      };
    },
  })
);

export { TOTAL_STEPS as ONBOARDING_TOTAL_STEPS };
