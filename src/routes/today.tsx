import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth-user";
function useStreak() {
  const { user } = useAuthUser();
  const [s, setS] = useState<{ cur: number; long: number } | null>(null);
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("streaks")
        .select("current_streak,longest_streak,last_active_date")
        .eq("user_id", user.id)
        .maybeSingle();
      let cur = data?.current_streak ?? 0;
      let long = data?.longest_streak ?? 0;
      if (data?.last_active_date !== today) {
        cur = data?.last_active_date === y ? cur + 1 : 1;
        long = Math.max(long, cur);
        await supabase.from("streaks").upsert(
          {
            user_id: user.id,
            current_streak: cur,
            longest_streak: long,
            last_active_date: today,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      }
      setS({ cur, long });
    })();
  }, [user]);
  return { user, s };
}
export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today — Power Move IQ" },
      { name: "description", content: "A daily strategic move and this week’s decision lens." },
      { property: "og:title", content: "Today — Power Move IQ" },
      { property: "og:description", content: "Build your judgment one move at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Today,
});
type DailyMove = {
  id: number;
  move_number: number;
  title: string;
  category: string;
  principle: string;
  field_note: string;
};
function dayOfYear() {
  const d = new Date();
  return Math.floor(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000,
  );
}
function Today() {
  const { user, s } = useStreak();
  const nav = useNavigate();
  const [move, setMove] = useState<DailyMove | null>(null);
  const [moveErr, setMoveErr] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const num = ((dayOfYear() - 1) % 10) + 1;
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const loadMove = useCallback(() => {
    setMoveErr(false);
    void supabase
      .from("moves")
      .select("id, move_number, title, category, principle, field_note")
      .eq("move_number", num)
      .maybeSingle()
      .then(({ data, error }) => (error || !data ? setMoveErr(true) : setMove(data)));
  }, [num]);
  useEffect(loadMove, [loadMove]);
  useEffect(() => {
    if (!user || !move) return setSaved(false);
    void supabase
      .from("favorite_moves")
      .select("move_id")
      .eq("user_id", user.id)
      .eq("move_id", move.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, move]);
  const timer = useRef<number | undefined>(undefined);
  function flash(t: string) {
    setNote(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(""), 2500);
  }
  async function toggleSave() {
    if (!move || busy) return;
    if (!user) {
      await nav({ to: "/auth" });
      return;
    }
    const next = !saved;
    setSaved(next);
    setBusy(true);
    const { error } = next
      ? await supabase.from("favorite_moves").insert({ user_id: user.id, move_id: move.id })
      : await supabase.from("favorite_moves").delete().eq("user_id", user.id).eq("move_id", move.id);
    setBusy(false);
    if (error && !(next && error.code === "23505")) {
      setSaved(!next);
      flash("Could not update. Please try again.");
    } else flash(next ? "Saved to your moves." : "Removed from saved moves.");
  }
  async function share() {
    const url = `${window.location.origin}/today`;
    const title = move ? `${move.title} — Power Move IQ` : "Power Move IQ — Today";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied.");
    } catch {
      flash(url);
    }
  }
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={`${day} · DAILY MOVE`}
        title="Today"
        intro="One precise idea to sharpen the way you negotiate, decide, and respond."
      />
      <div className="today-grid">
        <article className="daily-move">
          <div className="daily-number" aria-label={`Move number ${num} of 10`}>
            {String(num).padStart(2, "0")}
          </div>
          {moveErr ? (
            <>
              <h2>Today’s move could not be loaded.</h2>
              <Button variant="editorial" onClick={loadMove}>
                RETRY
              </Button>
            </>
          ) : !move ? (
            <p className="eyebrow">LOADING TODAY’S MOVE…</p>
          ) : (
            <>
              <p className="eyebrow">
                {move.category.toUpperCase()} · MOVE {num} OF 10
              </p>
              <h2>{move.title.replace(/\s*·\s*\d+$/, "")}</h2>
              <p>{move.principle}</p>
              <div className="move-actions">
                <small>
                  FIELD NOTE
                  <br />
                  {move.field_note}
                </small>
                <div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={saved ? "Remove from saved moves" : user ? "Save move" : "Sign in to save move"}
                    aria-pressed={saved}
                    onClick={toggleSave}
                    disabled={busy}
                  >
                    <Bookmark className={saved ? "fill-current" : ""} />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Share move" onClick={share}>
                    <Share2 />
                  </Button>
                </div>
              </div>
              <p className="mt-3 min-h-5 text-xs" aria-live="polite">
                {note}
              </p>
            </>
          )}
        </article>
        <aside>
          <div className="streak-card">
            <p className="eyebrow">CURRENT STREAK</p>
            <div>
              <span className="streak-value">{s?.cur ?? 0}</span> <small>DAYS</small>
            </div>
            <div className="week-dots" aria-hidden="true">
              {Array.from({ length: 7 }, (_, i) => (i < Math.min(s?.cur ?? 0, 7) ? 1 : 0)).map((x, i) => (
                <i key={i} className={x ? "on" : ""} />
              ))}
            </div>
            <small>
              {user ? (
                `Longest streak · ${s?.long ?? 0} days · counts days you open Today`
              ) : (
                <Link to="/auth" className="text-link">
                  Sign in to track your streak
                </Link>
              )}
            </small>
          </div>
          <div className="lens-card">
            <p className="eyebrow">WEEKLY STRATEGY LENS</p>
            <h3>The Cost of Unclear</h3>
            <p>Ambiguity usually benefits the side asking you to wait, stretch, or absorb risk.</p>
            <Button asChild variant="editorial">
              <Link to="/weekly">
                OPEN THE LENS <ArrowRight />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
