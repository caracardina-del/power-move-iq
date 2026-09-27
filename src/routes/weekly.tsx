import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { ProLock } from "@/components/power/ui";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getWeeklyLens } from "@/lib/moveiq.functions";
export const Route=createFileRoute("/weekly")({head:()=>({meta:[{title:"Weekly Strategy Lens — Power Move IQ"},{name:"description",content:"A weekly framework for seeing leverage, ambiguity, and tradeoffs clearly."},{property:"og:title",content:"Weekly Strategy Lens"},{property:"og:description",content:"This week: The Cost of Unclear."},{property:"og:type",content:"article"},{name:"twitter:card",content:"summary_large_image"}]}),component:Weekly});
type D=Awaited<ReturnType<typeof getWeeklyLens>>;
function Weekly(){const {user}=useAuthUser();const fn=useServerFn(getWeeklyLens);const [d,setD]=useState<D|null>(null);useEffect(()=>{if(user)fn().then(setD).catch(()=>setD(null))},[user,fn]);
const lens=d?.lens;const pro=d?.tier==="pro";
return <div className="page-shell article"><p className="eyebrow">WEEKLY IQ · STRATEGY LENS</p><h1>The Cost of Unclear</h1><p className="lead">Ambiguity is rarely neutral. In professional situations, it often transfers risk to the person willing to wait, stretch, or keep working without a decision.</p>
{pro&&lens?<>{lens.sections.map(s=><div key={s.h}><h2>{s.h}</h2><p>{s.p}</p></div>)}<h2>Three questions</h2><ol>{lens.questions.map(q=><li key={q}>{q}</li>)}</ol><h2>This week’s practice</h2><p>{lens.exercise}</p></>
:<div className="mt-8"><ProLock/><p className="mt-4">The full lens — questions and weekly practice — is included with Pro.</p><Button asChild className="mt-5"><Link to={user?"/pricing":"/auth"}>{user?"VIEW PRO":"SIGN IN"}</Link></Button></div>}</div>}
