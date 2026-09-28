import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Bookmark, CircleUserRound, Info, Search, SunMedium } from "lucide-react";
import { Wordmark } from "./brand";
import { useEntitlement } from "@/hooks/use-entitlement";
const nav = [
  ["/today", "Today", SunMedium],
  ["/analyze", "Analyze", Search],
  ["/library", "Library", BookOpen],
  ["/saved", "Saved", Bookmark],
  ["/about", "About", Info],
  ["/account", "Account", CircleUserRound],
] as const;
export function SiteShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { tier } = useEntitlement();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="site-header">
        <Wordmark compact />
        <nav className="desktop-nav" aria-label="Primary">
          {nav.map(([to, label]) => (
            <Link key={to} to={to} className={path === to ? "active" : ""}>
              {label}
            </Link>
          ))}
        </nav>
        {tier === "pro" ? (
          <Link to="/account" className="header-cta">
            MANAGE
          </Link>
        ) : (
          <Link to="/pricing" className="header-cta">
            GO PRO
          </Link>
        )}
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <Wordmark compact />
        <p>Educational decision-support, not legal or financial advice.</p>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="mailto:powermoveiq@gmail.com">Support</a>
        </div>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.filter(([to]) => to !== "/about").map(([to, label, Icon]) => (
          <Link key={to} to={to} className={path === to ? "active" : ""}>
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  intro,
  action,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {intro && <p className="page-intro">{intro}</p>}
      </div>
      {action}
    </section>
  );
}
