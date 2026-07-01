"use client";

import { useOnboardingStore } from "@/stores/onboarding.store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { StepDestination } from "@/components/onboarding/StepDestination";
import { StepDates } from "@/components/onboarding/StepDates";
import { StepPeople } from "@/components/onboarding/StepPeople";
import { StepTripType } from "@/components/onboarding/StepTripType";
import { StepBudget } from "@/components/onboarding/StepBudget";
import { StepStyles } from "@/components/onboarding/StepStyles";
import { StepRequirements } from "@/components/onboarding/StepRequirements";
import { SummaryPage } from "@/components/onboarding/SummaryPage";
import { useMemo, useState } from "react";

const TOTAL_STEPS = 7;
const OPTIONAL_STEPS = new Set([5, 6, 7]);

const STEP_LABELS = [
  "目的地",
  "日期",
  "人數",
  "性質",
  "預算",
  "風格",
  "需求",
];

type StoreState = {
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  peopleCount: number;
  tripType: string;
};

function isStepValid(step: number, store: StoreState): boolean {
  if (step === 1) return store.destination.trim().length > 0;
  if (step === 2) return !!store.startDate && !!store.endDate && store.days > 0;
  if (step === 3) return store.peopleCount >= 1;
  if (step === 4) return store.tripType.length > 0;
  return true; // optional steps always "valid"
}

export default function OnboardingPage() {
  const store = useOnboardingStore();
  const { currentStep, setStep, nextStep, prevStep } = store;
  const [showSummary, setShowSummary] = useState(false);

  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    for (let i = 1; i < currentStep; i++) {
      set.add(i);
    }
    return set;
  }, [currentStep]);

  const canGoNext = isStepValid(currentStep, store);
  const isOptional = OPTIONAL_STEPS.has(currentStep);

  const handleNext = () => {
    if (currentStep === TOTAL_STEPS) {
      setShowSummary(true);
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    if (currentStep === TOTAL_STEPS) {
      setShowSummary(true);
    } else {
      nextStep();
    }
  };

  const StepContent = () => {
    switch (currentStep) {
      case 1: return <StepDestination />;
      case 2: return <StepDates />;
      case 3: return <StepPeople />;
      case 4: return <StepTripType />;
      case 5: return <StepBudget />;
      case 6: return <StepStyles />;
      case 7: return <StepRequirements />;
      default: return null;
    }
  };

  if (showSummary) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex items-center px-6 pt-4 pb-2">
          <button
            onClick={() => setShowSummary(false)}
            className="text-muted hover:text-charcoal transition-colors text-sm"
          >
            ← 返回修改
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <SummaryPage />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <p className="text-sm font-medium text-charcoal">旅路</p>
        <p className="text-sm text-muted">
          {currentStep}/{TOTAL_STEPS}
        </p>
      </div>

      <ProgressBar
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        onStepClick={setStep}
        completedSteps={completedSteps}
      />

      {/* Step label */}
      <div className="flex gap-2 px-6 pt-3 pb-1">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={[
              "text-xs font-medium transition-colors",
              i + 1 === currentStep ? "text-coral" : "text-transparent",
            ].join(" ")}
            style={{ flex: 1 }}
          >
            {i + 1 === currentStep ? label : "·"}
          </span>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
        <StepContent />
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 pt-2 flex flex-col gap-3">
        <button
          onClick={handleNext}
          disabled={!canGoNext && !isOptional}
          className="w-full bg-coral text-white rounded-2xl py-4 font-semibold disabled:opacity-40 hover:bg-wood transition-colors"
        >
          {currentStep === TOTAL_STEPS ? "查看摘要" : "下一步"}
        </button>

        <div className="flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 bg-white border border-border rounded-2xl py-3 text-charcoal font-medium hover:bg-card-hover transition-colors"
            >
              上一步
            </button>
          )}

          {isOptional && (
            <button
              onClick={handleSkip}
              className="flex-1 text-muted text-sm font-medium py-3 hover:text-charcoal transition-colors"
            >
              跳過
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
