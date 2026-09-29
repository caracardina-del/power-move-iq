import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { checkoutUrl } from "@/lib/billing";

const RETURN_KEY = "pmiq:return-after-auth";
const RESUME_KEY = "pmiq:resume-analysis";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Power Move IQ" },
      {
        name: "description",
        content: "Sign in or create your Power Move IQ account.",
      },
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

function getReturnIntent() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(RETURN_KEY);
}

function Auth() {
  const [mode, setMode] = useState<"in" | "up">(() => (getReturnIntent() ? "up" : "in"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const nav = useNavigate();
  const returnIntent = getReturnIntent();
  const pendingAnalysis = returnIntent === "analyze";
  const pendingCheckout = returnIntent?.startsWith("checkout:") ?? false;

  async function continueAfterAuth(knownUser?: { id: string; email?: string | null }) {
    const intent = getReturnIntent();
    const user = knownUser ?? (await supabase.auth.getUser()).data.user;
    if (intent === "analyze") {
      window.sessionStorage.removeItem(RETURN_KEY);
      window.sessionStorage.setItem(RESUME_KEY, "1");
      window.location.assign("/analyze");
      return;
    }
    if (intent?.startsWith("checkout:") && user) {
      const plan = intent.endsWith("annual") ? "annual" : "monthly";
      window.sessionStorage.removeItem(RETURN_KEY);
      window.location.assign(checkoutUrl(plan, user));
      return;
    }
    await nav({ to: "/account", replace: true });
  }

  useEffect(() => {
    let alive = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const code = query.get("code");
    const oauthError = hash.get("error_description") ?? query.get("error_description");
    const clean = () => window.history.replaceState(null, "", window.location.pathname);
    void (async () => {
      if (oauthError) {
        clean();
        setMsg(oauthError);
        return;
      }
      if (access_token && refresh_token) {
        setFinishing(true);
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        clean();
        if (error) {
          if (alive) {
            setFinishing(false);
            setMsg("Google sign-in couldn't be completed. Please try again.");
          }
          return;
        }
      } else if (code) {
        setFinishing(true);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        clean();
        if (error) {
          if (alive) {
            setFinishing(false);
            setMsg("Google sign-in couldn't be completed. Please try again.");
          }
          return;
        }
      }
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      if (data.user) await continueAfterAuth(data.user);
      else setFinishing(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "in") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMsg(error.message);
      else if (data.user) await continueAfterAuth(data.user);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
          emailRedirectTo: window.location.origin + "/auth",
        },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Check your email to confirm your free account. Your situation is saved here.");
      else if (data.user) await continueAfterAuth(data.user);
    }
    setBusy(false);
  }

  async function google() {
    setMsg("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setMsg(result.error.message);
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) await continueAfterAuth(data.user);
    else setMsg("Google sign-in couldn't be completed. Please try again.");
  }

  if (finishing)
    return (
      <div className="auth-wrap">
        <section className="auth-form">
          <div className="auth-card" role="status">
            <p className="eyebrow">SIGNING YOU IN</p>
            <h2>
              {pendingAnalysis
                ? "Preparing your analysis."
                : pendingCheckout
                  ? "Opening secure checkout."
                  : "One moment."}
            </h2>
            <p>{pendingAnalysis ? "Your situation is saved." : "Securing your session…"}</p>
          </div>
        </section>
      </div>
    );

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
          <p className="eyebrow">
            {pendingAnalysis
              ? "YOUR SITUATION IS READY"
              : pendingCheckout
                ? "CONTINUE TO PRO"
                : mode === "in"
                  ? "WELCOME BACK"
                  : "CREATE YOUR ACCOUNT"}
          </p>
          <h2>
            {pendingAnalysis
              ? mode === "up"
                ? "Create your account to get your strategic read."
                : "Sign in to get your strategic read."
              : pendingCheckout
                ? mode === "up"
                  ? "Create your account to continue to secure checkout."
                  : "Sign in to continue to secure checkout."
                : mode === "in"
                  ? "Continue thinking clearly."
                  : "Keep what you learn."}
          </h2>
          <p>
            {pendingAnalysis
              ? "Your draft stays on this device until you sign in. No card required. Your account includes three introductory strategic reads each month."
              : pendingCheckout
                ? "Your selected plan is saved. You will review the price again on Stripe before paying."
                : mode === "in"
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
              {busy ? "PLEASE WAIT…" : mode === "in" ? "SIGN IN" : "CREATE MY ACCOUNT"}
            </Button>
          </form>
          {msg && <div className="auth-msg mt-4">{msg}</div>}
          <p className="mt-6 text-xs text-muted-foreground">
            {mode === "in" ? "New here? " : "Already have an account? "}
            <button
              className="text-link bg-transparent border-0 cursor-pointer"
              onClick={() => setMode(mode === "in" ? "up" : "in")}
            >
              {mode === "in" ? "Create a free account" : "Sign in"}
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
