import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/local-db.js';
import { withAccounts } from '../src/accounts.js';

test('verified account sessions isolate access and expire on logout',async t=>{
  const DB=openDatabase(':memory:');t.after(()=>DB.close());
  const origin='http://localhost:5173';
  const env={DB,APP_ORIGIN:origin,AUTH0_DOMAIN:'tenant.example',AUTH0_CLIENT_ID:'client',AUTH0_CLIENT_SECRET:'secret',
    authFetch:async url=>Response.json(url.endsWith('/userinfo')?{sub:'google|123',email:'learner@example.org'}:{access_token:'verified-token'})};
  const handle=withAccounts(async(req,env,owner)=>Response.json({owner:owner||null}));
  const call=(path,init)=>handle(new Request(origin+'/api/v1/'+path,init),env,'device');
  const alias=await handle(new Request('http://127.0.0.1:5173/api/v1/auth/login'),env,'device');
  assert.equal(alias.headers.get('location'),origin+'/api/v1/auth/login');
  assert.equal(alias.headers.get('set-cookie'),null);
  const login=await call('auth/login');
  const state=new URL(login.headers.get('location')).searchParams.get('state');
  const headers={cookie:login.headers.get('set-cookie').split(';')[0]};
  assert.equal((await call('auth/callback?code=x&state=wrong',{headers})).status,400);
  const callback=await call('auth/callback?code=x&state='+state,{headers});
  headers.cookie=callback.headers.get('set-cookie').split(';')[0];
  const config=await (await call('config',{headers})).json();
  assert.equal(config.account.email,'learner@example.org');
  assert.equal((await call('sessions',{headers})).status,409);
  assert.equal((await call('sessions',{headers:{...headers,'X-SpeakBuddy-Account':config.account.owner}})).status,200);
  await call('auth/logout',{method:'POST',headers:{...headers,origin}});
  assert.equal((await (await call('config',{headers})).json()).account,null);
});

test('hosted sign-in works without Auth0 and scopes backups to the active identity',async()=>{
  const {withHostedAccounts}=await import('../src/accounts.js');
  const handle=withHostedAccounts(async(req,env,owner)=>Response.json({sync:!!owner}));
  const call=(path,headers={})=>handle(new Request('https://example.org/api/v1/'+path,{headers}),{});
  assert.equal((await (await call('config')).json()).accountProvider,'hosted');
  assert.equal((await call('auth/login')).headers.get('Location'),'/signin-with-chatgpt?return_to=%2F');
  const headers={'oai-authenticated-user-id':'learner','oai-authenticated-user-email':'user@example.org'};
  assert.equal((await (await call('config',headers)).json()).account.email,'user@example.org');
  assert.equal((await call('sessions',headers)).status,409);
  assert.equal((await call('sessions',{...headers,'X-SpeakBuddy-Account':'learner'})).status,200);
});
