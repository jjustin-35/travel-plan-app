"use client";

import { useOnboardingStore } from "@/stores/onboarding.store";

const TRANSPORT_MODES = [
  { value: "步行", emoji: "🚶", desc: "適合短距離探索" },
  { value: "大眾運輸", emoji: "🚇", desc: "地鐵、巴士等" },
  { value: "計程車", emoji: "🚕", desc: "方便直達" },
  { value: "租車", emoji: "🚗", desc: "自駕自由行" },
  { value: "單車", emoji: "🚲", desc: "輕鬆騎行" },
] as const;

export function StepTransport() {
  const { preferredTransportModes, toggleTransportMode } = useOnboardingStore();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-3">🚌</div>
        <h2 className="text-2xl font-bold text-charcoal">偏好的交通方式</h2>
        <p className="text-muted mt-1 text-sm">可複選，AI 會優先採用你偏好的交通方式</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TRANSPORT_MODES.map((mode) => {
          const isSelected = preferredTransportModes.includes(mode.value);
          return (
            <button
              key={mode.value}
              onClick={() => toggleTransportMode(mode.value)}
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
              <div className="text-2xl mb-2">{mode.emoji}</div>
              <p className="font-semibold text-charcoal text-sm">{mode.value}</p>
              <p className="text-xs text-muted mt-1">{mode.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
