import { Suspense } from "react";
import { redirect } from "next/navigation";
import { User, Map } from "lucide-react";
import { listTrips } from "@/lib/services/trip.service";
import { TripCard } from "@/components/trip/TripCard";
import { AddFab } from "@/components/ui/AddFab";
import { TripListSkeleton } from "@/components/ui/skeletons";
import { getCurrentUser } from "@/lib/auth/get-current-user";

type UserMeta = {
  name?: string;
  avatar_url?: string;
};

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

async function TripList({ userId }: { userId: string }) {
  const trips = await listTrips(userId);
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
              <TripCard
                key={trip.id}
                trip={{
                  ...trip,
                  startDate: toIsoDate(trip.startDate),
                  endDate: toIsoDate(trip.endDate),
                }}
              />
            ))}
          </div>
        </section>
      )}

      {pastTrips.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">過去的行程</h2>
          <div className="flex flex-col gap-3">
            {pastTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={{
                  ...trip,
                  startDate: toIsoDate(trip.startDate),
                  endDate: toIsoDate(trip.endDate),
                }}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const meta = (user.user_metadata ?? {}) as UserMeta;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div>
          <h1 className="font-brand text-3xl text-coral">旅路</h1>
          <p className="text-sm text-muted mt-0.5">
            你好，{meta.name ?? "旅人"} 👋
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-butter border border-border overflow-hidden flex items-center justify-center">
          {meta.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.avatar_url}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={18} className="text-wood" />
          )}
        </div>
      </div>

      <div className="px-6 flex flex-col gap-6 flex-1">
        <Suspense fallback={<TripListSkeleton count={2} />}>
          <TripList userId={user.id} />
        </Suspense>
      </div>

      <AddFab href="/onboarding" title="新增行程" />
    </div>
  );
}
