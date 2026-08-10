function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-butter/80 ${className ?? "rounded-xl"}`}
      aria-hidden
    />
  );
}

export function TripCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <Pulse className="h-28 rounded-none" />
      <div className="p-4 flex flex-col gap-3">
        <Pulse className="h-4 w-3/5 rounded-xl" />
        <Pulse className="h-3 w-2/5 rounded-xl" />
        <div className="flex items-center gap-3 mt-1">
          <Pulse className="h-3 w-24 rounded-xl" />
          <Pulse className="h-3 w-12 rounded-xl" />
          <Pulse className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function TripListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="flex flex-col min-h-screen pb-24" aria-busy aria-label="載入中">
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div className="flex flex-col gap-2">
          <Pulse className="h-8 w-20 rounded-xl" />
          <Pulse className="h-3 w-28 rounded-xl" />
        </div>
        <Pulse className="h-10 w-10 rounded-full" />
      </div>

      <div className="px-6 flex flex-col gap-6 flex-1">
        <section>
          <Pulse className="h-4 w-16 mb-3 rounded-xl" />
          <TripListSkeleton count={2} />
        </section>
      </div>
    </div>
  );
}

export function TripDetailSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-cream" aria-busy aria-label="載入中">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Pulse className="h-10 w-10 rounded-2xl shrink-0" />
          <div className="flex flex-col gap-1.5 min-w-0">
            <Pulse className="h-3.5 w-32 rounded-xl" />
            <Pulse className="h-3 w-20 rounded-xl" />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Pulse className="h-10 w-10 rounded-2xl" />
          <Pulse className="h-10 w-10 rounded-2xl" />
        </div>
      </div>

      <div className="no-scrollbar flex overflow-x-auto gap-2 px-4 py-3 border-b border-border bg-card">
        {Array.from({ length: 4 }, (_, i) => (
          <Pulse key={i} className="h-8 w-16 rounded-full shrink-0" />
        ))}
      </div>

      <div className="flex-1 overflow-hidden px-4 py-4 flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-2"
          >
            <Pulse className="h-4 w-2/3 rounded-xl" />
            <Pulse className="h-3 w-1/2 rounded-xl" />
            <Pulse className="h-3 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
