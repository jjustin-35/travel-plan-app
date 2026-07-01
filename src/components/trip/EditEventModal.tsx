"use client";

import { useState, useEffect } from "react";

type TripEvent = {
  id: string;
  title: string;
  location: string;
  description: string;
  category: string;
  eventTime: string;
  durationMinutes: number;
  sortOrder: number;
  lat: number;
  lng: number;
};

type EditEventModalProps = {
  event: TripEvent | null;
  isNew?: boolean;
  onSave: (event: TripEvent) => void;
  onClose: () => void;
};

const CATEGORIES = ["景點", "餐廳", "咖啡廳", "交通", "住宿", "購物", "其他"] as const;

const CATEGORY_ICONS: Record<string, string> = {
  景點: "📍",
  餐廳: "🍽️",
  咖啡廳: "☕",
  交通: "🚌",
  住宿: "🏨",
  購物: "🛍️",
  其他: "📌",
};

export function EditEventModal({ event, isNew = false, onSave, onClose }: EditEventModalProps) {
  const [form, setForm] = useState<TripEvent>({
    id: event?.id ?? crypto.randomUUID(),
    title: event?.title ?? "",
    location: event?.location ?? "",
    description: event?.description ?? "",
    category: event?.category ?? "景點",
    eventTime: event?.eventTime ?? "09:00",
    durationMinutes: event?.durationMinutes ?? 90,
    sortOrder: event?.sortOrder ?? 1,
    lat: event?.lat ?? 0,
    lng: event?.lng ?? 0,
  });

  useEffect(() => {
    if (event) setForm({ ...event });
  }, [event]);

  const set = <K extends keyof TripEvent>(key: K, value: TripEvent[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isValid = form.title.trim() && form.location.trim() && form.eventTime;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <h2 className="font-bold text-charcoal">
            {isNew ? "新增行程節點" : "編輯行程"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-charcoal text-lg">
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 flex flex-col gap-5 pb-8">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">
              地點名稱 *
            </label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="例：淺草寺"
              className="w-full bg-cream border border-border rounded-xl px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">
              類別
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => set("category", cat)}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    form.category === cat
                      ? "bg-coral text-white border-coral"
                      : "bg-white text-charcoal border-border hover:border-coral/40",
                  ].join(" ")}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time + Duration */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted mb-1.5 block">
                時間 *
              </label>
              <input
                type="time"
                value={form.eventTime}
                onChange={(e) => set("eventTime", e.target.value)}
                className="w-full bg-cream border border-border rounded-xl px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted mb-1.5 block">
                時長（分鐘）
              </label>
              <input
                type="number"
                value={form.durationMinutes}
                min={15}
                max={480}
                step={15}
                onChange={(e) => set("durationMinutes", parseInt(e.target.value) || 60)}
                className="w-full bg-cream border border-border rounded-xl px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">
              地址
            </label>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="例：東京都台東區淺草 2-3-1"
              className="w-full bg-cream border border-border rounded-xl px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">
              備註描述
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="關於這個地點的說明或備忘..."
              rows={3}
              className="w-full bg-cream border border-border rounded-xl px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-charcoal text-sm font-medium hover:bg-cream transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => isValid && onSave(form)}
              disabled={!isValid}
              className="flex-1 py-3 rounded-xl bg-coral text-white text-sm font-semibold disabled:opacity-40 hover:bg-wood transition-colors"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
