const strField = { type: 'string' };
const optionalObject = keys => ({
  anyOf: [
    { type: 'object', properties: Object.fromEntries(keys.map(k => [k, strField])), required: keys, additionalProperties: false },
    { type: 'null' }
  ]
});
const turnSchema = {
  type: 'object', additionalProperties: false, required: ['reply', 'correction', 'vocabulary'],
  properties: { reply: strField, correction: optionalObject(['original','recast','tag','why']), vocabulary: optionalObject(['term','meaning','example']) }
};

export function createApi(catalog, prompts, records) {
  const json = (data, status=200) => Response.json(data, { status, headers: {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'} });
  const error = (message, status) => json({ error: message }, status);
  async function readLimited(request, max) {
    if (Number(request.headers.get('content-length')) > max) throw new RangeError('too big');
    const reader = request.body?.getReader();
    if (!reader) throw new SyntaxError('Missing body');
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > max) { await reader.cancel(); throw new RangeError('too big'); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    return new Blob(chunks, {type:request.headers.get('content-type') || ''});
  }
  async function budget(db, owner, kind) {
    if (!db) return false;
    const day = new Date().toISOString().slice(0,10);
    await db.prepare('DELETE FROM provider_usage WHERE day<?').bind(day).run();
    const q = db.prepare('INSERT INTO provider_usage VALUES (?,?,?,1) ON CONFLICT(user_id,day,kind) DO UPDATE SET n=n+1 WHERE n<60 RETURNING n').bind(owner, day, kind);
    return Boolean(await q.first());
  }
  const smallString = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  function validLive(r, text) {
    if (!r || !smallString(r.reply, 550)) return false;
    if (r.correction) {
      const c = r.correction;
      if (!smallString(c.original,400) || !smallString(c.recast,400) || !smallString(c.tag,80) || !smallString(c.why,320) || !text.includes(c.original)) r.correction = null;
    }
    if (r.vocabulary && (!smallString(r.vocabulary.term,80) || !smallString(r.vocabulary.meaning,250) || !smallString(r.vocabulary.example,350))) r.vocabulary = null;
    return true;
  }
  async function provider(path, init, env) {
    const headers = new Headers(init.headers);
    headers.set('Authorization','Bearer ' + (env.GROQ_API_KEY || env.OPENAI_API_KEY));
    const fn = env.providerFetch || fetch;
    return fn((env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1/' : 'https://api.openai.com/v1/') + path, {...init,headers,signal:AbortSignal.timeout(20000)});
  }
  return async function api(request, env, owner) {
    const path = new URL(request.url).pathname.replace('/api/v1','');
    const method = request.method;
    const origin = request.headers.get('origin');
    if (!['GET','HEAD'].includes(method) && origin && origin !== new URL(request.url).origin) return error('Cross-origin request declined.',403);
    const db = env.DB;
    try {
      if (method === 'GET' && path === '/config') return json({ live: Boolean((env.GROQ_API_KEY || env.OPENAI_API_KEY) && owner && db), sync: Boolean(db && owner), ...(env.GROQ_API_KEY ? {provider:'Groq'} : {}) });
      if (method === 'GET' && path === '/catalog') return json({tutors:catalog.tutors,scenarios:catalog.scenarios});
      if (!owner) return error('Sign in to use this feature.',401);
      if (method === 'GET' && path === '/sessions') return db ? json({reports:await records.readReports(db,owner)}) : error('Sync unavailable.',503);
      if (method === 'DELETE' && path === '/me') {
        if (!db) return error('Sync unavailable.',503);
        // Usage counters retain only the bounded daily allowance independent of learning records.
        await db.prepare('DELETE FROM users WHERE id=?').bind(owner).run();
        return json({deleted:true});
      }
      if (method === 'GET' && path === '/progress') {
        if (!db) return error('Sync unavailable.',503);
        await records.readReports(db,owner);
        const row = await db.prepare('SELECT sessions, turns, spoken_turns, practice_seconds, mean_self_rating FROM progress WHERE user_id=?').bind(owner).first();
        return json(row || {sessions:0,turns:0,spoken_turns:0,practice_seconds:0,mean_self_rating:null});
      }
      if (method === 'PUT' && path.startsWith('/sessions/')) {
        if (!db) return error('Sync unavailable.',503);
        const b = JSON.parse(await (await readLimited(request,128000)).text());
        if (b.consent !== true || !records.validReport(b.report,catalog) || path !== '/sessions/'+b.report.id) return error('Invalid report or missing consent.',400);
        if (Date.parse(b.report.date) > Date.now()+60000 || Date.parse(b.report.date) < Date.now()-30*86400000) return error('Report outside the 30-day window.',400);
        const status = await records.saveReport(db,owner,b.report,catalog.tutors[b.report.tutor]);
        return status === 409 ? error('Report ID unavailable.',409) : json({id:b.report.id},status);
      }
      if (method !== 'POST' || !['/turns','/transcriptions'].includes(path)) return error('Unknown endpoint.',404);
      if (!(env.GROQ_API_KEY || env.OPENAI_API_KEY) || !db) return error('Live AI is unavailable. Guided practice is ready.',503);
      if (request.headers.get('x-speakbuddy-consent') !== 'adult-live-v1') return error('Adult pilot and live processing consent required.',403);
      if (path === '/transcriptions') {
        const mime = (request.headers.get('content-type') || '').split(';')[0];
        const ext = { 'audio/webm':'webm','audio/mp4':'mp4','audio/ogg':'ogg','audio/wav':'wav' }[mime];
        if (!ext) return error('Unsupported audio format.',415);
        const blob = await readLimited(request,2*1024*1024);
        if (!blob.size) return error('Empty recording.',400);
        if (!await budget(db,owner,'audio')) return error('Daily audio limit reached.',429);
        const form = new FormData();
        form.append('model',env.GROQ_API_KEY ? 'whisper-large-v3-turbo' : (env.OPENAI_TRANSCRIBE_MODEL || 'gpt-transcribe'));
        form.append('file',blob,'utterance.'+ext);
        const out = await provider('audio/transcriptions',{method:'POST',body:form},env);
        if (!out.ok) return error('Transcription unavailable. Type your turn.',502);
        const result = await out.json();
        return typeof result.text === 'string' ? json({text:result.text.slice(0,1200)}) : error('No transcript received.',502);
      }
      const b = JSON.parse(await (await readLimited(request,16384)).text());
      if (!b || !smallString(b.text,1200) || !Object.hasOwn(catalog.scenarios,b.scenario) || !catalog.levels.includes(b.level) || !catalog.languages.includes(b.bridge) || !Object.hasOwn(catalog.tutors,b.tutor)) return error('Invalid turn.',400);
      const history = Array.isArray(b.history) ? b.history.slice(-8).filter(m=>m && ['assistant','user'].includes(m.role) && smallString(m.text,1200)).map(({role,text})=>({role,text})) : [];
      const memory = Array.isArray(b.memory) ? b.memory.filter(t=>smallString(t,80)).slice(0,3) : [];
      const data = {role:catalog.scenarios[b.scenario].role, goal:catalog.scenarios[b.scenario].goal, tutor:catalog.tutors[b.tutor].name, level:b.level, bridge:b.bridge,
        personality:['Encouraging','Direct','Curious'].includes(b.personality)?b.personality:'Encouraging',
        corrections:b.corrections==='Report only'?'Report only':'During practice', history, learnerApprovedTopics:memory, confirmedLearnerTurn:b.text};
      if (!await budget(db,owner,'text')) return error('Daily live turn limit reached.',429);
      const instructions = [prompts.tutorPrompt,prompts.grammarPrompt,prompts.rolePrompt].join('\n');
      const groq = Boolean(env.GROQ_API_KEY);
      const out = await provider(groq ? 'chat/completions' : 'responses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(groq ? {
        model:'llama-3.1-8b-instant',
        messages:[{role:'system',content:instructions+' Respond with a JSON object containing reply, correction and vocabulary. Use null for absent correction or vocabulary.'},{role:'user',content:JSON.stringify(data)}],
        response_format:{type:'json_object'},max_completion_tokens:380
      } : {
        model:env.OPENAI_MODEL || 'gpt-6-luna',store:false,instructions,
        input:JSON.stringify(data),reasoning:{effort:'none'},max_output_tokens:380,
        text:{format:{name:'tutor_turn',type:'json_schema',strict:true,schema:turnSchema}}
      })},env);
      if (!out.ok) return error('Live reply unavailable. Retry or switch to guided practice.',502);
      const answer = await out.json();
      const encoded = groq ? answer.choices?.find(choice=>choice.finish_reason==='stop')?.message?.content : answer.output?.flatMap(o=>o.content || []).find(c=>c.type==='output_text')?.text;
      if (answer.status === 'incomplete' || !encoded) return error('The tutor could not complete this turn.',502);
      let structured;
      try { structured = JSON.parse(encoded); } catch { return error('Could not read the live reply.',502); }
      return validLive(structured,b.text) ? json({...structured,engine:'live'}) : error('Incomplete tutor response.',502);
    } catch(e) {
      if (e instanceof RangeError) return error('Request is too large.',413);
      if (e instanceof SyntaxError) return error('Invalid JSON body.',400);
      return error('Temporarily unavailable. Your current practice can continue in guided mode.',503);
    }
  };
}
