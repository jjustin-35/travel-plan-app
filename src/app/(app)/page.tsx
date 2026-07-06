import { createClient } from "@/lib/supabase/server";
import { listTrips } from "@/lib/services/trip.service";
import { User, Map } from "lucide-react";
import { TripCard } from "@/components/trip/TripCard";
import { AddFab } from "@/components/ui/AddFab";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const trips = user ? await listTrips(user.id) : [];

  const now = new Date();
  const upcomingTrips = trips.filter((t) => new Date(t.endDate) >= now);
  const pastTrips = trips.filter((t) => new Date(t.endDate) < now);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div>
          <h1 className="font-brand text-3xl text-coral">旅路</h1>
          <p className="text-sm text-muted mt-0.5">
            你好，{user?.user_metadata?.name ?? "旅人"} 👋
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-butter border border-border overflow-hidden flex items-center justify-center">
          {user?.user_metadata?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={18} className="text-wood" />
          )}
        </div>
      </div>

      <div className="px-6 flex flex-col gap-6 flex-1">
        {trips.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-butter mb-4">
              <Map size={44} className="text-coral" strokeWidth={1.5} />
            </div>
            <p className="font-bold text-charcoal text-lg">還沒有行程</p>
            <p className="text-sm text-muted mt-1 leading-relaxed max-w-xs">
              點擊右下角的 + 按鈕，讓 AI 幫你規劃第一趟旅程
            </p>
          </div>
        ) : (
          <>
            {upcomingTrips.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted mb-3">
                  即將到來
                </h2>
                <div className="flex flex-col gap-3">
                  {upcomingTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={{
                        ...trip,
                        startDate:
                          trip.startDate instanceof Date
                            ? trip.startDate.toISOString()
                            : String(trip.startDate),
                        endDate:
                          trip.endDate instanceof Date
                            ? trip.endDate.toISOString()
                            : String(trip.endDate),
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastTrips.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted mb-3">
                  過去的行程
                </h2>
                <div className="flex flex-col gap-3">
                  {pastTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={{
                        ...trip,
                        startDate:
                          trip.startDate instanceof Date
                            ? trip.startDate.toISOString()
                            : String(trip.startDate),
                        endDate:
                          trip.endDate instanceof Date
                            ? trip.endDate.toISOString()
                            : String(trip.endDate),
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <AddFab href="/onboarding" title="新增行程" />
    </div>
  );
}
