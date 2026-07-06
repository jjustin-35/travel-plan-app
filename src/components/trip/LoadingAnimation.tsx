"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  { text: "正在為你規劃行程...", sub: "分析目的地特色與景點" },
  { text: "正在挑選最佳景點...", sub: "根據你的偏好篩選" },
  { text: "正在安排餐廳與住宿...", sub: "找出最道地的美食選擇" },
  { text: "正在優化行程順序...", sub: "計算最省時的路線" },
  { text: "即將完成，稍等一下...", sub: "為你打磨最後細節 ✨" },
];

// SVG airplane that flies along a dotted path, plus warm decorations
function FlyingPlane() {
  return (
    <div className="relative h-48 w-full overflow-hidden">
      {/* Clouds */}
      <div className="absolute left-6 top-6 opacity-40 animate-float-soft">
        <svg width="80" height="40" viewBox="0 0 80 40">
          <ellipse cx="40" cy="30" rx="38" ry="18" fill="#F5E4C0" />
          <ellipse cx="25" cy="24" rx="20" ry="14" fill="#F5E4C0" />
          <ellipse cx="58" cy="26" rx="18" ry="12" fill="#F5E4C0" />
        </svg>
      </div>

      {/* Dotted flight path */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 320 192"
        preserveAspectRatio="none"
      >
        <path
          d="M -20 140 Q 80 40 160 90 Q 240 140 340 50"
          fill="none"
          stroke="#D4B896"
          strokeWidth="2"
          strokeDasharray="6 6"
          opacity="0.6"
        />
      </svg>

      {/* Animated airplane */}
      <div className="absolute animate-plane-fly" style={{ top: "50%", left: "-12%" }}>
        <svg width="52" height="52" viewBox="0 0 52 52" aria-label="✈️">
          <ellipse cx="26" cy="26" rx="22" ry="9" fill="#E97451" />
          <path
            d="M8 26 L44 26 Q48 26 48 22 L38 20 L26 18 L14 20 L4 22 Q4 26 8 26Z"
            fill="#E97451"
          />
          <path d="M20 26 L10 38 L26 32 Z" fill="#F5C45A" />
          <path d="M20 26 L12 14 L26 20 Z" fill="#F5C45A" />
          <path d="M40 26 L48 20 L48 26 Z" fill="#F5C45A" />
          <path d="M40 26 L48 32 L48 26 Z" fill="#D4956A" />
          <circle cx="24" cy="24" r="3.5" fill="white" opacity="0.7" />
          <circle cx="32" cy="24" r="3.5" fill="white" opacity="0.7" />
        </svg>
      </div>

      {/* Destination pin */}
      <div
        className="absolute animate-float-soft"
        style={{ right: "15%", bottom: "20%" }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral shadow-md">
          <span className="text-sm">📍</span>
        </div>
      </div>

      {/* Suitcase */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2" aria-label="🧳">
        <svg width="60" height="52" viewBox="0 0 60 52">
          <rect
            x="18"
            y="2"
            width="24"
            height="10"
            rx="5"
            fill="none"
            stroke="#D4956A"
            strokeWidth="3"
          />
          <rect
            x="6"
            y="12"
            width="48"
            height="36"
            rx="8"
            fill="#F5E4C0"
            stroke="#D4B896"
            strokeWidth="2"
          />
          <rect x="6" y="26" width="48" height="4" fill="#D4B896" opacity="0.5" />
          <rect x="24" y="20" width="12" height="10" rx="3" fill="#E97451" />
          <circle cx="30" cy="24" r="2" fill="white" opacity="0.6" />
          <circle cx="16" cy="50" r="4" fill="#D4956A" />
          <circle cx="44" cy="50" r="4" fill="#D4956A" />
        </svg>
      </div>
    </div>
  );
}

export function LoadingAnimation({ destination }: { destination?: string }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-cream px-6 py-16 text-center">
      {/* Brand */}
      <div>
        <div className="font-brand text-2xl text-coral">旅路</div>
        <p className="mt-1 text-sm text-muted">
          {destination ? `為 ${destination} 打造專屬行程中` : "為你打造專屬行程中"}
        </p>
      </div>

      {/* Illustration + message */}
      <div className="w-full">
        <FlyingPlane />

        <div className="mt-6 animate-fade-slide-up" key={msgIndex}>
          <p className="text-lg font-bold text-charcoal">
            {MESSAGES[msgIndex].text}
          </p>
          <p className="mt-1 text-sm text-muted">{MESSAGES[msgIndex].sub}</p>
        </div>

      </div>

      {/* Message dots + tip */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          {MESSAGES.map((_, i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-coral transition-all duration-300"
              style={{
                opacity: i === msgIndex ? 1 : 0.25,
                transform: i === msgIndex ? "scale(1)" : "scale(0.7)",
              }}
            />
          ))}
        </div>
        <p className="text-xs italic text-muted">「精彩的旅程值得等待 🌟」</p>
      </div>
    </div>
  );
}
