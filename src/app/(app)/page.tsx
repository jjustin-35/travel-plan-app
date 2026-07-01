import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-charcoal">旅路</h1>
      <p className="text-muted mt-1">歡迎，{user?.user_metadata?.name ?? "旅人"}</p>
      <p className="text-sm text-muted mt-8">行程列表將在 Phase 6 實作</p>
    </div>
  );
}
