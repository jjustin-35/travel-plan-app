"use client";

import Link from "next/link";

type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  peopleCount: number;
  tripType: string;
  status: string;
};

const DESTINATION_EMOJIS: Record<string, string> = {
  東京: "🗼",
  京都: "⛩️",
  大阪: "🏯",
  峇里島: "🌴",
  巴黎: "🗺️",
  首爾: "🏙️",
  紐約: "🗽",
  倫敦: "🎡",
  曼谷: "🐘",
  싱가포르: "🦁",
};

function getDestinationEmoji(destination: string): string {
  for (const [key, emoji] of Object.entries(DESTINATION_EMOJIS)) {
    if (destination.includes(key)) return emoji;
  }
  return "✈️";
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
}

export function TripCard({ trip }: { trip: Trip }) {
  const emoji = getDestinationEmoji(trip.destination);
  const isGenerating = trip.status === "generating";

  return (
    <Link href={`/trips/${trip.id}`}>
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
        {/* Cover */}
        <div className="h-28 bg-linear-to-br from-butter to-wood-light flex items-center justify-center">
          <span className="text-6xl drop-shadow-sm">{emoji}</span>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-charcoal text-sm leading-tight flex-1">
              {trip.title}
            </h3>
            {isGenerating && (
              <span className="text-xs bg-coral/10 text-coral px-2 py-0.5 rounded-full shrink-0">
                規劃中
              </span>
            )}
          </div>

          <p className="text-xs text-muted mt-1">{trip.destination}</p>

          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-muted">
              📅 {formatDateRange(trip.startDate, trip.endDate)}
            </span>
            <span className="text-xs text-muted">👥 {trip.peopleCount} 人</span>
            <span className="text-xs bg-butter text-charcoal px-2 py-0.5 rounded-full">
              {trip.tripType}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
