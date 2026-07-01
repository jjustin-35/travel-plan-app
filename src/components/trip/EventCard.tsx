"use client";

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  景點: { icon: "📍", color: "bg-blue-50 text-blue-600" },
  餐廳: { icon: "🍽️", color: "bg-orange-50 text-orange-600" },
  咖啡廳: { icon: "☕", color: "bg-yellow-50 text-yellow-700" },
  交通: { icon: "🚌", color: "bg-gray-50 text-gray-600" },
  住宿: { icon: "🏨", color: "bg-purple-50 text-purple-600" },
  購物: { icon: "🛍️", color: "bg-pink-50 text-pink-600" },
  其他: { icon: "📌", color: "bg-gray-50 text-gray-500" },
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

  return (
    <button
      onClick={() => onTap?.(event)}
      className={[
        "w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 transition-all",
        isSelected ? "border-coral shadow-md" : "border-transparent hover:border-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}
        >
          <span className="text-lg">{config.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-charcoal text-sm truncate">
              {event.title}
            </p>
            <span className="text-xs text-muted flex-shrink-0 font-medium">
              {event.eventTime}
            </span>
          </div>

          <p className="text-xs text-muted mt-0.5 truncate">{event.location}</p>

          <p className="text-xs text-charcoal/70 mt-1.5 line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}
            >
              {event.category}
            </span>
            <span className="text-xs text-muted">
              ⏱ {formatDuration(event.durationMinutes)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
