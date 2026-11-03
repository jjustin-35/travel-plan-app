import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
};

/**
 * Deduplicates Supabase auth.getUser() within a single React Server request.
 * getUser() validates against the Auth server, so server-side authorization
 * respects revoked or invalidated sessions instead of trusting an unexpired JWT.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    user_metadata: (user.user_metadata ?? {}) as Record<string, unknown>,
  };
});
