import { Button } from "@/components/ui/button";
import { LockKeyhole } from "lucide-react";
export function GoldRule(){return <div className="gold-rule"/>}
export function StatePanel({ type="empty", title, body }: { type?:"empty"|"loading"|"error";title:string;body:string }){return <div className={`state-panel state-${type}`}><span>{type==="loading"?"···":type==="error"?"!":"—"}</span><h3>{title}</h3><p>{body}</p></div>}
export function ProLock({ text="Included with Pro" }:{text?:string}){return <span className="pro-lock"><LockKeyhole/>{text}</span>}
export function PricingCard(){return <div className="pricing-card"><p className="eyebrow">POWER MOVE IQ PRO</p><h3>Decisions compound.</h3><p>Full analyses, Power Maps, scripts, countermoves, saved cases, Outcome Memory, follow-ups, and Weekly IQ.</p><div className="price-row"><strong>$14.99</strong><span>/ month</span></div><div className="annual">or $99 billed yearly <b>save 45%</b></div><Button size="lg" className="w-full">START PRO</Button><small>Cancel anytime. Subscription terms apply.</small></div>}
