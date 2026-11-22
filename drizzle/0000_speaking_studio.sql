CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE tutor_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  age_band TEXT NOT NULL,
  gender_label TEXT NOT NULL,
  default_accent TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id TEXT NOT NULL REFERENCES tutor_profiles(id), scenario TEXT NOT NULL,
  level TEXT NOT NULL, ended_at TEXT NOT NULL, duration_sec INTEGER NOT NULL CHECK(duration_sec >= 0),
  turns INTEGER NOT NULL, spoken_turns INTEGER NOT NULL, engine TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX sessions_user_date ON sessions(user_id, ended_at DESC);
--> statement-breakpoint
CREATE TABLE messages (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  excerpt TEXT NOT NULL, UNIQUE(session_id, turn_number, role)
);
--> statement-breakpoint
CREATE TABLE mistakes (
  message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL, recast TEXT NOT NULL, explanation TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE vocabulary (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  term TEXT NOT NULL COLLATE NOCASE, meaning TEXT NOT NULL, example TEXT NOT NULL,
  PRIMARY KEY(session_id, term)
);
--> statement-breakpoint
CREATE TABLE feedback (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  strength TEXT NOT NULL, next_task TEXT NOT NULL, confidence INTEGER CHECK(confidence BETWEEN 1 AND 5),
  pronunciation TEXT
);
--> statement-breakpoint
CREATE VIEW progress AS
  SELECT user_id, count(*) AS sessions, sum(turns) AS turns, sum(spoken_turns) AS spoken_turns,
         sum(duration_sec) AS practice_seconds, avg(feedback.confidence) AS mean_self_rating
  FROM sessions JOIN feedback ON feedback.session_id=sessions.id GROUP BY user_id;
--> statement-breakpoint
CREATE TABLE provider_usage (
  user_id TEXT NOT NULL, day TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL,
  PRIMARY KEY(user_id, day, kind)
);
