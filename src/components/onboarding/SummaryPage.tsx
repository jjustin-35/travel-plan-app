"use client";

import { useOnboardingStore } from "@/stores/onboarding.store";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SummaryPage() {
  const store = useOnboardingStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const items = [
    { label: "目的地", value: store.destination, emoji: "📍" },
    {
      label: "日期",
      value: `${store.startDate} ~ ${store.endDate}（${store.days}天${store.nights}夜）`,
      emoji: "📅",
    },
    { label: "人數", value: `${store.peopleCount} 人`, emoji: "👥" },
    { label: "旅遊性質", value: store.tripType, emoji: "✈️" },
    store.budgetRange
      ? { label: "預算", value: store.budgetRange, emoji: "💰" }
      : null,
    store.preferredStyles.length > 0
      ? {
          label: "偏好風格",
          value: store.preferredStyles.join("、"),
          emoji: "🎯",
        }
      : null,
    store.specialRequirements
      ? {
          label: "特殊需求",
          value: store.specialRequirements,
          emoji: "📝",
        }
      : null,
  ].filter(Boolean);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");
    try {
      const input = store.toTripInput();
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "送出失敗，請稍後重試");
      }

      const { trip } = await res.json();
      store.reset();
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-3">🗺️</div>
        <h2 className="text-2xl font-bold text-charcoal">確認行程資訊</h2>
        <p className="text-muted mt-1 text-sm">確認無誤後，AI 就會開始規劃行程</p>
      </div>

      <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {items.map((item) =>
          item ? (
            <div key={item.label} className="flex items-start gap-3 px-4 py-3.5">
              <span className="text-lg mt-0.5">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted font-medium">{item.label}</p>
                <p className="text-sm text-charcoal mt-0.5 leading-relaxed">
                  {item.value}
                </p>
              </div>
            </div>
          ) : null
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-coral text-white rounded-2xl py-4 font-semibold text-base disabled:opacity-60 hover:bg-wood transition-colors"
      >
        {isLoading ? "AI 正在規劃行程中..." : "開始規劃行程 🚀"}
      </button>

      {isLoading && (
        <p className="text-center text-xs text-muted">
          AI 需要約 15–30 秒規劃完成，請稍候...
        </p>
      )}
    </div>
  );
}
