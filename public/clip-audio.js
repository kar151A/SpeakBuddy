import { speechText } from './speech-text.js';
import { voiceCues } from './voice-cues.js';

let context, source, generation=0;
const buffers=new Map();
export function clipFor(text,tutor) {
  const cues=voiceCues[tutor] || {};
  if(cues[text])return {cue:cues[text],exact:true};
  const suffix=Object.keys(cues).filter(line=>text.endsWith(line)).sort((a,b)=>b.length-a.length)[0];
  return suffix ? {cue:cues[suffix],exact:false} : null;
}
export function stopClip() {
  generation++;if(source){source.onended=null;try{source.stop();}catch{}source=null;}
}
export function playClip(text,prefs,notify,onError) {
  const found=clipFor(text,prefs.tutor);
  const AudioCtx=window.AudioContext || window.webkitAudioContext;
  if(!found||!AudioCtx)return false;
  stopClip();const g=generation;
  try {context ||= new AudioCtx();} catch {return false;}
  const run=async()=>{
    await context.resume();
    if(!buffers.has(prefs.tutor)) {
      const load=fetch('/voice/'+prefs.tutor+'.mp3').then(r=>{
        if(!r.ok)throw Error('Voice unavailable');return r.arrayBuffer();
      }).then(b=>context.decodeAudioData(b)).catch(e=>{buffers.delete(prefs.tutor);throw e;});
      buffers.set(prefs.tutor,load);
    }
    const buffer=await buffers.get(prefs.tutor);
    if(g!==generation)return;
    source=context.createBufferSource();source.buffer=buffer;source.playbackRate.value=Number(prefs.speed);
    source.connect(context.destination);source.onended=()=>{if(g===generation){source=null;notify(false);}};
    notify(true);source.start(0,...found.cue);
  };
  run().catch(()=>{if(g===generation){notify(false);onError?.();}});
  return true;
}

export async function playLiveSpeech(text, prefs, signal, onState, onMouth) {
  stopClip();
  const run = generation;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw Error('Audio playback unavailable');
  context ||= new AudioCtx();
  await context.resume();
  const response = await fetch('/api/v1/speech', {
    method:'POST', signal,
    headers:{'Content-Type':'application/json','X-SpeakBuddy-Consent':'adult-live-v1'},
    body:JSON.stringify({text:speechText(text,true),tutor:prefs.tutor})
  });
  if (!response.ok) throw Error('Cloud voice unavailable');
  const buffer = await context.decodeAudioData(await response.arrayBuffer());
  if (run !== generation || signal.aborted) return;
  const player = source = context.createBufferSource();
  const meter = context.createAnalyser();
  meter.fftSize = 512;
  const samples = new Float32Array(meter.fftSize);
  player.buffer = buffer;
  player.playbackRate.value = Number(prefs.speed);
  player.connect(meter).connect(context.destination);
  function animate() {
    if (source !== player || run !== generation || signal.aborted) return;
    meter.getFloatTimeDomainData(samples);
    const level = Math.sqrt(samples.reduce((sum, sample)=>sum+sample*sample,0)/samples.length);
    onMouth(Math.min(1,Math.max(0,(level-0.008)*19)));
    requestAnimationFrame(animate);
  }
  player.onended = () => {
    player.disconnect();
    meter.disconnect();
    if (source !== player || run !== generation) return;
    source = null;
    onMouth(0);
    onState(false);
  };
  onState(true);
  player.start();
  animate();
}
