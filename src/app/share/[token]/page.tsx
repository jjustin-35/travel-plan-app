import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

type PageProps = { params: Promise<{ token: string }> };

const CATEGORY_ICONS: Record<string, string> = {
  景點: "📍", 餐廳: "🍽️", 咖啡廳: "☕", 交通: "🚌",
  住宿: "🏨", 購物: "🛍️", 其他: "📌",
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("zh-TW", {
    month: "short", day: "numeric",
  });
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} 分`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

export default async function PublicSharePage({ params }: PageProps) {
  const { token } = await params;

  const share = await prisma.tripShare.findUnique({
    where: { shareToken: token },
    include: {
      trip: {
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: { events: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });

  if (!share || !share.isActive) notFound();

  const { trip } = share;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 py-4 text-center">
        <h1 className="font-bold text-charcoal text-lg leading-tight">
          {trip.title}
        </h1>
        <p className="text-xs text-muted mt-1">
          📍 {trip.destination}　{new Date(trip.startDate).toLocaleDateString("zh-TW")} —{" "}
          {new Date(trip.endDate).toLocaleDateString("zh-TW")}
        </p>
        <p className="text-[10px] text-muted/60 mt-2">唯讀分享 · 由 AI 行程規劃師產生</p>
      </div>

      {/* Days */}
      <div className="p-4 flex flex-col gap-6 max-w-lg mx-auto">
        {trip.days.map((day) => (
          <div key={day.id}>
            {/* Day label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-coral text-white text-xs font-bold px-3 py-1 rounded-full">
                Day {day.dayNumber}
              </div>
              <span className="text-xs text-muted font-medium">
                {formatDate(day.date)}
              </span>
            </div>

            {/* Events */}
            <div className="relative">
              <div className="absolute left-[14px] top-2 bottom-2 w-0.5 bg-border" />
              <div className="flex flex-col gap-3">
                {day.events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="w-7 flex-shrink-0 flex justify-center pt-3.5 z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-coral border-2 border-white shadow-sm" />
                    </div>
                    <div className="flex-1 bg-white rounded-xl p-3 border border-border shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span>{CATEGORY_ICONS[event.category] ?? "📌"}</span>
                          <p className="font-semibold text-charcoal text-sm">
                            {event.title}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted">{event.eventTime}</p>
                          <p className="text-[10px] text-muted">
                            {formatDuration(event.durationMinutes)}
                          </p>
                        </div>
                      </div>
                      {event.location && (
                        <p className="text-xs text-muted mt-1">{event.location}</p>
                      )}
                      {event.description && (
                        <p className="text-xs text-charcoal/70 mt-1.5 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center pb-10 pt-4">
        <p className="text-xs text-muted/60">由 AI 行程規劃師產生</p>
      </div>
    </div>
  );
}
