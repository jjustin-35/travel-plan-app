import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Deduplicates Supabase auth.getUser() within a single React Server request.
 * Does not share cache across proxy / separate API HTTP requests.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
