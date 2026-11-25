# SpeakBuddy

AI based Voice coach

SpeakBuddy gives adult English learners a short conversation to practise, a patient follow-up question and a small task they can try again tomorrow. The web app sits inside an iPhone-style frame on desktop and uses the available screen on a phone.

## Run on Windows, macOS or Linux

Use Node.js **22.13 or newer**. Node 24 LTS is recommended. The app has zero npm dependencies.

```sh
git clone https://github.com/kar151A/SpeakBuddy.git
cd SpeakBuddy
npm start
```

Open **http://127.0.0.1:5173**. The first command downloads the source. The second enters the project. The third starts the web app and initialises its local SQLite database in the ignored `data/` folder. Use `npm test` to check tutoring, consent, database and provider behaviour. Use `npm run build` to produce a single portable Worker module with its assets embedded.

## Try one session

1. Choose **Job interview**, select a level and bridge language, and accept the adult-pilot disclosure.
2. Type “Yesterday I go to college to meet my team.” Send the turn. Mira models the sentence and follows up about the team. **Speak** opens a separate microphone disclosure where supported.
3. Tap **Hint** for a starter. Choose **End**, optionally rate your confidence and open the report. Save the report to see it in **Progress**.
4. In **Tutors**, try Jay, set an accent or installed English voice and adjust the speed. **Settings** holds under-your-control backup, restore and erasure.

## Conversation modes

| Mode | Behaviour | Requirements |
|---|---|---|
| Guided practice | Seven scenario scripts with context-sensitive follow-ups, three levels, English/Kannada/Hindi/Tamil scaffolds, pattern-based recasts and device speech. | Runs without an API key. Speech recognition varies by browser. |
| Live AI | A server-side OpenAI Responses call per confirmed learner turn. Optional recorded-turn transcription. Grounds a correction in an exact learner span. | A server-side API key, network, available database and explicit live-mode selection. |
| Tutor voice and face | Installed local English voice, bundled synthetic US English prompts, speed control, still or animated fictional portrait, blinks and speaking-state mouth movement. | Captions and typing work when device speech is unavailable. |

For **local Live AI**, copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`), set `OPENAI_API_KEY` in that file and restart. Choose **Live AI · OpenAI** in session setup. The app sends up to eight recent messages plus confirmed text and up to three opted-in learning tags. It caps each local identity at 60 text calls and 60 audio calls per UTC day. The local server binds to loopback by default. Keep it on loopback for development. A shared paid deployment needs a trusted identity boundary, per-account and global budgets.

## Project documents

- [Product requirements, wireframes, pilot metrics, costs, risks and 12-week plan](docs/PRODUCT.md)
- [Architecture diagram, SQL model, API contracts and production design](docs/ENGINEERING.md)
- [Five ready-to-use tutor prompts and example inputs](docs/PROMPTS.md)
- [One-page founder pitch and presentation outline](docs/PITCH.md)
- [Printable one-page pitch](docs/SpeakBuddy-One-Page-Pitch.pdf)

## Where to work

| Path | Responsibility |
|---|---|
| `public/app.js`, `views.js`, `style.css` | App navigation, iPhone frame, consent, call controls, reports and feedback. |
| `public/audio.js` | Device voices, microphone capture, cancellation and editable transcription. |
| `public/coach.js` and `catalog.js` | Key-free practice, original role-plays, level and bridge-language hints, evidence-based recap. |
| `public/store.js` | Opt-in on-device journal in IndexedDB. |
| `src/api.js` and `src/prompts.js` | Live model/transcription, input validation and persistent usage limits. |
| `src/records.js` and `drizzle/0000_speaking_studio.sql` | Transactional backup, owner-scoped restore, deletion and progress. |
| `scripts/server.mjs` and `scripts/build.mjs` | Local Node/SQLite server and deployment build. |

The first release uses self-rated confidence and leaves pronunciation unassessed. Timed phoneme animation, measured pronunciation drills and a native client are roadmap items. Web audio quality and latency need physical iPhone testing.

## Visual assets

Mira and Jay are original, fictional AI-generated characters. The expression frames and seven scenario images were generated for SpeakBuddy without real-person reference images. Bundled fallback clips use the licensed CMU Flite stock voices. See [voice asset notices](docs/VOICE-NOTICES.md). The sound-wave mark, UI and role-play text are original project work. The app requests no learner camera footage.

### Email and Google accounts

Create an Auth0 Regular Web Application. Enable the email/password database connection and the Google social connection for that application. For your own Google OAuth credentials use the callback URL shown in the Auth0 Google connection setup. In the Auth0 application allow the SpeakBuddy callback `http://localhost:5173/api/v1/auth/callback`. Use your exact HTTPS origin for a hosted instance.

Copy the four account settings from `.env.example` to your local `.env`. Use the Auth0 domain without a scheme, the application's client ID and secret, and the exact origin you open in the browser. Restart the app. Open Settings and choose **Sign in with email or Google**. Passwords stay at Auth0. Sign-out revokes the SpeakBuddy session. Separate provider identities have separate practice histories.

Local SQLite migrations run at startup. For a separate Auth0-enabled deployment apply `drizzle/0001_account_sessions.sql` to its existing D1 database before enabling the four environment settings. With accounts enabled, guests can use guided practice. Account backups are opt-in under Settings. Prior guest reports remain in the device-only profile.

The published SpeakBuddy site uses the host’s built-in ChatGPT sign-in on Home and Settings. Its Worker takes identity from the hosting platform and stores reports under the same account ID used by earlier hosted versions. The Auth0 credentials above apply to the local Node app.
