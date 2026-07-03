"use client";

import {
  MapPin,
  Utensils,
  Coffee,
  Train,
  Bed,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useAlternativesStore, TripEvent } from "@/stores/alternatives.store";

type AlternativesPanelProps = {
  onSelect: (alt: TripEvent) => void;
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  景點: MapPin,
  餐廳: Utensils,
  咖啡廳: Coffee,
  交通: Train,
  住宿: Bed,
  購物: ShoppingBag,
  其他: Sparkles,
};

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} 分鐘`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h${m}m` : `${h} 小時`;
}

export function AlternativesPanel({ onSelect }: AlternativesPanelProps) {
  const { isLoading, alternatives, error, clear } = useAlternativesStore();

  if (!isLoading && alternatives.length === 0 && !error) return null;

  return (
    <div className="bg-butter rounded-2xl p-4 border border-wood-light">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-charcoal">🔄 備選方案</p>
        <button onClick={clear} className="text-xs text-muted hover:text-charcoal">
          取消
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card/60 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 text-center py-2">{error}</p>
      )}

      {!isLoading && alternatives.length > 0 && (
        <div className="flex flex-col gap-2">
          {alternatives.map((alt) => {
            const Icon = CATEGORY_ICONS[alt.category] ?? Sparkles;
            return (
            <button
              key={alt.id}
              onClick={() => onSelect(alt)}
              className="w-full bg-card rounded-xl p-3 text-left flex items-start gap-3 hover:bg-card-hover transition-colors border border-transparent hover:border-coral/30"
            >
              <Icon size={18} className="text-coral mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-charcoal text-xs truncate">{alt.title}</p>
                <p className="text-xs text-muted truncate mt-0.5">{alt.location}</p>
                <p className="text-xs text-charcoal/60 mt-1 line-clamp-1">{alt.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-muted">{alt.eventTime}</span>
                <span className="text-xs text-muted">{formatDuration(alt.durationMinutes)}</span>
                <span className="text-xs font-semibold text-coral mt-1">選擇</span>
              </div>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
