"use client";

import { useOnboardingStore } from "@/stores/onboarding.store";

const BUDGET_OPTIONS = [
  { value: "經濟實惠（每日 NT$1,000 以下）", label: "省錢達人", emoji: "💸" },
  { value: "中等預算（每日 NT$1,000–3,000）", label: "舒適旅遊", emoji: "💳" },
  { value: "較高預算（每日 NT$3,000–6,000）", label: "享受旅程", emoji: "🌟" },
  { value: "奢華旅遊（每日 NT$6,000 以上）", label: "頂級享受", emoji: "👑" },
];

export function StepBudget() {
  const { budgetRange, setBudgetRange } = useOnboardingStore();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-3">💰</div>
        <h2 className="text-2xl font-bold text-charcoal">預算規劃</h2>
        <p className="text-muted mt-1 text-sm">協助 AI 推薦最適合的行程安排</p>
      </div>

      <div className="flex flex-col gap-3">
        {BUDGET_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setBudgetRange(option.value)}
            className={[
              "rounded-2xl p-4 text-left flex items-center gap-4 transition-all border-2",
              budgetRange === option.value
                ? "border-coral bg-coral/5"
                : "border-border bg-white hover:border-coral/40 hover:bg-card-hover",
            ].join(" ")}
          >
            <span className="text-2xl">{option.emoji}</span>
            <div>
              <p className="font-semibold text-charcoal text-sm">{option.label}</p>
              <p className="text-xs text-muted mt-0.5">{option.value}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
