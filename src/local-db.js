import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

export function openDatabase(filename) {
  const conn = new DatabaseSync(filename);
  conn.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY)');
  const dir = new URL('../drizzle/', import.meta.url);
  for (const name of readdirSync(dir).filter(n=>n.endsWith('.sql')).sort()) {
    if (conn.prepare('SELECT name FROM migrations WHERE name=?').get(name)) continue;
    conn.exec('BEGIN IMMEDIATE');
    try {
      conn.exec(readFileSync(new URL(name,dir),'utf8'));
      conn.prepare('INSERT INTO migrations VALUES (?)').run(name);
      conn.exec('COMMIT');
    } catch(e) { conn.exec('ROLLBACK'); throw e; }
  }
  function bound(sql, params=[]) {
    const statement = conn.prepare(sql);
    return {
      bind: (...args)=>bound(sql,args), first:()=>statement.get(...params) || null,
      run:()=>statement.run(...params), all:()=>({results:statement.all(...params)}),
      execute:()=>statement.columns().length ? {results:statement.all(...params)} : {results:[], meta:statement.run(...params)}
    };
  }
  return {
    prepare:bound, close:()=>conn.close(),
    batch(items) {
      conn.exec('BEGIN IMMEDIATE');
      try {
        const result = items.map(s=>s.execute());
        conn.exec('COMMIT');
        return result;
      } catch(e) { conn.exec('ROLLBACK'); throw e; }
    }
  };
}
