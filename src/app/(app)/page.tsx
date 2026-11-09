import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { TripListSection } from "@/components/trip/TripListSection";
import { AddFab } from "@/components/ui/AddFab";
import { getCurrentUser } from "@/lib/auth/get-current-user";

type UserMeta = {
  name?: string;
  avatar_url?: string;
};

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
        <TripListSection />
      </div>

      <AddFab href="/onboarding" title="新增行程" />
    </div>
  );
}
