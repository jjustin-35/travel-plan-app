"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "正在為你規劃行程...",
  "正在挑選最佳景點...",
  "正在安排用餐行程...",
  "正在計算交通路線...",
  "即將完成，敬請期待...",
];

export function LoadingAnimation() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(msgTimer);
  }, []);

  useEffect(() => {
    const frameTimer = setInterval(() => {
      setFrame((prev) => (prev + 1) % 4);
    }, 600);
    return () => clearInterval(frameTimer);
  }, []);

  const suitcaseFrames = ["🧳", "👕", "👟", "🧳"];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cream px-8 text-center">
      {/* Main illustration */}
      <div className="relative mb-8">
        <div className="text-8xl mb-4 animate-bounce">
          {suitcaseFrames[frame]}
        </div>
        <div className="absolute -top-2 -right-4 text-2xl animate-spin">
          ✈️
        </div>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5 mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-coral rounded-full"
            style={{
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Dynamic message */}
      <p className="text-lg font-semibold text-charcoal mb-2 transition-all duration-500">
        {MESSAGES[msgIndex]}
      </p>
      <p className="text-sm text-muted">精彩的旅程值得等待 🌟</p>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
