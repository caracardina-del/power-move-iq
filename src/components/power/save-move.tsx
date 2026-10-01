import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { isMoveSaved, setMoveSaved } from "@/lib/moves.functions";

/** Save/unsave a canonical Move. Signed-out users are sent to sign in. */
export function SaveMoveButton({ moveRef, compact = false }: { moveRef: string; compact?: boolean }) {
  const { user, ready } = useAuthUser();
  const nav = useNavigate();
  const check = useServerFn(isMoveSaved);
  const setSaved = useServerFn(setMoveSaved);
  const [saved, setS] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!user) return setS(false);
    void check({ data: { moveRef } }).then((r) => setS(r.saved)).catch(() => undefined);
  }, [user, moveRef, check]);
  async function toggle() {
    if (busy || !ready) return;
    if (!user) return void nav({ to: "/auth" });
    const next = !saved;
    setS(next);
    setBusy(true);
    try {
      const r = await setSaved({ data: { moveRef, saved: next } });
      if (!r.ok) { setS(!next); setNote(r.error); } else setNote(next ? "Saved." : "Removed.");
    } catch {
      setS(!next);
      setNote("Could not update. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const label = !user ? "Sign in to save this Move" : saved ? "Remove from saved Moves" : "Save this Move";
  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant={compact ? "ghost" : "outline"} size={compact ? "icon" : "default"} aria-label={label} aria-pressed={saved} disabled={busy} onClick={toggle}>
        <Bookmark className={saved ? "fill-current" : ""} />
        {!compact && (saved ? "SAVED" : "SAVE MOVE")}
      </Button>
      <span className="text-xs" aria-live="polite">{note}</span>
    </span>
  );
}
