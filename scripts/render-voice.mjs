/* Maintainer utility. Requires FFmpeg built with Flite (slt/rms) and libmp3lame.
   It renders only our fixed role-play scripts. Learner audio is never used. */
import { scenarios } from '../public/catalog.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const out=fileURLToPath(new URL('../public/voice/',import.meta.url));
mkdirSync(out,{recursive:true});
const tmp=mkdtempSync(join(tmpdir(),'speakbuddy-voice-'));
const rate=16000;
const common=['What was your part in the team?','Who would you like to have that drink with?','What was the journey like?',
  'What was the trickiest part for you?','What did you talk about together?','How would you ask for an update?',
  'How might someone with a different perspective respond?','Can you give me one example?',
  'What is one thing you feel comfortable talking about?','What would you add?','What is one detail you can add in English?',
  'How would you ask for an appointment?','Take your time. What would you like to practise?'];
const lines=[...new Set([...Object.values(scenarios).flatMap(s=>[s.opening,...s.questions]),...common])];
const cues={};
try {
  for (const [id,voice] of [['mira','slt'],['jay','rms']]) {
    let samples=0;const pieces=[];
    cues[id]={};
    for (const line of lines) {
      const normalized=line.replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/…/g,'...');
      writeFileSync(join(tmp,'line.txt'),normalized);
      const pcm=execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','flite=voice='+voice+':textfile=line.txt','-ac','1','-ar',String(rate),'-f','s16le','-'],{cwd:tmp});
      const gap=Buffer.alloc(Math.ceil(rate*.1)*2);
      cues[id][line]=[+(samples/rate).toFixed(4),+(pcm.length/(2*rate)).toFixed(4)];
      pieces.push(pcm,gap);samples+=(pcm.length+gap.length)/2;
    }
    const raw=join(tmp,'voice.pcm');writeFileSync(raw,Buffer.concat(pieces));
    execFileSync('ffmpeg',['-v','error','-y','-f','s16le','-ar',String(rate),'-ac','1','-i',raw,'-c:a','libmp3lame','-b:a','24k','-map_metadata','-1',join(out,id+'.mp3')]);
  }
  writeFileSync(join(dirname(out.endsWith('/')?out.slice(0,-1):out),'voice-cues.js'),'export const voiceCues='+JSON.stringify(cues,null,2)+';\n');
} finally {rmSync(tmp,{recursive:true,force:true});}
