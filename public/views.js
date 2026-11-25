import { tutors, scenarios, accents, levels, languages } from './catalog.js';
import { icon } from './icons.js';
import { tutorVoices } from './audio.js';
import { week, practicePatterns } from './store.js';

export const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const art = (name, extra='') => `<img src="/art/${esc(name)}.webp" alt="" ${extra}>`;
export const btn = (act,label,cls='primary') => `<button type="button" class="${cls}" data-act="${act}">${label}</button>`;
const field = (label,key,items,value) => `<label class="field"><span>${esc(label)}</span><select name="${key}">${items.map(i=>{
  const [v,display]=Array.isArray(i)?i:[i,i];return `<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(display)}</option>`;
}).join('')}</select></label>`;
const toggle = (key,label,note,checked) => `<label class="toggle"><span><b>${esc(label)}</b><small>${esc(note)}</small></span><input type="checkbox" name="${key}" ${checked?'checked':''}><i aria-hidden="true"></i></label>`;
const section = txt => `<div class="section-head"><h2>${txt}</h2></div>`;
const dateText=date=>new Date(date).toLocaleDateString(undefined,{day:'numeric',month:'short'});
const mins=s=>s<60?'Under 1 min':Math.round(s/60)+' min';
const title=(label,txt)=>`<div class="page-intro"><p class="eyebrow">${esc(label)}</p><h1>${esc(txt)}</h1></div>`;
export function header(view) {
  if(view==='home') return `<div class="brand"><img src="/mark.svg" alt=""><span>SpeakBuddy</span></div><button class="icon-btn" data-act="settings" aria-label="Settings">${icon('gear',21)}</button>`;
  if(view==='call')return `<span class="call-heading">${icon('wave',18)} Speaking session</span>${btn('end',icon('end',18)+' End','end-link')}`;
  const names={login:'SpeakBuddy',tutors:'Tutor studio',scenarios:'Role-play library',setup:'Session setup',summary:'Practice report',progress:'Your progress',settings:'Settings'};
  return `<button class="icon-btn back" aria-label="Back" data-act="back">${icon('back')}</button><strong class="bar-title">${names[view]||''}</strong><span class="header-space"></span>`;
}
export function nav(view) {
  return [['home','home','Practice'],['tutors','tutors','Tutors'],['progress','chart','Progress']].map(([id,g,label])=>
    `<button class="tab ${view===id?'active':''}" data-act="nav" data-id="${id}" ${view===id?'aria-current="page"':''}><span>${icon(g,21)}</span>${label}</button>`).join('');
}
function sceneCard(id) {
  const s=scenarios[id];
  return `<button class="scene" data-act="scenario" data-id="${id}"><span class="scene-art">${art(s.art)}</span><b>${s.title}</b><small>${s.category} <i>·</i> ${s.mins} min</small></button>`;
}
function weekCard(reports,prefs) {
  const days=week(reports), count=days.filter(d=>d.active).length;
  return `<div class="week-card"><div class="week-line"><span class="week-mark">${icon('calendar',18)}</span><h3>This week</h3><span class="goal">${count} / ${prefs.goal} days</span></div>
  <div class="day-row">${days.map((d,i)=>`<div class="day ${d.active?'done':''} ${d.today?'today':''}" aria-label="${d.day.toLocaleDateString(undefined,{weekday:'long'})}, ${d.active?'practised':'no saved practice'}"><i>${d.active?icon('check',14):''}</i><span>${['M','T','W','T','F','S','S'][i]}</span></div>`).join('')}</div></div>`;
}
export function launcher() {
  const today=new Date();
  const day=today.toLocaleDateString(undefined,{weekday:'short'});
  return `<section class="springboard" aria-label="Phone home screen">
    <div class="date-widget"><span>${esc(today.toLocaleDateString(undefined,{month:'long',year:'numeric'}))}</span>
    <strong>${esc(today.toLocaleDateString(undefined,{weekday:'long'}))}</strong></div>
    <div class="phone-grid">
      <div class="phone-tile" aria-hidden="true"><div class="app-icon date-icon"><small>${esc(day)}</small><b>${today.getDate()}</b></div>Calendar</div>
      <div class="phone-tile" aria-hidden="true"><div class="app-icon clock-icon">${icon('clock',48)}</div>Clock</div>
      <div class="phone-tile" aria-hidden="true"><div class="app-icon notes-icon"></div>Notes</div>
      <button class="phone-tile" type="button" data-act="open-buddy" aria-label="Open SpeakBuddy"><img class="app-icon" src="/mark.svg" alt="">SpeakBuddy</button>
    </div></section>`;
}
export function login(config) {
  let action;
  if(config.connectionError)action=btn('open-buddy','Retry connection','secondary wide');
  else if(config.accounts)action='<a class="primary wide login-link" target="_top" href="/api/v1/auth/login">Continue to sign in</a>';
  else action='<p class="fine">To enable local sign-in, configure Auth0 in the server’s .env file and restart SpeakBuddy.</p>';
  return `<section class="signin-panel"><img src="/mark.svg" width="68" height="68" alt="">
    <h1>Sign in to SpeakBuddy</h1><p>${config.connectionError?'SpeakBuddy couldn’t reach the server.':config.accountProvider==='hosted'?'Use your Google account or email on the ChatGPT sign-in page.':'Use your Google account or email to open your speaking studio.'}</p>${action}</section>`;
}
export function home({prefs:p,reports}) {
  const t=tutors[p.tutor];
  return `<section class="home-content"><div class="welcome"><p class="eyebrow">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})}</p><h1>${p.name?'Hello, '+esc(p.name)+'.':'Let’s talk.'}</h1></div>
  <article class="hero">${art(p.tutor+'-rest','class="hero-portrait"')}<div class="hero-shade"></div><div class="hero-orbits" aria-hidden="true"></div>
  <div class="hero-copy"><span class="tutor-label">${icon('wave',14)} AI TUTOR</span><h2><span>Practice with</span><em>${t.name}.</em></h2><p>${t.description}</p>
  ${btn('start',icon('mic',16)+' Start practice','hero-button')}</div></article>
  <div class="section-head"><h2>Practice scenarios</h2>${btn('scenarios','View all','text-button')}</div>
  <div class="scene-strip">${['interview','daily','airport','presentation'].map(sceneCard).join('')}</div>
  ${weekCard(reports,p)}</section>`;
}
export function library() {
  return title('Real-life practice','Choose a scenario.')+
    `<div class="search-box">${icon('search',18)}<input id="scene-search" aria-label="Search scenarios" type="search" placeholder="Search scenarios"></div>
    <div class="chips" aria-label="Scenario categories">${['All','Everyday','Career','Campus','Travel'].map(c=>`<button data-act="filter" data-id="${c}" aria-pressed="${c==='All'}">${c}</button>`).join('')}</div><div class="scene-grid" id="scene-grid">${Object.keys(scenarios).map(sceneCard).join('')}</div>`;
}
export function filterScenes(category,query) {
  const matches=Object.entries(scenarios).filter(([,s])=>(category==='All'||s.category===category)&&s.title.toLowerCase().includes(query.toLowerCase()));
  return matches.map(([id])=>sceneCard(id)).join('')||'<p class="muted">No scenarios match this search.</p>';
}
export function tutorStudio({prefs:p},editId) {
  const t=tutors[editId];
  return title('Tutor studio','Find your tutor.')+`<div class="tutor-picks">${Object.entries(tutors).map(([id,x])=>`<button class="tutor-pick ${id===editId?'chosen':''}" data-act="pick-tutor" data-id="${id}" aria-pressed="${id===editId}">${art(id+'-rest')}<strong>${x.name}</strong><small>${x.gender} · ${x.age}</small></button>`).join('')}</div>
  <div class="note"><span class="note-icon">${icon('wave')}</span><div><b>${t.description}</b><p>${t.detail} Both tutors are fictional AI characters.</p></div></div>
  <form id="tutor-form" class="form-stack">
  ${field('Coaching style','personality',['Encouraging','Curious','Direct'],p.personality)}
  ${field('Preferred accent','accent',Object.entries(accents),p.accent)}
  ${field('Backup device voice','voice',[['','Match accent automatically'],...tutorVoices(editId).map(v=>[v.voiceURI,v.name+' · '+v.lang])],p.voice)}
  ${field('Speaking speed','speed',[[0.75,'Slow · 0.75×'],[0.9,'Gentle · 0.9×'],[1,'Natural · 1×'],[1.15,'Brisk · 1.15×']],p.speed)}
  <p class="fine">Groq live sessions use a dedicated voice for each tutor. Guided practice and offline previews use a matching device voice or a recorded prompt.</p>
  <div class="button-pair">${btn('preview-voice',icon('volume',16)+' Hear voice','secondary')}<button class="primary" type="submit">Use ${t.name}</button></div></form>`;
}
export function setup({prefs:p,config},scenario) {
  const s=scenarios[scenario];
  return title('Before you start','Make it yours.')+`<div class="scenario-intro">${art(s.art)}<div><span class="eyebrow">${s.category} · ${s.mins} min</span><h2>${s.title}</h2><p>${s.goal}</p></div></div>
  <form id="setup-form" class="form-stack">${field('Tutor','tutor',Object.entries(tutors).map(([k,t])=>[k,t.name+' · '+t.description]),p.tutor)}
  ${field('English level','level',levels,p.level)}${field('Bridge language','bridge',languages,p.bridge)}
  ${field('Correction timing','corrections',['During practice','Report only'],p.corrections)}
  ${field('Conversation mode','engine',config.live?[['guided','Guided practice'],['live','Live AI']]:[['guided','Guided practice']],config.live?'live':'guided')}
  <p class="fine" id="mode-note">${config.live?'Live AI sends confirmed turns, recent conversation and opted-in practice patterns to the configured AI provider. Live microphone audio goes to the same provider.':'Guided practice uses built-in questions and language patterns. The microphone is optional.'}</p>
  ${toggle('remember','Remember my practice','Keep reports and short correction excerpts on this device for 30 days.',p.remember)}
  <label class="agree"><input type="checkbox" name="adult" required ${p.adult?'checked':''}><span>I’m 18 or older and understand this is an AI tutor.</span></label>
  <button type="submit" class="primary wide">${icon('mic',18)} Begin session</button></form>`;
}
export function callView(s,p) {
  const t=tutors[s.tutor];
  return `<div class="call-stage ${p.reduceMotion?'still':''}" id="stage">
  <div class="call-images">${['rest','talk','blink'].map(k=>art(s.tutor+'-'+k,`class="frame frame-${k}"`)).join('')}</div><div class="call-gradient"></div>
  <span class="call-badge">${icon('wave',14)} AI tutor</span><button id="sound-btn" data-act="sound" class="sound-btn" aria-label="${p.sound?'Mute tutor':'Enable tutor voice'}">${icon(p.sound?'volume':'mute',18)}</button>
  <div class="call-id"><h1>${t.name}</h1><span>${scenarios[s.scenario].title}</span></div></div>
  <div class="call-controls"><div class="call-state"><span class="mode-pill" id="mode-pill">${s.mode==='live'?'Live AI':'Guided practice'}</span><span id="call-status" role="status">Your turn</span></div>
  <div id="caption" aria-live="polite"></div><div id="correction"></div><div id="help-box"></div><div id="call-error" role="status"></div>
  <form id="turn-form"><label for="draft">Your reply</label><div class="composer"><textarea id="draft" rows="2" maxlength="1200" placeholder="Type here or use the microphone…"></textarea><button type="submit" class="send" aria-label="Send reply" disabled>${icon('send',18)}</button></div></form>
  <div class="call-actions">${btn('mic',icon('mic',18)+'<span>Speak</span>','primary mic-button')}${s.mode==='live'?'<button class="secondary" data-act="pause-voice" hidden>Pause voice</button>':''}${btn('hint',icon('bulb',18)+' Hint','secondary')}<button class="icon-btn" data-act="replay" aria-label="Replay tutor">${icon('repeat',18)}</button></div>
  <details class="transcript"><summary>Conversation transcript</summary><div id="transcript"></div></details></div>`;
}
export function summary(r,saved,latest) {
  const s=scenarios[r.scenario];
  return title('Session summary',r.turnCount?'Practice complete.':'A first look.')+`<div class="summary-cover">${art(s.art)}<div><span>${dateText(r.date)} · ${mins(r.durationSec)}</span><h2>${s.title}</h2><p>With ${tutors[r.tutor].name} · ${esc(r.engine==='guided'?'Guided practice':r.engine==='mixed'?'Mixed practice':'Live AI')}</p></div></div>
  <div class="note"><span class="note-icon">${icon('check')}</span><div><b>What went well</b><p>${esc(r.strength)}</p></div></div>
  ${section('Language notes')}${r.corrections.length?r.corrections.map(c=>`<div class="review-item"><span class="eyebrow">Turn ${c.turn} · ${esc(c.tag)}</span><p class="original">“${esc(c.original)}”</p><b>“${esc(c.recast)}”</b><small>${esc(c.why)}</small></div>`).join(''):'<p class="muted">No correction was recorded in this session.</p>'}
  ${section('Words to practise')}${r.words.length?r.words.map(w=>`<div class="review-item"><b>${esc(w.term)}</b><p>${esc(w.meaning)}</p><small>“${esc(w.example)}”</small></div>`).join(''):'<p class="muted">No new word was introduced.</p>'}
  ${section('Pronunciation')}<p class="muted">Unassessed. This session did not analyse word sounds.</p>
  ${section('Your confidence')}<p class="muted">${r.confidence?'You rated this session '+r.confidence+' out of 5.':'You skipped the optional self-rating.'}</p>
  <div class="task-card"><span class="eyebrow">NEXT PRACTICE</span><p>${esc(r.task)}</p></div>
  ${latest&&r.turnCount&&!saved?btn('save-report','Save report on this device','secondary wide'):''}
  ${saved?'<p class="fine">Saved on this device.</p>':''}${btn('home','Back to practice','primary wide')}`;
}
export function progress({reports,prefs:p}) {
  const turns=reports.reduce((a,r)=>a+r.turnCount,0);
  const ratings=[...reports].reverse().filter(r=>r.confidence);
  const words=[...new Set(reports.flatMap(r=>r.words.map(w=>w.term)))];
  const patterns=practicePatterns(reports);
  return title('Practice journal','Your progress.')+`<div class="stats"><div><b>${reports.length}</b><span>Sessions</span></div><div><b>${turns}</b><span>Your turns</span></div><div><b>${words.length}</b><span>Words</span></div></div>
  ${weekCard(reports,p)}${section('Confidence check-ins')}<p class="fine">Your own ratings, in the order you gave them.</p>
  ${ratings.length?`<div class="rating-log">${ratings.slice(-7).map(r=>`<div><b>${r.confidence}/5</b><small>${dateText(r.date)}</small></div>`).join('')}</div>`:'<p class="muted">Rate a session to see your first check-in.</p>'}
  ${section('Patterns to revisit')}${patterns.length?patterns.slice(0,5).map(([k,n])=>`<div class="list-line"><b>${esc(k)}</b><span>${n} ${n===1?'time':'times'}</span></div>`).join(''):'<p class="muted">Saved corrections will appear here.</p>'}
  ${words.length?section('Vocabulary')+`<div class="word-list">${words.map(w=>'<span>'+esc(w)+'</span>').join('')}</div>`:''}
  ${section('Recent sessions')}${reports.length?reports.map(r=>`<button class="history" data-act="report" data-id="${r.id}">${art(scenarios[r.scenario].art)}<span><b>${scenarios[r.scenario].title}</b><small>${dateText(r.date)} · ${r.turnCount} ${r.turnCount===1?'turn':'turns'}</small></span>${icon('next',16)}</button>`).join(''):`<div class="empty"><span>${icon('book',24)}</span><b>Your journal starts here</b><p>Save a session report to see your practice over time.</p>${btn('start','Start practice','secondary')}</div>`}`;
}
export function settings({prefs:p,config}) {
  const signOut=config.accountProvider==='hosted'
    ? '<a class="secondary" target="_top" href="/signout-with-chatgpt?return_to=%2F">Sign out</a>'
    : '<form method="post" action="/api/v1/auth/logout"><button class="secondary">Sign out</button></form>';
  const account=config.accounts ? (config.account
    ? `<p>${config.account.email?'Signed in as '+esc(config.account.email):'You’re signed in.'}</p>${signOut}`
    : '') : '';
  return title('Preferences','Your settings.')+account+`<form id="settings-form" class="form-stack">
  <label class="field"><span>First name or nickname</span><input name="name" maxlength="26" value="${esc(p.name)}" placeholder="Optional"></label>
  ${field('Weekly practice goal','goal',[[2,'2 days'],[3,'3 days'],[5,'5 days'],[7,'7 days']],p.goal)}
  ${toggle('captions','Tutor captions','The transcript stays available throughout practice.',p.captions)}
  ${toggle('sound','Tutor voice','Uses a device voice or bundled studio prompts.',p.sound)}
  ${toggle('reduceMotion','Reduce avatar motion','Use a still portrait throughout the call.',p.reduceMotion)}
  ${toggle('remember','Remember my practice','Keep future reports on this device for 30 days.',p.remember)}
  <button class="primary wide">Save settings</button></form>
  ${section('Privacy & data')}<p class="muted">Your camera stays off. The microphone is optional. SpeakBuddy stores no raw audio. Your browser or live AI provider may process speech remotely.</p>
  ${btn('revoke','Reset microphone consent','secondary wide')}
  ${config.sync?`<div class="sync-box"><b>Optional server copy</b><p>Copy saved reports to your space, including correction excerpts and your own ratings.</p>${btn('sync','Back up reports','secondary wide')}${btn('restore','Restore reports','text-button')}</div>`:''}
  ${btn('clear','Erase my practice data','danger-text')}`;
}
