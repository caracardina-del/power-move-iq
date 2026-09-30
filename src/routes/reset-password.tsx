import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Power Move IQ" },
      { name: "description", content: "Choose a new password for your Power Move IQ account." },
      { property: "og:title", content: "Reset password — Power Move IQ" },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    void supabase.auth.getSession().then(({ data: d }) => {
      setHasSession(!!d.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      window.history.replaceState(null, "", "/reset-password");
      await nav({ to: "/account", replace: true });
    }
  }

  return (
    <div className="auth-wrap">
      <section className="auth-form">
        <div className="auth-card">
          <p className="eyebrow">RESET PASSWORD</p>
          <h2>Choose a new password.</h2>
          {!ready ? (
            <p role="status">Checking your reset link…</p>
          ) : !hasSession ? (
            <>
              <p>This reset link is invalid or has expired.</p>
              <Button asChild className="mt-4">
                <Link to="/auth">REQUEST A NEW LINK</Link>
              </Button>
            </>
          ) : (
            <form onSubmit={submit}>
              <input
                className="field"
                type="password"
                minLength={8}
                placeholder="New password (8+ characters)"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
              <Button type="submit" disabled={busy}>
                {busy ? "PLEASE WAIT…" : "SAVE NEW PASSWORD"}
              </Button>
            </form>
          )}
          {msg && <div className="auth-msg mt-4">{msg}</div>}
        </div>
      </section>
    </div>
  );
}
