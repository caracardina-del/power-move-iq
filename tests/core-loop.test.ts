import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analysisSchema, limit } from '../src/lib/moveiq-schema.ts';
import { selectOutcomePrecedent } from '../src/lib/outcome-precedent.ts';
import { AnalysisError, generateAnalysis } from '../src/lib/moveiq.server.ts';

const situation = 'A client expanded campaign scope after approving the original fee and refuses extra payment for revised deliverables.';
const input = { situation, type: 'Client negotiation', urgency: 'Decision today' };
const history = { id: 'outcome-one', analysis_id: 'case-one', outcome: 'negotiated', chosen_move: 'Offer separately priced scope', result_note: 'They approved the revised deliverables and paid the additional fee.', recorded_at: '2026-10-01', analyses: { situation, context: { type: input.type }, status: 'complete' } };
const result = analysisSchema.parse({title:'Separate the added scope',read:{headline:'The scope changed'},counterpart:{headline:'Scope creep'},power_map:{headline:'A fee already approved'},move:{headline:'Separate the added scope',recommended:'Offer two written scope choices.',rationale:'The original approval covers a different scope.',confidence_note:'Medium: approval terms are unknown.'},do_this_now:['List the additional deliverables.','Send two priced options.'],watch_out:['Check the approved scope first.'],scripts:{diplomatic:'A',direct:'B',hard_line:'C'},second_move:{if_success:'Confirm',if_failure:'Pause',if_no_response:'Follow up'},dont_do:{action:'Absorb it silently',why:'It obscures the changed scope'},exit_line:{conditions:[],line:''},precedent:{include:true,name:'Invented historical story',source:'Imaginary book'}});

test('relevant recorded outcome produces a traceable private precedent',()=>{
 const p=selectOutcomePrecedent(input,[history]); assert.equal(p?.include,true); assert.ok(p?.source?.includes('case-one')); assert.equal(p?.what_happened,'negotiated: '+history.result_note);
});
test('weak, absent, archived, unmatched, or undocumented history is omitted',()=>{
 assert.equal(selectOutcomePrecedent(input,[]),undefined);
 for (const row of [{...history,result_note:''},{...history,outcome:'ghosted'},{...history,analyses:{...history.analyses,status:'archived'}},{...history,analyses:{...history.analyses,situation:'An unrelated manager asks about attending a conference next summer.'}},{...history,analyses:{...history.analyses,context:{type:'Boundary'}}}]) assert.equal(selectOutcomePrecedent(input,[row]),undefined);
 assert.equal(selectOutcomePrecedent({...input,type:'Other'},[history]),undefined);
});
test('free result retains core structure and excludes premium scripts',()=>{
 const free=limit(result); assert.equal(free.move.rationale,result.move.rationale); assert.deepEqual(free.do_this_now,result.do_this_now); assert.deepEqual(free.watch_out,result.watch_out); assert.ok(!('scripts' in free));
});
test('real-input transport, response validation, failure handling, and fabricated precedent rejection',async()=>{
 const originalFetch=globalThis.fetch; const key=process.env.LOVABLE_API_KEY;
 process.env.LOVABLE_API_KEY='test-only-placeholder';
 let sent:any;
 try {
 globalThis.fetch=async (_url, options)=> {sent=JSON.parse(options!.body as string); return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}),{status:200});};
 const generated=await generateAnalysis(input); assert.ok(sent.messages[1].content.includes(situation)); assert.equal(generated.precedent.include,false);
 const precedent=selectOutcomePrecedent(input,[history]); const supported=await generateAnalysis({...input,precedent}); assert.deepEqual(supported.precedent,precedent);
 globalThis.fetch=async()=>new Response('{}',{status:429}); await assert.rejects(generateAnalysis(input),AnalysisError);
 globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'not JSON'}}]}),{status:200}); await assert.rejects(generateAnalysis(input),AnalysisError);
 globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({...result,do_this_now:[]})}}]}),{status:200}); await assert.rejects(generateAnalysis(input),AnalysisError);
 } finally {globalThis.fetch=originalFetch; if(key===undefined) delete process.env.LOVABLE_API_KEY; else process.env.LOVABLE_API_KEY=key;}
});
