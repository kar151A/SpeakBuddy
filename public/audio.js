import { playClip, stopClip } from './clip-audio.js';

export function localVoices() {
  return (window.speechSynthesis?.getVoices() || []).filter(v=>v.localService && /^en[-_]/i.test(v.lang));
}
export function tutorVoices(tutor) {
  const names = tutor === 'jay'
    ? /\b(david|mark|george|daniel|alex|male)\b/i
    : /\b(zira|hazel|samantha|victoria|karen|moira|tessa|susan|female)\b/i;
  return localVoices().filter(voice => names.test(voice.name));
}
export function voiceFor(prefs) {
  const matching = tutorVoices(prefs.tutor);
  const chosen = matching.find(voice => voice.voiceURI === prefs.voice);
  if (chosen) return chosen;
  return matching.find(voice => voice.lang.replace('_', '-') === prefs.accent) || matching[0];
}
export function speak(text,prefs,onState,onError) {
  if (!prefs.sound) return false;
  stopClip();
  const voice=voiceFor(prefs);
  if (!voice || !window.SpeechSynthesisUtterance) return playClip(text,prefs,onState,onError);
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.voice=voice; utterance.lang=voice.lang; utterance.rate=Number(prefs.speed);
  utterance.onstart=()=>onState(true);
  utterance.onend=()=>onState(false);
  utterance.onerror=()=>{onState(false);onError?.();};
  window.speechSynthesis.speak(utterance);
  return true;
}
export const hasRecognition=()=>!!(window.SpeechRecognition || window.webkitSpeechRecognition);
export function cancelSpeech(){ stopClip(); window.speechSynthesis?.cancel(); }

export class VoiceInput {
  constructor(onStatus,onDraft,onError) {
    this.onStatus=onStatus; this.onDraft=onDraft; this.onError=onError; this.version=0;
  }
  stopMeter() {
    clearInterval(this.meter);
    this.audioContext?.close().catch(()=>{});
    this.audioContext=null;
  }
  watchSpeech(stream) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      const context = this.audioContext = new AudioContext();
      const analyser = context.createAnalyser();
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const began = performance.now();
      let speechSamples = 0, lastSpeech = began;
      this.meter = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
        const now = performance.now();
        if (rms > 0.012) { speechSamples++; lastSpeech = now; }
        if (speechSamples >= 3 && now - lastSpeech > 1100) this.stop();
      }, 60);
      context.resume().catch(()=>this.stopMeter());
    } catch { this.stopMeter(); }
  }
  cancel() {
    this.stopMeter();
    this.version++;
    clearTimeout(this.timer);
    if(this.recognition) { this.recognition.onend=null; try {this.recognition.abort();} catch {} this.recognition=null; }
    if(this.recorder?.state==='recording') {this.recorder.onstop=null;this.recorder.stop();}
    this.stream?.getTracks().forEach(t=>t.stop());
    this.recorder=null;this.stream=null;
    this.controller?.abort();
  }
  stop() {
    this.stopMeter();
    clearTimeout(this.timer);
    if(this.recognition) {try {this.recognition.stop();} catch {}}
    if(this.recorder?.state==='recording') this.recorder.stop();
  }
  async start(mode,locale) {
    this.cancel(); cancelSpeech();
    const version=this.version;
    const current=()=>this.version===version;
    const fail=msg=>{if(current()){this.cancel();this.onStatus('ready');this.onError(msg);}};
    this.onStatus('requesting');
    if(mode==='guided') {
      if(!hasRecognition()) return fail('Speech recognition is unavailable in this browser. Type your reply below.');
      const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
      const r=this.recognition=new Speech();
      r.lang=locale; r.continuous=false; r.interimResults=true;
      r.onstart=()=>{if(current()){this.onStatus('listening');this.timer=setTimeout(()=>this.stop(),35000);}};
      r.onresult=e=>{
        if(!current()) return;
        const draft=Array.from(e.results,res=>res[0].transcript).join(' ');
        this.onDraft(draft);
      };
      r.onend=()=>{if(current()){clearTimeout(this.timer);this.recognition=null;this.onStatus('ready');}};
      r.onerror = event => {
        const messages = {
          'not-allowed': 'Allow microphone access in your browser settings, or use keyboard dictation.',
          'audio-capture': 'No microphone was detected. Check your input device, or use keyboard dictation.',
          network: 'Browser transcription could not connect. Try keyboard dictation in the reply field.',
          'service-not-allowed': 'This browser blocks speech recognition. Try keyboard dictation in the reply field.'
        };
        fail(messages[event.error] || 'No speech was recognised. Try again or use keyboard dictation.');
      };
      try {r.start();} catch {fail('The microphone could not start. Type your reply or retry.');}
      return;
    }
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return fail('Recording is unavailable here. You can type your reply.');
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if(!current()){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));
      if(!mime) return fail('This device recording format is unavailable. You can type instead.');
      const rec=this.recorder=new MediaRecorder(stream,{mimeType:mime});
      const chunks=[];
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onerror=()=>fail('Recording failed. Please retry or type.');
      rec.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        clearTimeout(this.timer);
        if(!current())return;
        this.recorder=null;this.stream=null;
        if (!chunks.length) return fail('The browser captured no audio. Check the selected microphone and try again.');
        this.onStatus('transcribing');
        try {
          this.controller=new AbortController();
          const res=await fetch('/api/v1/transcriptions',{method:'POST',headers:{'Content-Type':mime,'X-SpeakBuddy-Consent':'adult-live-v1'},body:new Blob(chunks,{type:mime}),signal:this.controller.signal});
          const data=await res.json();
          if(!res.ok) throw Error(data.error||'Could not transcribe. You can type instead.');
          if(current()){
            if(!data.text?.trim()) return fail('No words were transcribed. Tap Speak and try again.');
            this.onStatus('ready');
            this.onDraft(data.text, true);
          }
        } catch(e){if(current())fail(e.message);}
      };
      rec.start();this.onStatus('listening');this.watchSpeech(stream);this.timer=setTimeout(()=>this.stop(),35000);
    } catch {fail('Microphone unavailable or permission declined. Type your reply below.');}
  }
}
