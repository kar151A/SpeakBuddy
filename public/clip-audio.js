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
