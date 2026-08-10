import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-md mx-auto min-h-screen relative">
        {children}
      </main>
    </div>
  );
}
