"use client";

import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboarding.store";

const POPULAR_DESTINATIONS = [
  { name: "東京", country: "日本", emoji: "🗼" },
  { name: "峇里島", country: "印尼", emoji: "🌴" },
  { name: "巴黎", country: "法國", emoji: "🗺️" },
  { name: "首爾", country: "韓國", emoji: "🏙️" },
];

export function StepDestination() {
  const { destination, setDestination } = useOnboardingStore();
  const [input, setInput] = useState(destination);

  const handleChange = (value: string) => {
    setInput(value);
    setDestination(value);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-3">🌍</div>
        <h2 className="text-2xl font-bold text-charcoal">去哪旅行？</h2>
        <p className="text-muted mt-1 text-sm">告訴我你的夢想目的地</p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="輸入目的地，例：東京・京都..."
          className="w-full bg-white border border-border rounded-2xl px-4 py-3.5 text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition-all"
        />
      </div>

      <div>
        <p className="text-xs font-medium text-muted mb-3">🔥 熱門推薦</p>
        <div className="grid grid-cols-2 gap-3">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.name}
              onClick={() => handleChange(dest.name)}
              className={[
                "rounded-2xl p-4 text-left transition-all border-2",
                input === dest.name
                  ? "border-coral bg-coral/5"
                  : "border-border bg-white hover:border-coral/40 hover:bg-card-hover",
              ].join(" ")}
            >
              <div className="text-2xl mb-2">{dest.emoji}</div>
              <p className="font-semibold text-charcoal text-sm">{dest.name}</p>
              <p className="text-xs text-muted">{dest.country}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
