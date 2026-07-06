"use client";

import { useOnboardingStore } from "@/stores/onboarding.store";

const TRIP_TYPES = [
  { value: "情侶出遊", label: "情侶出遊", emoji: "💑", desc: "浪漫的二人世界" },
  { value: "家族出遊", label: "家族出遊", emoji: "👨‍👩‍👧‍👦", desc: "闔家歡樂" },
  { value: "獨旅", label: "獨旅", emoji: "🧳", desc: "自由自在的探索" },
  { value: "朋友出遊", label: "朋友出遊", emoji: "🎉", desc: "好友同行最快樂" },
];

export function StepTripType() {
  const { tripType, setTripType } = useOnboardingStore();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-3">✈️</div>
        <h2 className="text-2xl font-bold text-charcoal">這趟旅行的性質？</h2>
        <p className="text-muted mt-1 text-sm">選擇最符合的出遊方式</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TRIP_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setTripType(type.value)}
            className={[
              "rounded-2xl p-5 text-center transition-all border-2",
              tripType === type.value
                ? "border-coral bg-coral/5"
                : "border-border bg-white hover:border-coral/40 hover:bg-card-hover",
            ].join(" ")}
          >
            <div className="text-3xl mb-2">{type.emoji}</div>
            <p className="font-semibold text-charcoal text-sm">{type.label}</p>
            <p className="text-xs text-muted mt-1">{type.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
