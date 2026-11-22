const cleanText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const whole = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validReport(r, catalog) {
  if (!r || !uuidPattern.test(r.id) || !Object.hasOwn(catalog.tutors, r.tutor) || !Object.hasOwn(catalog.scenarios, r.scenario)) return false;
  if (!catalog.levels.includes(r.level) || !['guided', 'live', 'mixed'].includes(r.engine)) return false;
  if (!cleanText(r.date, 32) || !Number.isFinite(Date.parse(r.date)) || !whole(r.durationSec, 86400)) return false;
  if (!whole(r.turnCount, 120) || !whole(r.spokenTurns, r.turnCount) || !r.turnCount) return false;
  if (r.confidence !== null && !(Number.isInteger(r.confidence) && r.confidence >= 1 && r.confidence <= 5)) return false;
  if (r.pronunciation !== null || !cleanText(r.strength, 400) || !cleanText(r.task, 500)) return false;
  if (!Array.isArray(r.corrections) || r.corrections.length > r.turnCount || !Array.isArray(r.words) || r.words.length > 120) return false;
  const seen = new Set();
  for (const c of r.corrections) {
    if (!c || !whole(c.turn, r.turnCount) || c.turn < 1 || seen.has(c.turn)) return false;
    if (!cleanText(c.tag, 80) || !cleanText(c.original, 400) || !cleanText(c.recast, 400) || !cleanText(c.why, 320)) return false;
    seen.add(c.turn);
  }
  return r.words.every(w => w && cleanText(w.term, 80) && cleanText(w.meaning, 250) && cleanText(w.example, 350));
}

export async function saveReport(db, owner, r, tutor) {
  const bind = (sql, ...args) => db.prepare(sql).bind(...args);
  const existing = await bind('SELECT user_id FROM sessions WHERE id=?', r.id).first();
  if (existing) return existing.user_id === owner ? 200 : 409;
  const statements = [
    bind('INSERT OR IGNORE INTO users(id) VALUES (?)', owner),
    bind('INSERT OR IGNORE INTO tutor_profiles VALUES (?,?,?,?,?)', r.tutor, tutor.name, tutor.age, tutor.gender, tutor.accent),
    bind('INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?,?)', r.id, owner, r.tutor, r.scenario, r.level, r.date, r.durationSec, r.turnCount, r.spokenTurns, r.engine),
    bind('INSERT INTO feedback VALUES (?,?,?,?,NULL)', r.id, r.strength, r.task, r.confidence)
  ];
  for (const c of r.corrections) {
    const id = r.id + '-' + c.turn;
    statements.push(bind('INSERT INTO messages VALUES (?,?,?,?,?)', id, r.id, c.turn, 'user', c.original));
    statements.push(bind('INSERT INTO mistakes VALUES (?,?,?,?)', id, c.tag, c.recast, c.why));
  }
  for (const w of r.words) statements.push(bind('INSERT OR IGNORE INTO vocabulary VALUES (?,?,?,?)', r.id, w.term, w.meaning, w.example));
  try { await db.batch(statements); } catch (e) {
    const other = await bind('SELECT user_id FROM sessions WHERE id=?', r.id).first();
    if (other) return other.user_id === owner ? 200 : 409;
    throw e;
  }
  return 201;
}

export async function readReports(db, owner) {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  await db.prepare('DELETE FROM sessions WHERE user_id=? AND ended_at<?').bind(owner, cutoff).run();
  const join = ' JOIN sessions s ON s.id=';
  const [main, mistakes, vocabulary] = await db.batch([
    db.prepare('SELECT s.*, f.strength, f.next_task, f.confidence FROM sessions s JOIN feedback f ON s.id=f.session_id WHERE user_id=? ORDER BY ended_at DESC').bind(owner),
    db.prepare('SELECT m.session_id, m.turn_number, m.excerpt, x.* FROM mistakes x JOIN messages m ON x.message_id=m.id' + join + 'm.session_id WHERE s.user_id=? ORDER BY m.turn_number').bind(owner),
    db.prepare('SELECT v.* FROM vocabulary v' + join + 'v.session_id WHERE s.user_id=?').bind(owner)
  ]);
  return main.results.map(s => ({
    id:s.id, date:s.ended_at, tutor:s.tutor_id, scenario:s.scenario, level:s.level, engine:s.engine, durationSec:s.duration_sec,
    turnCount:s.turns, spokenTurns:s.spoken_turns, confidence:s.confidence, strength:s.strength, task:s.next_task, pronunciation:null,
    corrections:mistakes.results.filter(x=>x.session_id===s.id).map(x=>({turn:x.turn_number,original:x.excerpt,tag:x.pattern,recast:x.recast,why:x.explanation})),
    words:vocabulary.results.filter(w=>w.session_id===s.id).map(({term,meaning,example})=>({term,meaning,example}))
  }));
}
