import { Link } from "@tanstack/react-router";
import owl from "@/assets/power-move-owl.jpg.asset.json";
export function OwlSlot({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "owl-slot owl-slot-sm" : "owl-slot"}>
      <img src={owl.url} alt="Power Move IQ owl emblem" />
    </div>
  );
}
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="wordmark">
      <OwlSlot compact />
      <span>
        <b>POWER MOVE</b> IQ
      </span>
    </Link>
  );
}
