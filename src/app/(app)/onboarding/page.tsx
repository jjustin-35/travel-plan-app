"use client";

import { useOnboardingStore, ONBOARDING_TOTAL_STEPS } from "@/stores/onboarding.store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { StepDestination } from "@/components/onboarding/StepDestination";
import { StepDates } from "@/components/onboarding/StepDates";
import { StepPeople } from "@/components/onboarding/StepPeople";
import { StepTripType } from "@/components/onboarding/StepTripType";
import { StepTransport } from "@/components/onboarding/StepTransport";
import { StepBudget } from "@/components/onboarding/StepBudget";
import { StepStyles } from "@/components/onboarding/StepStyles";
import { StepRequirements } from "@/components/onboarding/StepRequirements";
import { SummaryPage } from "@/components/onboarding/SummaryPage";
import { RippleButton } from "@/components/ui/RippleButton";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

const TOTAL_STEPS = ONBOARDING_TOTAL_STEPS;
const OPTIONAL_STEPS = new Set([5, 6, 7, 8]);

const STEP_LABELS = [
  "目的地",
  "日期",
  "人數",
  "性質",
  "交通",
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

const validations = {
  1: (store: StoreState) => store.destination.trim().length > 0,
  2: (store: StoreState) => !!store.startDate && !!store.endDate && store.days > 0,
  3: (store: StoreState) => store.peopleCount >= 1,
  4: (store: StoreState) => store.tripType.length > 0,
};

function isStepValid(step: number, store: StoreState): boolean {
  if (!(step in validations)) return true;
  return validations[step as keyof typeof validations](store);
}

const stepComponents = {
  1: StepDestination,
  2: StepDates,
  3: StepPeople,
  4: StepTripType,
  5: StepTransport,
  6: StepBudget,
  7: StepStyles,
  8: StepRequirements,
};

const StepContent = ({ currentStep }: { currentStep: number }) => {
  if (!(currentStep in stepComponents)) return null;
  const Component = stepComponents[currentStep as keyof typeof stepComponents];
  return <Component />;
};

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

  if (showSummary) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex items-center gap-2 px-6 pt-6 pb-2">
          <button
            onClick={() => setShowSummary(false)}
            className="flex items-center gap-1 text-muted hover:text-charcoal transition-colors text-sm"
          >
            <ChevronLeft size={16} /> 返回修改
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
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <span className="font-brand text-2xl text-coral">旅路</span>
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

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
        <StepContent currentStep={currentStep} />
      </div>

      <div className="px-6 pb-10 pt-2 flex flex-col gap-3">
        {isOptional && (
          <RippleButton
            onClick={handleSkip}
            rippleColor="rgba(160,120,80,0.12)"
            className="w-full py-2 text-sm font-medium text-muted hover:text-charcoal transition-colors"
          >
            跳過此步驟
          </RippleButton>
        )}

        <div className="flex gap-3">
          {currentStep > 1 && (
            <RippleButton
              onClick={prevStep}
              rippleColor="rgba(160,120,80,0.15)"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-white text-charcoal hover:bg-card-hover transition-colors"
            >
              <ChevronLeft size={20} />
            </RippleButton>
          )}

          <RippleButton
            onClick={handleNext}
            disabled={!canGoNext && !isOptional}
            className="flex h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-coral text-white font-bold disabled:opacity-40 hover:bg-wood transition-colors"
          >
            {currentStep === TOTAL_STEPS ? "查看摘要" : "下一步"}
            <ArrowRight size={18} />
          </RippleButton>
        </div>
      </div>
    </div>
  );
}
