import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Power Move IQ" },
      { name: "description", content: "Sign in or create your Power Move IQ account." },
      { property: "og:title", content: "Sign in — Power Move IQ" },
      {
        property: "og:description",
        content: "Keep your cases, moves, and outcomes private and available.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});
function Auth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else await nav({ to: "/account" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
          emailRedirectTo: window.location.origin + "/account",
        },
      });
      if (error) setMsg(error.message);
      else if (!data.session)
        setMsg("Check your email to confirm your account, then return to sign in.");
      else await nav({ to: "/account" });
    }
    setBusy(false);
  }
  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) setMsg(result.error.message);
    else if (!result.redirected) await nav({ to: "/account" });
  }
  return (
    <div className="auth-wrap">
      <section className="auth-brand">
        <p className="eyebrow">POWER MOVE IQ</p>
        <h1>
          Know
          <br />
          your
          <br />
          next
          <br />
          move.
        </h1>
        <p className="text-xs tracking-[.12em]">PRIVATE · STRUCTURED · STRATEGIC</p>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <p className="eyebrow">{mode === "in" ? "WELCOME BACK" : "CREATE YOUR ACCOUNT"}</p>
          <h2>{mode === "in" ? "Continue thinking clearly." : "Keep what you learn."}</h2>
          <p>
            {mode === "in"
              ? "Your cases and outcomes are waiting."
              : "No onboarding maze. Start with your first decision."}
          </p>
          <Button variant="outline" className="w-full" onClick={google}>
            CONTINUE WITH GOOGLE
          </Button>
          <div className="divider">OR USE EMAIL</div>
          <form onSubmit={submit}>
            {mode === "up" && (
              <input
                className="field"
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="field"
              type="password"
              minLength={8}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={busy}>
              {busy ? "PLEASE WAIT…" : mode === "in" ? "SIGN IN" : "CREATE ACCOUNT"}
            </Button>
          </form>
          {msg && <div className="auth-msg mt-4">{msg}</div>}
          <p className="mt-6 text-xs text-muted-foreground">
            {mode === "in" ? "New here? " : "Already have an account? "}
            <button
              className="text-link bg-transparent border-0 cursor-pointer"
              onClick={() => setMode(mode === "in" ? "up" : "in")}
            >
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="mt-8 text-[10px] leading-5 text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link className="text-link" to="/terms">
              Terms
            </Link>{" "}
            and acknowledge our{" "}
            <Link className="text-link" to="/privacy">
              Privacy notice
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
