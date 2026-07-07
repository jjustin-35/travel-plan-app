import { describe, it, expect, beforeEach } from "vitest";
import { useOnboardingStore } from "@/stores/onboarding.store";

describe("useOnboardingStore", () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it("starts at step 1 with default values", () => {
    const state = useOnboardingStore.getState();
    expect(state.currentStep).toBe(1);
    expect(state.destination).toBe("");
    expect(state.peopleCount).toBe(2);
    expect(state.preferredStyles).toEqual([]);
  });

  it("navigates steps within bounds", () => {
    const { nextStep, prevStep, setStep } = useOnboardingStore.getState();
    nextStep();
    expect(useOnboardingStore.getState().currentStep).toBe(2);
    prevStep();
    expect(useOnboardingStore.getState().currentStep).toBe(1);
    setStep(99);
    expect(useOnboardingStore.getState().currentStep).toBe(8);
    setStep(0);
    expect(useOnboardingStore.getState().currentStep).toBe(1);
  });

  it("calculates days and nights from dates", () => {
    useOnboardingStore.getState().setDates("2026-04-01", "2026-04-05");
    const state = useOnboardingStore.getState();
    expect(state.days).toBe(5);
    expect(state.nights).toBe(4);
  });

  it("toggles preferred styles", () => {
    const { toggleStyle } = useOnboardingStore.getState();
    toggleStyle("美食");
    expect(useOnboardingStore.getState().preferredStyles).toEqual(["美食"]);
    toggleStyle("美食");
    expect(useOnboardingStore.getState().preferredStyles).toEqual([]);
  });

  it("converts state to TripInput with optional fields omitted when empty", () => {
    useOnboardingStore.getState().setDestination("東京");
    useOnboardingStore.getState().setDates("2026-04-01", "2026-04-05");
    useOnboardingStore.getState().setTripType("自由行");

    const input = useOnboardingStore.getState().toTripInput();
    expect(input.destination).toBe("東京");
    expect(input.days).toBe(5);
    expect(input.budgetRange).toBeUndefined();
    expect(input.preferredStyles).toBeUndefined();
    expect(input.preferredTransportModes).toBeUndefined();
    expect(input.specialRequirements).toBeUndefined();
  });

  it("toggles preferred transport modes", () => {
    const { toggleTransportMode } = useOnboardingStore.getState();
    toggleTransportMode("大眾運輸");
    expect(useOnboardingStore.getState().preferredTransportModes).toEqual([
      "大眾運輸",
    ]);
    toggleTransportMode("大眾運輸");
    expect(useOnboardingStore.getState().preferredTransportModes).toEqual([]);
  });

  it("includes optional fields in TripInput when set", () => {
    useOnboardingStore.getState().setDestination("東京");
    useOnboardingStore.getState().setDates("2026-04-01", "2026-04-05");
    useOnboardingStore.getState().setTripType("自由行");
    useOnboardingStore.getState().setBudgetRange("中等");
    useOnboardingStore.getState().toggleStyle("美食");
    useOnboardingStore.getState().toggleTransportMode("步行");
    useOnboardingStore.getState().setSpecialRequirements("素食");

    const input = useOnboardingStore.getState().toTripInput();
    expect(input.budgetRange).toBe("中等");
    expect(input.preferredStyles).toEqual(["美食"]);
    expect(input.preferredTransportModes).toEqual(["步行"]);
    expect(input.specialRequirements).toBe("素食");
  });

  it("resets to initial state", () => {
    useOnboardingStore.getState().setDestination("大阪");
    useOnboardingStore.getState().nextStep();
    useOnboardingStore.getState().reset();
    const state = useOnboardingStore.getState();
    expect(state.destination).toBe("");
    expect(state.currentStep).toBe(1);
  });
});
