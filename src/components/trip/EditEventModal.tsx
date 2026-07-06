"use client";

import { useState, useEffect } from "react";
import {
  X,
  Clock,
  Navigation,
  FileText,
  MapPin,
  Utensils,
  Coffee,
  Train,
  Bed,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { RippleButton } from "@/components/ui/RippleButton";

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

const CATEGORIES: { id: string; Icon: LucideIcon }[] = [
  { id: "景點", Icon: MapPin },
  { id: "餐廳", Icon: Utensils },
  { id: "咖啡廳", Icon: Coffee },
  { id: "交通", Icon: Train },
  { id: "住宿", Icon: Bed },
  { id: "購物", Icon: ShoppingBag },
  { id: "其他", Icon: Sparkles },
];

const DURATION_PRESETS = [30, 60, 90, 120, 180];

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

  const inputClass =
    "w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative mx-auto w-full max-w-[414px] bg-card rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <h2 className="font-bold text-charcoal text-base">
            {isNew ? "新增行程節點" : "編輯行程"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-butter hover:text-charcoal transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 flex flex-col gap-5 pb-8">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              地點名稱 *
            </label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="例：淺草寺"
              className={inputClass}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              類別
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ id, Icon }) => (
                <button
                  key={id}
                  onClick={() => set("category", id)}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    form.category === id
                      ? "bg-coral text-white border-coral"
                      : "bg-card text-charcoal border-border hover:border-coral/40",
                  ].join(" ")}
                >
                  <Icon size={14} />
                  <span>{id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time + Duration */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-1.5">
                <Clock size={13} /> 時間 *
              </label>
              <input
                type="time"
                value={form.eventTime}
                onChange={(e) => set("eventTime", e.target.value)}
                className={inputClass}
                style={{ colorScheme: "light" }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted mb-1.5 block">
                時長（分鐘）
              </label>
              <input
                type="number"
                value={form.durationMinutes}
                min={15}
                max={480}
                step={15}
                onChange={(e) => set("durationMinutes", parseInt(e.target.value) || 60)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Duration presets */}
          <div className="flex gap-2 -mt-2">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                onClick={() => set("durationMinutes", d)}
                className={[
                  "rounded-lg border px-3 py-1.5 text-xs transition-all",
                  form.durationMinutes === d
                    ? "border-coral bg-coral/8 text-coral font-bold"
                    : "border-border text-muted",
                ].join(" ")}
              >
                {d >= 60 ? `${d / 60}h` : `${d}m`}
              </button>
            ))}
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-1.5">
              <Navigation size={13} /> 地址
            </label>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="例：東京都台東區淺草 2-3-1"
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-1.5">
              <FileText size={13} /> 備註描述
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="關於這個地點的說明或備忘..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-border text-charcoal text-sm font-semibold hover:bg-butter transition-colors"
            >
              取消
            </button>
            <RippleButton
              onClick={() => isValid && onSave(form)}
              disabled={!isValid}
              className="flex-1 py-3 rounded-2xl bg-coral text-white text-sm font-bold disabled:opacity-40 hover:bg-wood transition-colors"
            >
              儲存
            </RippleButton>
          </div>
        </div>
      </div>
    </div>
  );
}
