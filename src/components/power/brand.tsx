import { Link } from "@tanstack/react-router";
export function OwlSlot({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "owl-slot owl-slot-sm" : "owl-slot"} aria-label="Approved owl emblem placeholder"><span>OWL</span></div>;
}
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return <Link to="/" className="wordmark"><OwlSlot compact /><span><b>POWER MOVE</b> IQ</span></Link>;
}
