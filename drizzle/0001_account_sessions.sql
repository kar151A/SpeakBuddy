CREATE TABLE IF NOT EXISTS account_sessions (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  email TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS account_session_expiry ON account_sessions(expires);
