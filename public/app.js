import { defaults, tutors, scenarios } from './catalog.js';
import { guidedTurn, hintFor, makeReport } from './coach.js';
import { loadDevice, savePrefs, saveLocal, clearLocal, practicePatterns } from './store.js';
import { VoiceInput, speak, cancelSpeech, voiceFor, hasRecognition } from './audio.js';
import { clipFor } from './clip-audio.js';
import { icon } from './icons.js';
import * as ui from './views.js';

const $=selector=>document.querySelector(selector);
const state={prefs:{...defaults},reports:[],config:{live:false,sync:false}};
let view='home', selectedScene='daily', selectedTutor='mira', category='All', from='home';
let session=null, report=null, lastReportId='', phase='ready', hintTimer, snackTimer, pending, speakingVersion=0;
let draftSource='typed', transcriptDraft='', sessionError='', micAllowedFor=null;
const screen=$('#screen'), modal=$('#modal');
function snack(message) {
  const toast=$('#toast');toast.textContent=message;toast.classList.add('shown');clearTimeout(snackTimer);
  snackTimer=setTimeout(()=>toast.classList.remove('shown'),3500);
}
async function persistPrefs() {
  try {await savePrefs(state.prefs);} catch {snack('Device storage is unavailable. Settings apply for this visit.');}
}
function showDialog(title,body,buttons) {
  modal.innerHTML=`<h2 id="dialog-title">${ui.esc(title)}</h2>${body}<div class="dialog-actions">${buttons}</div>`;
  modal.setAttribute('aria-labelledby','dialog-title');modal.showModal();
}
function closeDialog() { if(modal.open)modal.close(); }
function notice(message) {const e=$('#call-error');if(e)e.textContent=message;sessionError=message;}
function navigate(next,focus=true) {
  clearTimeout(hintTimer);
  if(view==='call' && next!=='call'){voiceConversation=false;stopMedia();}
  view=next;
  $('#header').innerHTML=ui.header(next);
  const withNav=['home','tutors','progress'].includes(next);
  $('#nav').hidden=!withNav;$('#nav').innerHTML=withNav?ui.nav(next):'';
  screen.className='screen-'+next;
  const pages={
    home:()=>ui.home(state),scenarios:()=>ui.library(),settings:()=>ui.settings(state),
    tutors:()=>ui.tutorStudio(state,selectedTutor),progress:()=>ui.progress(state),
    setup:()=>ui.setup(state,selectedScene),call:()=>ui.callView(session,state.prefs),
    summary:()=>ui.summary(report,state.reports.some(r=>r.id===report.id),report.id===lastReportId)
  };
  screen.innerHTML=pages[next]();screen.scrollTop=0;
  if(next==='scenarios')category='All';
  if(next==='call')paintTurn();
  if(focus)screen.focus({preventScroll:true});
}
function goBack() {
  if(view==='setup')navigate(from);
  else if(view==='summary')navigate(from==='progress'?'progress':'home');
  else navigate('home');
}
function setPhase(next) {
  phase=next;if(view!=='call')return;
  const label={ready:'Your turn',speaking:'Tutor speaking',requesting:'Opening microphone…',listening:'Listening…',transcribing:'Preparing transcript…',thinking:'Tutor is thinking…'};
  $('#call-status').textContent=label[next];
  $('#stage').classList.toggle('talking',next==='speaking');
  $('.mic-button span').textContent=next==='listening'?(session?.mode==='live'?'Pause voice':'Finish recording'):'Speak';
  $('.mic-button').disabled=['thinking','requesting','transcribing'].includes(next);
  $('.send').disabled=!$('#draft').value.trim()||!['ready','speaking'].includes(next);
  $('#draft').readOnly=['thinking','requesting','listening','transcribing'].includes(next);
  clearTimeout(hintTimer);
  if(next==='ready')hintTimer=setTimeout(()=>{
    if(view==='call'&&phase==='ready'&&!$('#draft').value&&!modal.open)$('#help-box').innerHTML='<p class="quiet-hint">Take your time. Tap Hint for a sentence starter.</p>';
  },12000);
}
let voiceConversation=false;
const voiceInput=new VoiceInput(setPhase,(text, final)=>{
  if(view!=='call')return;$('#draft').value=text.slice(0,1200);draftSource='speech';transcriptDraft=$('#draft').value;
  if(final && voiceConversation)void submitTurn();
},message=>{voiceConversation=false;notice(message);});
function stopMedia() {
  speakingVersion++;voiceInput.cancel();cancelSpeech();pending?.abort();pending=null;clearTimeout(hintTimer);
}
function speakTutor() {
  if(!session||view!=='call')return;
  const version=++speakingVersion;
  const text=session.turns.at(-1).text;
  const p=state.prefs;
  if(!voiceFor(p) && p.sound) {
    const clip=clipFor(text,p.tutor);
    if(clip && !clip.exact)notice('Studio voice reads the follow-up question. The full reply is in the transcript.');
    if(!clip)notice('This reply is available as text. An installed English voice can read it aloud.');
  }
  if(!speak(text,p,active=>{
    if(version!==speakingVersion||view!=='call'||!['ready','speaking'].includes(phase))return;
    setPhase(active?'speaking':'ready');
    if(!active && voiceConversation && !document.hidden)startMic();
  },()=>{if(version===speakingVersion)notice('Audio playback is unavailable. Tap Replay or read the transcript.');}))setPhase('ready');
}
function paintTurn() {
  const p=state.prefs;
  const last=session.turns.at(-1);
  $('#caption').hidden=!p.captions;
  $('#caption').innerHTML=`<p class="caption-text">${ui.esc(last.text)}</p>`;
  $('#transcript').innerHTML=session.turns.map(m=>`<p><b>${m.role==='user'?'You':tutors[session.tutor].name}</b> ${ui.esc(m.text)}</p>`).join('');
  $('#correction').innerHTML=last.correction&&p.corrections!=='Report only'?`<details class="correction" open><summary>${icon('leaf',15)} Try saying</summary><b>“${ui.esc(last.correction.recast)}”</b><p>${ui.esc(last.correction.why)}</p></details>`:'';
  $('#mode-pill').textContent=session.mode==='guided'?'Guided practice':'Live AI';
  $('#help-box').innerHTML=last.vocabulary?`<details class="word-tip"><summary>Practice word · ${ui.esc(last.vocabulary.term)}</summary><p>${ui.esc(last.vocabulary.meaning)}. “${ui.esc(last.vocabulary.example)}”</p></details>`:'';
  notice('');setPhase('ready');
}
function begin(form) {
  const d=new FormData(form);
  if(!d.has('adult'))return;
  Object.assign(state.prefs,{adult:true,tutor:d.get('tutor'),level:d.get('level'),bridge:d.get('bridge'),engine:d.get('engine'),remember:d.has('remember'),corrections:d.get('corrections'),scenario:selectedScene});
  selectedTutor=state.prefs.tutor;persistPrefs();
  const p=state.prefs;
  session={id:crypto.randomUUID(),started:Date.now(),scenario:selectedScene,tutor:p.tutor,level:p.level,mode:p.engine,engine:p.engine,
    turns:[{role:'assistant',text:scenarios[selectedScene].opening,turn:0}]};
  draftSource='typed';transcriptDraft='';sessionError='';navigate('call');speakTutor();
}
async function submitTurn() {
  if(!session||!['ready','speaking'].includes(phase))return;
  const draft=$('#draft'),text=draft.value.trim();
  if(!text)return;
  const current=session;
  const turn=session.turns.filter(t=>t.role==='user').length+1;
  if(turn>120){notice('This session has reached 120 replies. End it to see your report.');return;}
  stopMedia();setPhase('thinking');notice('');
  const p=state.prefs;
  const data={text,scenario:session.scenario,level:p.level,bridge:p.bridge,turn,tutor:session.tutor,personality:p.personality,corrections:p.corrections,
    history:session.turns.slice(-8).map(({role,text})=>({role,text})),memory:p.remember?practicePatterns(state.reports).slice(0,3).map(([tag])=>tag):[]};
  let result;
  try {
    if(session.mode==='live') {
      pending=new AbortController();
      const res=await fetch('/api/v1/turns',{method:'POST',headers:{'Content-Type':'application/json','X-SpeakBuddy-Consent':'adult-live-v1'},body:JSON.stringify(data),signal:pending.signal});
      result=await res.json();
      if(!res.ok)throw Error(result.error||'The live tutor is unavailable.');
    } else result=guidedTurn(data);
    if(current!==session||view!=='call')return;
    const input=draftSource==='speech' && transcriptDraft ? 'speech':'typed';
    session.turns.push({role:'user',text,turn,input},{role:'assistant',text:result.reply,turn,correction:result.correction,vocabulary:result.vocabulary});
    if (session.mode!==session.engine) session.engine='mixed';
    draft.value='';transcriptDraft='';draftSource='typed';paintTurn();speakTutor();
  } catch(e) {
    if(current!==session||view!=='call'||e.name==='AbortError')return;
    voiceConversation=false;setPhase('ready');notice(e.message);
    $('#help-box').innerHTML=ui.btn('use-guided','Continue in guided practice','secondary');
  } finally {if(current===session)pending=null;}
}
function requestMic() {
  if(phase==='listening'){if(session.mode==='live'){voiceConversation=false;voiceInput.cancel();setPhase('ready');}else voiceInput.stop();return;}
  if(!['ready','speaking'].includes(phase))return;
  if(session.mode==='live'&&voiceConversation){voiceConversation=false;return;}
  if(session.mode==='guided'&&!hasRecognition()){notice('Browser speech recognition is unavailable here. On Windows, focus the reply field and press Windows + H. On iPhone, use the keyboard microphone.');$('#draft').focus();return;}
  if($('#draft').value.trim()) {notice('Send or clear your current reply before recording a new one.');return;}
  if(micAllowedFor===session.mode || state.prefs.micConsent===session.mode){startMic();return;}
  const text=session.mode==='live'?'Live mode sends one recording of up to 35 seconds to the configured AI provider for transcription.':'Your browser’s speech service may send audio to its provider. Availability varies by browser.';
  showDialog('Use your microphone?',`<p>${text} ${session.mode==='live'?'Pausing after speaking automatically sends the transcript to the tutor.':'Review and edit the transcript before sending it.'} SpeakBuddy does not save raw audio.</p><label class="agree"><input type="checkbox" id="remember-mic"><span>Remember this choice on this device</span></label>`,ui.btn('allow-mic','Allow for practice')+ui.btn('dismiss','Keep typing','secondary'));
}
function startMic() {voiceConversation=session.mode==='live';speakingVersion++;notice('');voiceInput.start(session.mode,state.prefs.accent);}
function showHint() {
  const recall=state.prefs.remember?practicePatterns(state.reports).find(([,count])=>count>=2):null;
  $('#help-box').innerHTML=`<div class="hint"><b>Sentence starter</b><p>${ui.esc(hintFor(session.scenario,state.prefs.bridge))}</p>${recall?'<small>From your practice journal · '+ui.esc(recall[0])+'</small>':''}</div>`;
}
async function saveReportLocally(r) {
  await saveLocal(r);
  state.reports=[r,...state.reports.filter(item=>item.id!==r.id)].sort((a,b)=>b.date.localeCompare(a.date));
}
function askEnd() {
  if(!session)return;
  voiceConversation=false;stopMedia();setPhase('ready');
  showDialog('Finish your session?',`<p>How comfortable did speaking feel? Your rating is optional.</p><label class="field"><span>Your confidence</span><select id="rating"><option value="">Skip rating</option>${['1 · Very unsure','2 · Unsure','3 · Okay','4 · Comfortable','5 · Very comfortable'].map((v,i)=>`<option value="${i+1}">${v}</option>`).join('')}</select></label>`,ui.btn('finish','Finish & see report')+ui.btn('dismiss','Keep practising','secondary'));
}
async function finish() {
  const rating=Number($('#rating').value)||null;
  closeDialog();stopMedia();
  report=makeReport(session,rating);lastReportId=report.id;session=null;from='home';micAllowedFor=null;
  if(report.turnCount&&state.prefs.remember) {
    try{await saveReportLocally(report);}catch{snack('Report available for this visit. Device storage is full or unavailable.');}
  }
  navigate('summary');
}
async function api(path,init={}) {
  const res=await fetch('/api/v1'+path,init);const body=await res.json();
  if(!res.ok)throw Error(body.error||'Could not complete this action.');return body;
}
async function syncReports() {
  closeDialog();
  if(!state.reports.length){snack('Save a practice report first.');return;}
  for(const r of state.reports)await api('/sessions/'+r.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,report:r})});
  snack('Your saved reports are backed up.');
}
async function restoreReports() {
  const {reports}=await api('/sessions');
  for(const r of reports)await saveReportLocally(r);
  navigate('progress');snack(reports.length?'Reports restored.':'No backed-up reports yet.');
}
function changeSound() {
  state.prefs.sound=!state.prefs.sound;persistPrefs();
  $('#sound-btn').innerHTML=icon(state.prefs.sound?'volume':'mute',18);
  $('#sound-btn').setAttribute('aria-label',state.prefs.sound?'Mute tutor':'Enable tutor voice');
  if(!state.prefs.sound){voiceConversation=false;speakingVersion++;cancelSpeech();if(phase==='speaking')setPhase('ready');}
  else if(['ready','speaking'].includes(phase))speakTutor();
}
const actions={
  home:()=>navigate('home'),settings:()=>navigate('settings'),scenarios:()=>navigate('scenarios'),back:goBack,
  nav:id=>{selectedTutor=state.prefs.tutor;navigate(id);},
  start:()=>{selectedScene=state.prefs.scenario;from=view;navigate('setup');},
  scenario:id=>{selectedScene=id;from=view;navigate('setup');},
  filter:id=>{category=id;document.querySelectorAll('[data-act=filter]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===id));$('#scene-grid').innerHTML=ui.filterScenes(category,$('#scene-search').value);},
  'pick-tutor':id=>{selectedTutor=id;navigate('tutors',false);},
  'preview-voice':()=>{const d=Object.fromEntries(new FormData($('#tutor-form')));const ok=speak('Take your time. What would you like to practise?',{...state.prefs,...d,tutor:selectedTutor,sound:true},()=>{});if(!ok)snack('No local English voice is available. Captions are available.');},
  mic:requestMic,'allow-mic':()=>{const keep=$('#remember-mic').checked;closeDialog();micAllowedFor=session.mode;if(keep){state.prefs.micConsent=session.mode;persistPrefs();}startMic();},
  hint:showHint,end:askEnd,finish,dismiss:closeDialog,sound:changeSound,
  replay:()=>{if(!['ready','speaking'].includes(phase))return;if(!state.prefs.sound){notice('Enable tutor voice to replay audio.');return;}speakTutor();},
  'use-guided':()=>{session.mode='guided';$('#mode-pill').textContent='Guided practice';notice('Guided practice is ready. Your draft is still here.');$('#help-box').replaceChildren();},
  report:id=>{report=state.reports.find(r=>r.id===id);if(report){from='progress';navigate('summary');}},
  'save-report':async()=>{await saveReportLocally(report);navigate('summary',false);snack('Report saved on this device.');},
  revoke:()=>{state.prefs.micConsent=false;micAllowedFor=null;persistPrefs();snack('SpeakBuddy will ask again before using the microphone.');},
  sync:()=>showDialog('Back up saved reports?','<p>Copy your saved reports, correction excerpts and optional ratings to your server space. You can erase them in Settings.</p>',ui.btn('confirm-sync','Back up reports')+ui.btn('dismiss','Cancel','secondary')),
  'confirm-sync':syncReports,restore:restoreReports,
  clear:()=>showDialog('Erase practice data?','<p>This removes preferences and saved reports on this device and any server copies accessible from this session.</p>',ui.btn('confirm-clear','Erase my data','danger')+ui.btn('dismiss','Cancel','secondary')),
  'confirm-clear':async()=>{closeDialog();if(state.config.sync)await api('/me',{method:'DELETE'});await clearLocal();state.prefs={...defaults};state.reports=[];report=null;lastReportId='';micAllowedFor=null;selectedTutor='mira';navigate('home');snack(state.config.sync?'Practice data erased.':'Practice data erased on this device.');}
};
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
  try{await actions[b.dataset.act]?.(b.dataset.id);}catch(err){snack(err.message||'Please try again.');}
});
document.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target;
  if(f.id==='turn-form')return submitTurn();
  if(f.id==='setup-form')return begin(f);
  const d=new FormData(f);
  if(f.id==='tutor-form'){Object.assign(state.prefs,Object.fromEntries(d),{speed:Number(d.get('speed')),tutor:selectedTutor});await persistPrefs();navigate('home');snack(tutors[selectedTutor].name+' is your tutor.');}
  if(f.id==='settings-form'){Object.assign(state.prefs,{name:d.get('name').trim(),goal:Number(d.get('goal')),sound:d.has('sound'),captions:d.has('captions'),reduceMotion:d.has('reduceMotion'),remember:d.has('remember')});await persistPrefs();navigate('home');snack('Settings saved.');}
});
document.addEventListener('input',e=>{
  if(e.target.id==='draft'){if(!e.target.value){draftSource='typed';transcriptDraft='';}setPhase(phase);}
  if(e.target.id==='scene-search')$('#scene-grid').innerHTML=ui.filterScenes(category,e.target.value);
});
document.addEventListener('change',e=>{
  if(e.target.name==='engine')$('#mode-note').textContent=e.target.value==='live'?'Live AI sends confirmed turns, recent conversation and opted-in practice patterns to the configured AI provider. Live microphone audio goes to the same provider.':'Guided practice uses built-in questions and language patterns. The microphone is optional.';
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&view==='call'){voiceConversation=false;stopMedia();setPhase('ready');notice('Practice paused. Your draft is here when you return.');}
});
window.addEventListener('pagehide',stopMedia);
function clock() {$('#clock').textContent=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).replace(/\s?[AP]M/i,'');}
clock();setInterval(clock,30000);
try{Object.assign(state,await loadDevice());}catch{snack('Device storage unavailable. You can still practise in this tab.');}
selectedTutor=state.prefs.tutor;selectedScene=state.prefs.scenario;
navigate('home',false);
fetch('/api/v1/config').then(r=>r.json()).then(c=>{
  state.config=c;
  if(view==='setup'&&c.live) {
    const select=document.querySelector('select[name=engine]');
    if(select&&!select.querySelector('[value=live]'))select.add(new Option('Live AI','live'));
  }
  if(view==='settings')navigate('settings',false);
}).catch(()=>{});
