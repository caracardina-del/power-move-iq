import { createFileRoute, Link } from "@tanstack/react-router";
import { Share2, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getDailyMove } from "@/lib/moves.functions";
import { categoryLabel } from "@/content/moves/taxonomy";
import { SaveMoveButton } from "@/components/power/save-move";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/power/shell";
import { useCallback, useEffect, useRef, useState } from "react";
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
function Today() {
  const { user, s } = useStreak();
  const fetchDaily = useServerFn(getDailyMove);
  const [move, setMove] = useState<Awaited<ReturnType<typeof getDailyMove>> | undefined>(undefined);
  const [moveErr, setMoveErr] = useState(false);
  const [note, setNote] = useState("");
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const loadMove = useCallback(() => {
    setMoveErr(false);
    setMove(undefined);
    fetchDaily().then(setMove).catch(() => setMoveErr(true));
  }, [fetchDaily]);
  useEffect(loadMove, [loadMove]);
  const timer = useRef<number | undefined>(undefined);
  function flash(t: string) {
    setNote(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(""), 2500);
  }
  async function share() {
    const url = move ? `${window.location.origin}/library/${move.slug}` : `${window.location.origin}/today`;
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
          {moveErr ? (
            <>
              <h2>Today’s Move could not be loaded.</h2>
              <Button variant="editorial" onClick={loadMove}>RETRY</Button>
            </>
          ) : move === undefined ? (
            <p className="eyebrow" role="status">LOADING TODAY’S MOVE…</p>
          ) : move === null ? (
            <>
              <h2>No Move is published yet.</h2>
              <p>Daily Moves appear once Library Moves pass editorial review.</p>
            </>
          ) : (
            <>
              <div className="daily-number" aria-hidden="true">{String(move.number).padStart(2, "0")}</div>
              <p className="eyebrow">
                MOVE {move.number} OF {move.total} · {categoryLabel(move.category).toUpperCase()}
                {move.reviewDraft ? " · REVIEW DRAFT" : ""}
              </p>
              <h2>{move.title}</h2>
              <p>{move.principle}</p>
              <div className="move-actions">
                <small>
                  IN SHORT
                  <br />
                  {move.summary}
                </small>
                <div>
                  <SaveMoveButton moveRef={move.id} compact />
                  <Button variant="ghost" size="icon" aria-label="Share this Move" onClick={share}>
                    <Share2 />
                  </Button>
                </div>
              </div>
              <Button asChild variant="editorial" className="mt-4">
                <Link to="/library/$slug" params={{ slug: move.slug }}>READ THE FULL MOVE <ArrowRight /></Link>
              </Button>
              <p className="mt-3 min-h-5 text-xs" aria-live="polite">{note}</p>
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
