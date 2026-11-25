import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root,path),'utf8');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mp3':'audio/mpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const assets = {};
function collect(directory) {
  for (const entry of readdirSync(resolve(root,'public', directory), {withFileTypes:true})) {
    const rel = directory + entry.name;
    if (entry.isDirectory()) collect(rel+'/');
    else if (types[extname(rel)]) assets['/'+rel] = [types[extname(rel)], readFileSync(resolve(root,'public',rel)).toString('base64')];
  }
}
collect('');
// These four modules have no imports. Their named exports remain valid in a single Worker ES module.
const sources = ['public/catalog.js','src/prompts.js','src/records.js','src/api.js','src/accounts.js'].map(read);
const worker = `
const assets = ${JSON.stringify(assets)};
const handle = withHostedAccounts(createApi({tutors,scenarios,levels,languages},{tutorPrompt,grammarPrompt,rolePrompt},{validReport,saveReport,readReports}));
export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handle(request,env);
    const asset = assets[url.pathname==='/'?'/index.html':url.pathname];
    if (!asset || !['GET','HEAD'].includes(request.method)) return new Response('Not found',{status:404});
    const bytes = Uint8Array.from(atob(asset[1]), c=>c.charCodeAt(0));
    return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset[0],'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-cache'}});
  }
};`;
mkdirSync(resolve(root,'dist/server'),{recursive:true});
writeFileSync(resolve(root,'dist/server/index.js'),sources.join('\n')+worker);
if (existsSync(resolve(root,'.openai/hosting.json'))) {
  mkdirSync(resolve(root,'dist/.openai'),{recursive:true});
  copyFileSync(resolve(root,'.openai/hosting.json'),resolve(root,'dist/.openai/hosting.json'));
}
console.log('Built the Worker with '+Object.keys(assets).length+' local assets.');
