"use client";

import { useOnboardingStore } from "@/stores/onboarding.store";

const QUICK_TAGS = [
  "無障礙需求",
  "素食友善",
  "避免人潮擁擠",
  "親子友善",
  "寵物同行",
];

export function StepRequirements() {
  const { specialRequirements, setSpecialRequirements } = useOnboardingStore();

  const appendTag = (tag: string) => {
    const current = specialRequirements.trim();
    const newValue = current ? `${current}、${tag}` : tag;
    setSpecialRequirements(newValue);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-3">📝</div>
        <h2 className="text-2xl font-bold text-charcoal">其他特殊需求</h2>
        <p className="text-muted mt-1 text-sm">有什麼特別需要注意的嗎？</p>
      </div>

      <textarea
        value={specialRequirements}
        onChange={(e) => setSpecialRequirements(e.target.value)}
        placeholder={`例如：\n「其中一人使用輪椅，請避免需要爬坡的景點」\n「團員中有素食者」`}
        rows={5}
        className="w-full bg-white border border-border rounded-2xl px-4 py-3.5 text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition-all resize-none text-sm leading-relaxed"
      />

      <div>
        <p className="text-xs text-muted mb-2 font-medium">快速標籤</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => appendTag(tag)}
              className="px-3 py-1.5 bg-butter rounded-full text-xs text-charcoal font-medium hover:bg-wood-light transition-colors"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
