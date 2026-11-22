# SpeakBuddy | Product requirements

**One-line pitch.** Rehearse a real English conversation with a patient AI tutor, learn one useful correction and bring it into your next conversation.

**Executive summary.** A student preparing for a placement interview can know the answer and still struggle to say it aloud. SpeakBuddy gives that student five private minutes with a front-facing fictional tutor. The learner owns the pace, can start in a familiar language and sees how the next attempt relates to the last. The first build covers the whole practice loop on web. An iPhone frame makes it possible to test the mobile experience before investing in a native client.

**Assumptions and scope.** Start with two student developers, a part-time English teacher, an India-first adult college pilot, one learner and one tutor per session, and five-minute practice blocks. Target one college placement cell as the first buyer. A public code repository and an owner-private app preview are separate release choices. All targets and unit economics below are planning assumptions unless explicitly identified as published prices. No paid services are required to try guided practice.

## Who needs it

| Learner or buyer | Moment of difficulty | Product response | Evidence to collect |
|---|---|---|---|
| Placement candidate, beginner | Knows what happened on a project, freezes at “Tell me about yourself” | A sentence starter, time to think and a concrete follow-up | Can they give a second example without a hint? |
| Adult code-switcher, intermediate | Knows part of the answer in Kannada, Hindi or Tamil and loses the floor while translating | Permit the mixed utterance, confirm unclear meanings and model a short English version | Teacher checks whether the intended meaning survives the bridge |
| Professional, advanced | Can speak fluently but struggles to disagree or clarify politely | Ask for a counterargument, an example or a rephrased request | Can the learner complete a fresh role-play independently? |
| Placement coordinator or teacher | Limited time to give each student repeated individual rehearsal | Assign a scenario and assess voluntarily shared results against a rubric | Weekly practice days and an independent before/after task |

## Releases and acceptance

| Stage | What the student team delivers | Exit condition |
|---|---|---|
| Current implementation and week-4 MVP | iPhone-framed web client, two adult tutor presets, seven guided role-plays, three levels, configurable language bridge, device TTS, optional speech or typing, learner-confirmed turns, one actionable correction, voluntary saved reports and optional server backup. Live transcription and text generation are available when configured. | A new adult learner can complete three turns, decline the mic, finish, reopen a saved report and erase it. No fabricated confidence, pronunciation or progress. |
| Phase 2, weeks 5–8 | Measured latency, streaming turn-taking, editable uncertain transcripts, opt-in acoustic read-aloud drills, improved multilingual examples and purposeful review of recurring mistakes. | Teacher reviews at least 100 turns, including mixed-language turns. Acoustic evidence is missing-safe, and the slower-network path completes. |
| Phase 3, weeks 9–12 | Licensed avatar comparison, timed visemes and natural gestures, durable jobs, stronger identity and account quotas. Native iPhone spike in Expo/React Native once media reliability is known. | Adult college pilot on real devices, quality and cost review, deletion audit, documented launch decision. |

**Personalisation.** In the MVP, gender and age band come with Mira or Jay. Voice, preferred accent, speed and coaching style are separate controls. The app shows the voices installed on each device. Later add more licensed adult age/gender presets, including neutral options, and a cloud voice preview. Respond to engagement preferences directly. An accent choice affects what learners hear and carries no score.

## Interaction contract

1. **Onboard.** Home opens without a sign-up wall or permission request. First practice opens setup. Choose level, language bridge and feedback timing. The adult-pilot acknowledgement and AI disclosure precede the session. Remembering reports is optional. Settings accepts a nickname.
2. **Choose a tutor.** Tutors presents two front-facing portraits with a personality description, gender and age band. Preview a supported voice, set the preferred accent and speed, then select the tutor. Home reflects the choice.
3. **Start a session.** Choose a scenario from Home or the searchable library. Read its goal, choose guided or configured live mode and begin. The tutor opens in character. A first tap on Speak explains who handles the audio; the learner can keep typing.
4. **Take a turn.** The microphone captures a draft, up to 35 seconds per recording. Tap Finish recording or edit the draft, then Send. Tutor playback yields when the learner starts capture. Silent learners see a discreet offer after 12 seconds; it makes no sound. Hint supplies a starter. A network failure leaves the draft available for retry or guided practice.
5. **Correct gently.** Acknowledge meaning and ask one follow-up. Model at most one correction, then show the exact phrase and a short explanation. “Report only” defers the correction. An acceptable regional expression can pass unchanged.
6. **Finish.** End opens an optional 1–5 self-rating and an explicit finish action. The report lists an observed success, turn-linked corrections, words introduced, pronunciation availability and one practice task. A zero-turn visit has no progress credit. Opt in to save now or preselect remembering in setup.
7. **Return.** Progress shows practice days, turns, vocabulary and self-ratings from saved sessions. Tap a session to reopen the report. Repeated tags can influence the next live turn if memory is enabled. Backup is a separate choice from device storage.

**Example interaction.** Learner says “Yesterday I go to college to meet my team.” Mira models “Yesterday I went to college to meet my team.” She then asks “What was your part in the team?” The correction card highlights only “Yesterday I go” and “Yesterday I went”. The report cites the turn. A missed word in a transcription can be fixed before sending.

## Wireframes and screen behaviour

| Screen | Top to bottom on iPhone | Interaction, empty and accessibility states |
|---|---|---|
| Home | SpeakBuddy mark and Settings, day and greeting, front-facing tutor card, Start practice, horizontal scenario cards, weekly goal, bottom navigation | Jobs, daily conversation and travel are directly accessible. View all opens seven scenarios. A fresh device starts at zero days. |
| Tutor studio | Back, tutor portraits and descriptors, selected tutor bio, coaching style, accent, voice, speed, Hear voice and Use tutor | Selection works by keyboard. Text states voice availability. Reduce motion applies during calls. |
| Role-play library | Search, category filters and illustrated two-column cards | Search and filter combine. Named roles include job interview, presentation, daily conversation, airport travel, doctor visit, customer support and group discussion. |
| Setup | Scenario goal, tutor, level, language bridge, correction mode, conversation mode, local memory and adult acknowledgement | Live AI appears when the server can support it. Microphone permission is deferred until requested. |
| Call | End, camera-style tutor portrait, persistent AI label, sound toggle, mode and turn status, caption, correction, composer, Speak, Hint, Replay, transcript | Learner camera stays off. Listening, thinking and speaking are visible states. Keyboard and captions support the entire session. |
| Live correction | Compact expandable card below the caption, one model phrase and explanation | Learner can collapse it without losing their turn. Report-only mode suppresses it. Corrections can be absent. |
| Session report | Scenario and tutor, measurable success, original and recast, vocabulary, pronunciation state, optional confidence and next task | The learner may save this report independently. No score is inferred from silence, accent or a typed turn. |
| Progress | Counts, seven-day weekly view, chronological confidence ratings, repeated patterns, vocabulary, report history | First-use state explains how to save a report. History and labels provide an alternative to visual indicators. |
| Settings | Nickname, weekly goal, captions, voice, motion, memory, mic consent, optional server backup/restore and erase | Destructive erasure needs a local confirmation. Explain the scope of copies and remote speech processing. |

The phone frame is presentation chrome on desktop. On a small screen it gives way to the usable phone viewport and safe areas. Source order follows reading order, dialogs use native focus containment, and meaning is expressed in text as well as colour. Assess VoiceOver, zoom, speech overlaps and contrast before the broader pilot. [W3C WCAG 2.2 guidance](https://www.w3.org/WAI/WCAG22/Understanding/)

## Success measures and pilot design

**Primary outcome.** Count adults who complete three meaningful learner turns on two distinct days in a week. This measures repeated practice. Assess improvement separately through a new comparable task, with two blind teacher ratings where feasible.

| Measure | Proposed pilot gate | How to collect it |
|---|---|---|
| Activation | At least 70% of consenting starters finish three turns in the first session | Count final learner turns, separately tag spoken and typed. Capture aggregate counts only with pilot opt-in. |
| Learning quality | At least 90% of a 100-turn teacher sample judged correct, kind and useful. Zero confident pronunciation claims without audio evidence. | Stratify by level and bridge language, invite second-rater review for disagreements. |
| Return and transfer | At least 35% return in the next seven days; report independent task change with sample size and uncertainty | Compare fresh interview prompts week 1 and week 4 using task completion, clarity and evidence. |
| Responsiveness | Week-4 target median under 1.5 s and p95 under 3.5 s from confirmed Send to audible reply on the target connection | Time STT, model, first audio and playback separately. Report permissions and edit time separately. These are unmeasured targets. |
| Cost and comfort | Model + STT below $0.03 per completed five-minute session in the reference mix. Fewer than 5% of surveyed learners report feeling rushed. | Compare provider meters with completed sessions and optional post-session survey. |

Pilot with 30 consenting adults from a placement cell over four weeks. Counterbalance comparable scenarios and ask learners to keep both speaking and typed practice visible in analysis. Analyse missed starts, permission denial and non-return; code-switching and noisy rooms should each appear in the test sample. Recruit an English teacher to review disputes. There are no pilot results or efficacy claims yet.

## Twelve-week build plan

| Week | Product and client (developer A) | Voice, data and evaluation (developer B with teacher) | End-of-week evidence |
|---|---|---|---|
| 1 | Observe five placement rehearsals, choose first interview task, validate home/setup/call wireframes | Draft consent, define the turn contract and seven scenario goals | One practice transcript reviewed by a teacher and five usability notes |
| 2 | Tutor selection, captioned call, editable reply, keyboard path and mic denial | Connect guided role-plays, bridge-language starters and bounded live adapter | Three-turn guided demo and scripted live contract test |
| 3 | Correction overlay, report, memory controls and progress | Migrations, ownership, atomic retries, deletion and cost instrumentation | Save/reopen/erase demo and tests across two isolated learners |
| 4 | Test iPhone Safari and Android Chrome, zoom and VoiceOver; fix high-impact issues | Teacher samples 100 turns; verify live provider calls if a key is available | **4-week MVP:** signed-off adult pilot build and a baseline latency/cost sheet |
| 5 | Streaming partial captions, hold-to-talk and accessible replay | Instrument VAD endpoints and bounded WebRTC session tokens | Quiet pause, background noise and learner barge-in trials |
| 6 | Add standalone, optional repeat-after-me exercise | Configure aligned en-IN read-aloud evidence and low-quality abstention | Blind review of at least 30 sample drills; no feedback from text alone |
| 7 | Build spaced review and “I’ve learned this” controls | Map repeated patterns and vocabulary gaps to reviewed exercises | Next session follows one chosen learning goal with evidence |
| 8 | Run second usability cohort and tune turn length | Compare code-switched transcription and intelligibility across groups | **8-week beta:** accessibility, learning and unit-cost gate; publish measured limitations |
| 9 | Spike Expo/React Native audio session and interruptions on one iPhone | Compare device, provider voice and licensed avatar tiers at matched workloads | One physical-device loop and itemised monthly projection |
| 10 | Prototype viseme timing, reduced-motion and audio-only modes | Test media clocks, cancellation, TURN fallback and concurrency | Record p50/p95 and sample lip-sync offsets against time-coded speech |
| 11 | Add teacher assignment prototype and adult pilot support flow | Add scheduled expiry, budget alerts, de-identified security telemetry and restore drill | Cost cap, deletion including backups, incident and privacy review |
| 12 | Run college pilot rehearsal and prepare demo | Blind-review learning transfer, audit access and make go/no-go decision | **12-week pilot release:** measured readout, pitch, runbook and native decision |

If one student is available, ship and evaluate week 4 first. Preserve the consent and evidence checks when moving the avatar comparison to a later release.

## Cost model

Rates checked 20 November 2026. Figures are USD before tax. Assumed hardware and student labour are already available. Illustrative one-time cash for the four-week build is **$0–$100**: $0 for development tools and original bundled art at runtime, $0–25 for voluntary provider/host validation, $0–75 for pilot participation or travel. Labour is approximately 80–120 team hours at 10–15 hours per developer per week; at an assumed $10/hour that is $800–1,200 of time, separate from cash.

| Monthly design at 1,000 sessions × 5 wall-clock minutes | Arithmetic | Estimate |
|---|---|---:|
| Guided local development | Device speech where available, scripted turns, no paid AI or host required on localhost | $0 incremental API/hosting |
| Live text | 6,000 input and 600 output tokens per session across its turns, including repeated context. 6M × $0.10/M + 0.6M × $0.50/M | $0.90 |
| Optional recorded-turn STT | 50% learner speech = 2,500 minutes × $0.0045/min | $11.25 |
| Learner-device TTS and local avatar rendering | 40% tutor speech = 2,000 minutes; 10% remaining silence; zero metered TTS/video API use | $0 |
| **Live pipeline plus hosting allowance** | ($0.90 + $11.25) variable + assumed $5–25 for shared hosting/database | **$17.15–37.15/mo** |
| Sensitivity at 10,000 sessions | Same speech/token proportions; $121.50 variable + assumed $25–100 hosting | **$146.50–221.50/mo** |
| Optional managed TTS alternative | 2,000 tutor minutes × 700 characters = 1.4M; $30/M characters for Chirp 3 HD | $12 if first 1M free quota applies, $42 at list rates |
| Licensed streamed-avatar alternative | Tavus Business $975 includes 4,000 minutes; 1,000 extra × $0.26 for 5,000 wall-clock minutes | **$1,235/mo** for the plan and overage |

A five-minute reference session costs about **1.22 US cents** in metered live text/STT usage at the stated mix. Local voices, retries, verbosity and silence change spend. Track attempts including abandoned sessions. The avatar line prices an alternative service bundle. Reconcile any bring-your-own-model charges with its contract before adding other lines. GST, currency conversion, app-store fees, support, discounts, observability and team salaries are outside the running estimate. Launch with quotas and alerts, then set selling price from actual rupee invoices, teacher support load and willingness to pay.

Sources: [OpenAI text rates](https://developers.openai.com/api/docs/models/gpt-6-luna) · [OpenAI transcription rates](https://developers.openai.com/api/docs/models/gpt-transcribe) · [Google voice rates](https://cloud.google.com/text-to-speech/pricing) · [Tavus plans](https://www.tavus.io/pricing).

## Risks, consent and responsible AI

| Risk | Current mitigation | Production gate and owner |
|---|---|---|
| Rushing the learner or compounding STT errors | Confirmed turn submission, editable transcript, silent hint, retry and typed path | Product lead counts false endpoints and perceived interruptions on actual phones. |
| Grammar overcorrection, dialect bias, hallucinated pronunciation | One exact-span correction, regional English accepted, no inferred phoneme scores; confidence is self-rated | Teacher reviews disputed recasts and accent parity; acoustic drills require reliable alignment. |
| Voice/video identity or asset misuse | Original fictional tutor images, clear AI labels, device voices, no uploaded or cloned identities | Founder verifies stock service commercial rights and withdrawal terms before enabling licensed faces. Explicit face and voice releases would be separate per use. |
| Unwanted retention or transmission | Mic permission on demand, separate AI/provider choice, camera off, opt-in local history and separate report backup; no raw audio or full transcript in project database | Privacy lead completes vendor DPA, transfer/region review, requests workflow, scheduled expiry and backup deletion SLA before a multi-user launch. |
| Children or safeguarding | Adult college pilot and explicit 18+ acknowledgement; no ads or learner camera | For minors, obtain local counsel review, age assurance, verifiable parental consent where required, withdrawal and a safer syllabus. A self-declaration alone is insufficient for a child-facing launch. |
| Medical advice, harassment or attachment | Clinic role-play uses fictional receptionist language; tutor disclosure, professional boundaries and learner-controlled exit | Add reviewed multilingual moderation, adverse-event reporting and appropriate human escalation for live public cohorts. |
| Quota exhaustion, unreliable networks and cost spikes | Bounded payloads, 35-second capture, provider timeout, per-identity limits, explicit guided fallback | Engineering adds per-tenant/global hard caps, telemetry without transcripts, regional failover and load tests before broad access. |
| Accessibility or weak devices | Typed turns, captions, transcript, text labels, keyboard, device and OS motion preferences | Physical-device tests across Bluetooth audio, zoom, VoiceOver, dysfluency and low bandwidth. |
| Deletion gaps and device sharing | Device-local choices, explicit optional remote backup and erase; local dev uses a random device cookie | Explain shared-browser exposure and avoid collecting sensitive role-play details. Verify timed deletion, recovery holds and ownership before institutional sync. |

**Privacy specifics.** Live mode sends only the confirmed turn, recent context and opted-in tags to the text provider. Live mic turns send audio for transcription immediately after recording stops; the learner then reviews the transcript before sending it to the tutor. Guided browser recognition can also use a remote speech service. The app uses installed local English TTS voices, with bundled synthetic US English prompts as a fallback. Report retention in the prototype is enforced on reopening local history or accessing server history; idle installations and provider backups need the scheduled controls above. OpenAI defaults, retention exceptions and storage settings vary by endpoint. The Responses request sets `store:false`. [Browser speech recognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) · [Local voice property](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService) · [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)

**India launch context.** The DPDP Act defines children as people under 18. The November 2025 commencement notification phases in Section 9 eighteen months later, in May 2027. Review the applicable rules on verifiable parental consent, tracking and targeted advertising, including exemptions, before extending the pilot to minors. Identify the data fiduciary, publish understandable notices, make withdrawal accessible and document requests and deletion. These controls and the dates are planning inputs for an India launch. [India Code, DPDP Act](https://www.indiacode.nic.in/bitstream/123456789/22037/1/a2023-22.pdf) · [Commencement notification](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf) · [DPDP Rules 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
