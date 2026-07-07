"use client";

import { createPortal } from "react-dom";
import {
  X,
  MapPin,
  Utensils,
  Coffee,
  Train,
  Bed,
  ShoppingBag,
  Sparkles,
  Clock,
  Navigation,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { RippleButton } from "@/components/ui/RippleButton";
import type { TripEvent } from "@/lib/schemas/trip.schema";

type CategoryMeta = { Icon: LucideIcon; color: string; bg: string };

const CATEGORY_CONFIG: Record<string, CategoryMeta> = {
  景點: { Icon: MapPin, color: "#E97451", bg: "#FFF0EB" },
  餐廳: { Icon: Utensils, color: "#D4956A", bg: "#FFF5EC" },
  咖啡廳: { Icon: Coffee, color: "#C4956A", bg: "#FBF3E8" },
  交通: { Icon: Train, color: "#8B7355", bg: "#F5EDE0" },
  住宿: { Icon: Bed, color: "#A0785A", bg: "#F8EEE4" },
  購物: { Icon: ShoppingBag, color: "#C77B5A", bg: "#FCEDE6" },
  其他: { Icon: Sparkles, color: "#C4A060", bg: "#FFF9EC" },
};

type EventDetailModalProps = {
  event: TripEvent;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分鐘`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} 小時 ${m} 分鐘` : `${h} 小時`;
}

export function EventDetailModal({
  event,
  onEdit,
  onDelete,
  onClose,
}: EventDetailModalProps) {
  const config = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG["其他"];
  const { Icon } = config;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center p-4 isolate">
      <div
        className="absolute inset-0 z-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative z-10 w-full max-w-[414px] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-3xl border border-border shadow-2xl"
        style={{ backgroundColor: "#fffcf7" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <h2 id="event-detail-title" className="font-bold text-charcoal text-base">
            行程詳情
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-butter hover:text-charcoal transition-colors"
            aria-label="關閉"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-6 flex flex-col gap-5 pb-8">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: config.bg }}
            >
              <Icon size={22} style={{ color: config.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-charcoal text-lg leading-snug">
                {event.title}
              </h3>
              <span
                className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: config.bg, color: config.color }}
              >
                {event.category}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-muted shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted">時間</p>
                <p className="text-sm text-charcoal font-semibold mt-0.5">
                  {event.eventTime}
                  <span className="text-muted font-normal">
                    {" "}
                    · {formatDuration(event.durationMinutes)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Navigation size={16} className="text-muted shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted">地址</p>
                <p className="text-sm text-charcoal mt-0.5 leading-relaxed">
                  {event.location}
                </p>
              </div>
            </div>

            {event.description ? (
              <div className="flex items-start gap-3">
                <FileText size={16} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-muted">描述</p>
                  <p className="text-sm text-charcoal/80 mt-0.5 leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              </div>
            ) : null}

            {event.sortOrder > 1 &&
              event.travelFromMode &&
              event.travelFromMinutes !== null && (
              <div className="flex items-start gap-3">
                <Train size={16} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-muted">如何抵達</p>
                  <p className="text-sm text-charcoal mt-0.5">
                    {event.travelFromMode}
                    <span className="text-muted">
                      {" "}
                      · 約 {event.travelFromMinutes} 分鐘
                    </span>
                  </p>
                </div>
              </div>
            )}

            {(event.lat !== 0 || event.lng !== 0) && (
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-muted">座標</p>
                  <p className="text-sm text-charcoal/70 mt-0.5 font-mono">
                    {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onDelete}
              className="flex-1 py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
            >
              刪除
            </button>
            <RippleButton
              onClick={onEdit}
              className="flex-1 py-3 rounded-2xl bg-coral text-white text-sm font-bold hover:bg-wood transition-colors"
            >
              編輯
            </RippleButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
