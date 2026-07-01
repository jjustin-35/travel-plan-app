"use client";

import { useOnboardingStore } from "@/stores/onboarding.store";

export function StepPeople() {
  const { peopleCount, setPeopleCount } = useOnboardingStore();

  const decrease = () => setPeopleCount(Math.max(1, peopleCount - 1));
  const increase = () => setPeopleCount(Math.min(20, peopleCount + 1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-3">👥</div>
        <h2 className="text-2xl font-bold text-charcoal">幾位旅伴？</h2>
        <p className="text-muted mt-1 text-sm">包含你自己在內</p>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 flex items-center justify-between">
        <button
          onClick={decrease}
          disabled={peopleCount <= 1}
          className="w-12 h-12 rounded-full bg-butter text-charcoal text-xl font-bold flex items-center justify-center disabled:opacity-30 hover:bg-wood-light transition-colors"
        >
          −
        </button>

        <div className="text-center">
          <p className="text-5xl font-bold text-charcoal">{peopleCount}</p>
          <p className="text-sm text-muted mt-1">人</p>
        </div>

        <button
          onClick={increase}
          disabled={peopleCount >= 20}
          className="w-12 h-12 rounded-full bg-coral text-white text-xl font-bold flex items-center justify-center disabled:opacity-30 hover:bg-wood transition-colors"
        >
          +
        </button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {Array.from({ length: Math.min(peopleCount, 10) }, (_, i) => (
          <span key={i} className="text-2xl">
            {i === 0 ? "🧍" : "🧑"}
          </span>
        ))}
        {peopleCount > 10 && (
          <span className="text-sm text-muted self-center">
            + {peopleCount - 10} 人
          </span>
        )}
      </div>
    </div>
  );
}
