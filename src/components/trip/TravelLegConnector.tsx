"use client";

import { Footprints, Train, Car, Bike, Bus } from "lucide-react";
import type { TransportMode, TripEvent } from "@/lib/schemas/trip.schema";

const MODE_META: Record<
  TransportMode,
  { label: string; Icon: typeof Train }
> = {
  步行: { label: "步行", Icon: Footprints },
  大眾運輸: { label: "大眾運輸", Icon: Train },
  計程車: { label: "計程車", Icon: Car },
  租車: { label: "租車", Icon: Bus },
  單車: { label: "單車", Icon: Bike },
};

type TravelLegConnectorProps = {
  event: TripEvent;
};

function formatTravelMinutes(minutes: number): string {
  if (minutes < 60) return `約 ${minutes} 分鐘`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `約 ${h} 小時 ${m} 分鐘` : `約 ${h} 小時`;
}

export function TravelLegConnector({ event }: TravelLegConnectorProps) {
  if (!event.travelFromMode || event.travelFromMinutes === null) {
    return null;
  }

  const meta = MODE_META[event.travelFromMode];
  const { Icon } = meta;

  return (
    <div className="flex items-center gap-2 py-1 pl-11 pr-2">
      <div className="flex items-center gap-1.5 rounded-full bg-butter/80 border border-border px-2.5 py-1 text-xs text-muted">
        <Icon size={13} className="text-wood shrink-0" />
        <span className="font-semibold text-charcoal/80">{meta.label}</span>
        <span className="text-muted">·</span>
        <span>{formatTravelMinutes(event.travelFromMinutes)}</span>
      </div>
    </div>
  );
}
