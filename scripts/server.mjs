import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync } from 'node:fs';
import { openDatabase } from '../src/local-db.js';
import { withAccounts } from '../src/accounts.js';
import { createApi } from '../src/api.js';
import * as records from '../src/records.js';
import * as catalog from '../public/catalog.js';
import * as prompts from '../src/prompts.js';

const base = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(base,'public');
mkdirSync(resolve(base,'data'), {recursive:true});
const db = openDatabase(resolve(base,'data','practice.sqlite'));
const api = withAccounts(createApi(catalog,prompts,records));
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mp3':'audio/mpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const arg = flag => { const i = process.argv.indexOf(flag); return i>=0?process.argv[i+1]:null; };
const host = arg('--host') || process.env.HOST || '127.0.0.1';
const port = Number(arg('--port') || process.env.PORT || 5173);

createServer(async (req,res)=>{
  try {
    const url = new URL(req.url, 'http://' + req.headers.host);
    const matched = req.headers.cookie?.match(/(?:^|; )sb-device=([a-f0-9]{64})(?:;|$)/);
    const token = matched?.[1] || randomBytes(32).toString('hex');
    if (!matched) res.setHeader('Set-Cookie','sb-device='+token+'; HttpOnly; Path=/; SameSite=Strict; Max-Age=2592000');
    const owner = createHash('sha256').update(token).digest('hex');
    let response;
    if (url.pathname.startsWith('/api/')) {
      const init = {method:req.method,headers:req.headers};
      if (!['GET','HEAD'].includes(req.method)) Object.assign(init,{body:req,duplex:'half'});
      response = await api(new Request(url,init), {...process.env,DB:db},owner);
    } else {
      const filename = resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if (!filename.startsWith(root+sep) || !mime[extname(filename)]) throw new Error('Missing');
      response = new Response(readFileSync(filename),{headers:{'Content-Type':mime[extname(filename)]}});
    }
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port,host,()=>console.log('SpeakBuddy is listening at http://'+host+':'+port));
