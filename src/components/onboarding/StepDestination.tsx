"use client";

import Image from "next/image";
import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboarding.store";

const UNSPLASH_PARAMS = "?w=800&q=80&auto=format&fit=crop";

const POPULAR_DESTINATIONS = [
  {
    name: "東京",
    country: "日本",
    image: `https://images.unsplash.com/photo-1540959733332-eab4deabeeaf${UNSPLASH_PARAMS}`,
  },
  {
    name: "峇里島",
    country: "印尼",
    image: `https://images.unsplash.com/photo-1537996194471-e657df975ab4${UNSPLASH_PARAMS}`,
  },
  {
    name: "巴黎",
    country: "法國",
    image: `https://images.unsplash.com/photo-1502602898657-3e91760cbb34${UNSPLASH_PARAMS}`,
  },
  {
    name: "首爾",
    country: "韓國",
    image: `https://images.unsplash.com/photo-1517154421773-0529f29ea451${UNSPLASH_PARAMS}`,
  },
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
          {POPULAR_DESTINATIONS.map((dest) => {
            const isSelected = input === dest.name;
            return (
              <button
                key={dest.name}
                onClick={() => handleChange(dest.name)}
                className={[
                  "relative aspect-4/3 rounded-2xl overflow-hidden text-left transition-all",
                  "ring-2 ring-offset-2",
                  isSelected
                    ? "ring-coral ring-offset-cream"
                    : "ring-transparent hover:ring-coral/40",
                ].join(" ")}
              >
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  sizes="(max-width: 448px) 45vw, 200px"
                  className="object-cover"
                />
                {/* Gradient overlay for text legibility */}
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />

                {/* Selected check badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-coral text-white flex items-center justify-center text-xs shadow-md">
                    ✓
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="font-semibold text-white text-sm drop-shadow">
                    {dest.name}
                  </p>
                  <p className="text-xs text-white/80 drop-shadow">
                    {dest.country}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
