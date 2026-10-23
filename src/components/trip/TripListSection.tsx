"use client";

import { useQuery } from "@tanstack/react-query";
import { Map } from "lucide-react";
import { TripCard } from "@/components/trip/TripCard";
import { listTrips, tripKeys } from "@/lib/api/trips";

export { TRIPS_QUERY_KEY, tripKeys } from "@/lib/api/trips";

function TripListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="載入行程中">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 rounded-2xl bg-butter/60 border border-border animate-pulse"
        />
      ))}
    </div>
  );
}

export function TripListSection() {
  const { data: trips = [], isPending, isError, refetch } = useQuery({
    queryKey: tripKeys.all,
    queryFn: listTrips,
  });

  if (isPending) {
    return <TripListSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
        <p className="font-semibold text-charcoal">無法載入行程</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 text-sm font-medium text-coral"
        >
          重試
        </button>
      </div>
    );
  }

  const now = new Date();
  const upcomingTrips = trips.filter((t) => new Date(t.endDate) >= now);
  const pastTrips = trips.filter((t) => new Date(t.endDate) < now);

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-butter mb-4">
          <Map size={44} className="text-coral" strokeWidth={1.5} />
        </div>
        <p className="font-bold text-charcoal text-lg">還沒有行程</p>
        <p className="text-sm text-muted mt-1 leading-relaxed max-w-xs">
          點擊右下角的 + 按鈕，讓 AI 幫你規劃第一趟旅程
        </p>
      </div>
    );
  }

  return (
    <>
      {upcomingTrips.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">即將到來</h2>
          <div className="flex flex-col gap-3">
            {upcomingTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      {pastTrips.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">過去的行程</h2>
          <div className="flex flex-col gap-3">
            {pastTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
