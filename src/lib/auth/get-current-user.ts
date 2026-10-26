import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
};

/**
 * Prefer getClaims() over getUser(): verifies JWT locally (JWKS) without an
 * Auth-server round trip. Deduplicates within a single React Server request
 * via React cache(); does not share cache across proxy / separate API requests.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    return null;
  }

  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
  };
});
