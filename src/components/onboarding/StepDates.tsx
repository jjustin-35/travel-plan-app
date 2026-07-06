"use client";

import { useOnboardingStore } from "@/stores/onboarding.store";

export function StepDates() {
  const { startDate, endDate, days, nights, setDates } = useOnboardingStore();

  const handleStartDate = (value: string) => {
    if (endDate && value <= endDate) {
      setDates(value, endDate);
    } else {
      setDates(value, value);
    }
  };

  const handleEndDate = (value: string) => {
    if (startDate && value >= startDate) {
      setDates(startDate, value);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-3">📅</div>
        <h2 className="text-2xl font-bold text-charcoal">什麼時候出發？</h2>
        <p className="text-muted mt-1 text-sm">選擇旅遊日期</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-white border border-border rounded-2xl p-4">
          <p className="text-xs text-muted mb-2 font-medium">出發日期</p>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => handleStartDate(e.target.value)}
            className="w-full text-charcoal text-base focus:outline-none bg-transparent"
          />
        </div>

        <div className="bg-white border border-border rounded-2xl p-4">
          <p className="text-xs text-muted mb-2 font-medium">回程日期</p>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => handleEndDate(e.target.value)}
            className="w-full text-charcoal text-base focus:outline-none bg-transparent"
          />
        </div>
      </div>

      {days > 0 && (
        <div className="bg-butter rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-charcoal">{days} 天 {nights} 夜</p>
          <p className="text-sm text-muted mt-1">精彩行程即將展開</p>
        </div>
      )}
    </div>
  );
}
