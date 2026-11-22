import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/local-db.js';
import { createApi } from '../src/api.js';
import * as catalog from '../public/catalog.js';
import * as prompts from '../src/prompts.js';
import * as records from '../src/records.js';
import { guidedTurn, hintFor, makeReport, correctionFor } from '../public/coach.js';
import { practicePatterns, week } from '../public/store.js';

const api=createApi(catalog,prompts,records);
const turn={text:'Yesterday I go to college to meet my team.',scenario:'interview',level:'Intermediate',bridge:'Kannada',tutor:'mira',turn:1,personality:'Encouraging'};
function reportFixture() {
  const reply=guidedTurn(turn);
  return makeReport({id:crypto.randomUUID(),started:Date.now()-4000,tutor:'mira',scenario:'interview',level:'Intermediate',engine:'guided',
    turns:[{role:'user',input:'typed',text:turn.text,turn:1},{role:'assistant',text:reply.reply,turn:1,correction:reply.correction,vocabulary:reply.vocabulary}]},4);
}
function setup(t,extra={}) {
  const db=openDatabase(':memory:');t.after(()=>db.close());
  return {DB:db,...extra};
}
function call(env,method,path,body,owner='one',headers={}) {
  return api(new Request('https://studio.test/api/v1'+path,{method,body:body===undefined?undefined:JSON.stringify(body),headers:{'Content-Type':'application/json',...headers}}),env,owner);
}
test('guided coach models the whole sentence and follows its meaning',()=>{
  const reply=guidedTurn(turn);
  assert.match(reply.reply,/Yesterday I went to college/);
  assert.match(reply.reply,/part in the team/);
  assert.equal(reply.correction.original,'Yesterday I go');
  assert.equal(correctionFor('I agree with our teacher.'),null);
});
test('report-only timing keeps the recast out of the spoken reply',()=>{
  const reply=guidedTurn({...turn,corrections:'Report only'});
  assert.ok(reply.correction);assert.doesNotMatch(reply.reply,/went|could say/i);
});
test('language scaffolds, all seven role-plays and the three levels have usable prompts',()=>{
  assert.equal(Object.keys(catalog.scenarios).length,7);
  for(const language of ['Kannada','Hindi','Tamil'])assert.match(hintFor('daily',language),/means/);
  for(const scenario of Object.keys(catalog.scenarios))for(const level of catalog.levels) {
    assert.match(guidedTurn({...turn,scenario,level,text:'I am not sure'}).reply,/\?/);
  }
});
test('reports retain turn references, require explicit confidence, never infer sounds',()=>{
  const r=reportFixture();assert.equal(r.confidence,4);assert.equal(r.pronunciation,null);assert.equal(r.spokenTurns,0);
  assert.equal(r.corrections[0].turn,1);assert.deepEqual(practicePatterns([r,r]),[['past tense',2]]);
  const empty=makeReport({started:Date.now(),scenario:'daily',turns:[]},null);
  assert.equal(empty.confidence,null);assert.equal(empty.turnCount,0);
  const tuesday=new Date(2026,10,17,12);
  assert.equal(week([{date:tuesday.toISOString()}],tuesday).filter(d=>d.active).length,1);
});
test('backup is atomic and idempotent, reports restore identically and erasure cascades',async t=>{
  const env=setup(t),r=reportFixture(),url='/sessions/'+r.id,b={consent:true,report:r};
  assert.equal((await call(env,'PUT',url,b)).status,201);
  assert.equal((await call(env,'PUT',url,b)).status,200);
  assert.deepEqual((await (await call(env,'GET','/sessions')).json()).reports,[r]);
  assert.equal((await (await call(env,'GET','/progress')).json()).sessions,1);
  assert.equal((await call(env,'DELETE','/me')).status,200);
  for(const table of ['sessions','messages','mistakes','feedback','vocabulary','users'])assert.equal(env.DB.prepare('SELECT COUNT(*) n FROM '+table).first().n,0);
});
test('other learners cannot restore, overwrite or erase a report',async t=>{
  const env=setup(t),r=reportFixture(),path='/sessions/'+r.id,b={report:r,consent:true};
  await call(env,'PUT',path,b);
  assert.equal((await call(env,'PUT',path,b,'two')).status,409);
  assert.deepEqual((await (await call(env,'GET','/sessions',undefined,'two')).json()).reports,[]);
  await call(env,'DELETE','/me',undefined,'two');
  assert.equal((await (await call(env,'GET','/sessions')).json()).reports.length,1);
});
test('sync rejects missing consent, bad scores, duplicate evidence and expired reports',async t=>{
  const env=setup(t),r=reportFixture(),path='/sessions/'+r.id;
  for(const b of [{report:r},{consent:true,report:{...r,confidence:9}},{consent:true,report:{...r,corrections:[...r.corrections,...r.corrections]}},{consent:true,report:{...r,date:'2020-01-01'}}]) {
    assert.equal((await call(env,'PUT',path,b)).status,400);
  }
});
test('capability and write endpoints enforce identity, consent and same-origin input',async t=>{
  const env=setup(t);
  assert.deepEqual(await (await call(env,'GET','/config')).json(),{live:false,sync:true});
  assert.equal((await call(env,'POST','/turns',turn)).status,503);
  assert.equal((await call(env,'GET','/sessions',undefined,null)).status,401);
  assert.equal((await call(env,'DELETE','/me',undefined,'one',{origin:'https://elsewhere.test'})).status,403);
  assert.equal((await call({...env,OPENAI_API_KEY:'fixture'},'POST','/turns',turn)).status,403);
});
const consent={'X-SpeakBuddy-Consent':'adult-live-v1'};
test('live adapter requests structured JSON, disables response storage and drops invented evidence',async t=>{
  const env=setup(t,{OPENAI_API_KEY:'fixture',providerFetch:async(url,init)=>{
    assert.match(url,/responses$/);
    const b=JSON.parse(init.body);
    assert.equal(b.store,false);assert.equal(b.text.format.strict,true);assert.match(b.instructions,/Indian English/);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'What did you learn?',correction:{original:'never said',recast:'test',tag:'grammar',why:'test'},vocabulary:null})}]}]});
  }});
  const out=await call(env,'POST','/turns',turn,'one',consent);
  assert.equal(out.status,200);assert.deepEqual(await out.json(),{reply:'What did you learn?',correction:null,vocabulary:null,engine:'live'});
});
test('provider errors preserve a retry option; the daily cap survives concurrent requests',async t=>{
  const env=setup(t,{OPENAI_API_KEY:'fixture',providerFetch:async()=>Response.json({},{status:503})});
  const a=await call(env,'POST','/turns',turn,'one',consent);assert.equal(a.status,502);
  const today=new Date().toISOString().slice(0,10);
  env.DB.prepare("UPDATE provider_usage SET n=59 WHERE day=? AND kind='text'").bind(today).run();
  const results=await Promise.all([call(env,'POST','/turns',turn,'one',consent),call(env,'POST','/turns',turn,'one',consent)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[429,502]);
});
test('audio accepts a bounded recording, forwards only the file and returns editable text',async t=>{
  const env=setup(t,{OPENAI_API_KEY:'fixture',providerFetch:async(url,init)=>{
    assert.match(url,/audio\/transcriptions$/);assert.equal(init.body.get('file').size,3);assert.equal(init.body.get('model'),'gpt-transcribe');
    return Response.json({text:'a practice turn'});
  }});
  const audio=(mime,body)=>api(new Request('https://studio.test/api/v1/transcriptions',{method:'POST',headers:{...consent,'Content-Type':mime},body}),env,'one');
  assert.equal((await audio('text/plain','abc')).status,415);
  assert.equal((await audio('audio/webm',new Uint8Array(2*1024*1024+1))).status,413);
  assert.deepEqual(await (await audio('audio/webm',new Uint8Array(3))).json(),{text:'a practice turn'});
});
test('refusals and broken upstream JSON leave the learner free to choose guided practice',async t=>{
  const env=setup(t,{OPENAI_API_KEY:'fixture'});
  for(const output of [[{content:[{type:'refusal',refusal:'No reply'}]}],[{content:[{type:'output_text',text:'broken'}]}]]) {
    const res=await call({...env,providerFetch:async()=>Response.json({output})},'POST','/turns',turn,'one',consent);
    assert.equal(res.status,502);
  }
});
test('every scenario opener and tutor preview has an exact bundled voice clip',async()=>{
  const {clipFor}=await import('../public/clip-audio.js');
  for(const tutor of Object.keys(catalog.tutors)) {
    for(const scene of Object.values(catalog.scenarios)) {
      const clip=clipFor(scene.opening,tutor);
      assert.equal(clip.exact,true);assert.ok(clip.cue[1]>1);
      assert.equal(clipFor('I see. '+scene.questions[0],tutor).exact,false);
    }
    assert.equal(clipFor('Take your time. What would you like to practise?',tutor).exact,true);
    assert.equal(clipFor('A completely unprepared reply.',tutor),null);
  }
});
