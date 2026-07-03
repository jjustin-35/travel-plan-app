"use client";

import {
  MapPin,
  Utensils,
  Coffee,
  Train,
  Bed,
  ShoppingBag,
  Sparkles,
  Clock,
  type LucideIcon,
} from "lucide-react";

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

type EventCardProps = {
  event: TripEvent;
  onTap?: (event: TripEvent) => void;
  isSelected?: boolean;
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分鐘`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} 小時 ${m} 分鐘` : `${h} 小時`;
}

export function EventCard({ event, onTap, isSelected }: EventCardProps) {
  const config = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG["其他"];
  const { Icon } = config;

  return (
    <button
      onClick={() => onTap?.(event)}
      className={[
        "w-full text-left bg-card rounded-2xl p-4 border transition-all",
        isSelected
          ? "border-coral shadow-md ring-1 ring-coral/30"
          : "border-border shadow-sm hover:border-coral/40",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: config.bg }}
        >
          <Icon size={18} style={{ color: config.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-charcoal text-sm truncate">
              {event.title}
            </p>
            <span className="text-xs text-muted shrink-0 font-semibold">
              {event.eventTime}
            </span>
          </div>

          <p className="text-xs text-muted mt-0.5 truncate">{event.location}</p>

          {event.description && (
            <p className="text-xs text-charcoal/70 mt-1.5 line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: config.bg, color: config.color }}
            >
              {event.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Clock size={12} /> {formatDuration(event.durationMinutes)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
