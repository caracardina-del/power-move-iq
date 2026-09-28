import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getEntitlement } from "@/lib/moveiq.functions";

/** Tier as verified by the server (never trusted from client-side state). */
export function useEntitlement() {
  const { user, ready } = useAuthUser();
  const fn = useServerFn(getEntitlement);
  const [tier, setTier] = useState<"free" | "pro" | null>(null);
  useEffect(() => {
    if (!user) {
      setTier(null);
      return;
    }
    let alive = true;
    fn()
      .then((r) => alive && setTier(r.tier))
      .catch(() => alive && setTier(null));
    return () => {
      alive = false;
    };
  }, [user, fn]);
  return { user, ready, tier, loading: !!user && tier === null };
}
