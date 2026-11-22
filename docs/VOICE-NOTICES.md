# Synthetic voice assets

The studio fallback plays original SpeakBuddy scripts rendered with the stock US English `slt` and `rms` voices in CMU Flite, via FFmpeg. No learner audio, uploaded voice, custom speaker model or imitation of an identifiable individual was used. Mira and Jay are fictional product characters. “Studio voice” describes the prepared audio. Device English voices come from the learner’s own operating system installation.

`public/voice/mira.mp3` and `jay.mp3` each contain one sequence of prompts. `public/voice-cues.js` maps each original line to a start time and duration. To regenerate from the original role-play script on a workstation with FFmpeg/Flite, run `node scripts/render-voice.mjs`. No voice model or Flite binary ships in the repository. The third-party authors do not endorse SpeakBuddy.

Source and licensing: [Flite upstream licence](https://github.com/festvox/flite/blob/master/COPYING) · [CMU ARCTIC corpus description](https://www.cs.cmu.edu/~awb/papers/ssw5/arctic.pdf). Flite's public notices are reproduced in [FLITE-NOTICE.txt](FLITE-NOTICE.txt).
