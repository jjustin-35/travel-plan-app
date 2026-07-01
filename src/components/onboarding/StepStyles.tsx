"use client";

import { useOnboardingStore } from "@/stores/onboarding.store";

const STYLES = [
  { value: "文化探索", emoji: "🏛️", desc: "博物館、歷史古蹟" },
  { value: "美食之旅", emoji: "🍜", desc: "在地美食、餐廳" },
  { value: "戶外冒險", emoji: "🏔️", desc: "健行、自然景觀" },
  { value: "購物血拼", emoji: "🛍️", desc: "市集、百貨" },
  { value: "放鬆度假", emoji: "🌊", desc: "海灘、溫泉" },
  { value: "藝術創意", emoji: "🎨", desc: "畫廊、設計景點" },
];

export function StepStyles() {
  const { preferredStyles, toggleStyle } = useOnboardingStore();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-3">🎯</div>
        <h2 className="text-2xl font-bold text-charcoal">旅遊偏好風格</h2>
        <p className="text-muted mt-1 text-sm">可複選，讓 AI 了解你的喜好</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {STYLES.map((style) => {
          const isSelected = preferredStyles.includes(style.value);
          return (
            <button
              key={style.value}
              onClick={() => toggleStyle(style.value)}
              className={[
                "rounded-2xl p-4 text-center transition-all border-2 relative",
                isSelected
                  ? "border-coral bg-coral/5"
                  : "border-border bg-white hover:border-coral/40 hover:bg-card-hover",
              ].join(" ")}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-coral rounded-full flex items-center justify-center text-white text-xs">
                  ✓
                </span>
              )}
              <div className="text-2xl mb-2">{style.emoji}</div>
              <p className="font-semibold text-charcoal text-sm">{style.value}</p>
              <p className="text-xs text-muted mt-1">{style.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
