"use client";

type ProgressBarProps = {
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
  completedSteps: Set<number>;
};

export function ProgressBar({
  currentStep,
  totalSteps,
  onStepClick,
  completedSteps,
}: ProgressBarProps) {
  return (
    <div className="flex gap-1 px-6 pt-4">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = completedSteps.has(step);
        const isCurrent = step === currentStep;
        const isClickable = isCompleted && step !== currentStep;

        return (
          <button
            key={step}
            onClick={() => isClickable && onStepClick(step)}
            disabled={!isClickable}
            className={[
              "h-1 flex-1 rounded-full transition-all duration-300",
              isCurrent ? "bg-coral" : "",
              isCompleted && !isCurrent ? "bg-coral/60 cursor-pointer" : "",
              !isCompleted && !isCurrent ? "bg-border" : "",
            ].join(" ")}
            aria-label={`Step ${step}`}
          />
        );
      })}
    </div>
  );
}
