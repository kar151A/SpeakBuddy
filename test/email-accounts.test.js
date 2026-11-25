import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/local-db.js';
import {withEmailAccounts} from '../src/email-accounts.js';

test('registration and OTP verification never log a learner in; verified password login starts a revocable session',async t=>{
  const DB=openDatabase(':memory:');t.after(()=>DB.close());
  const origin='https://studio.example',email='learner@example.org',password='sample password';
  const core=async(req,env,owner)=>Response.json({sync:!!owner});
  const handle=withEmailAccounts(core,async()=>Response.json({account:null}));
  let confirmed=false, auto=false;
  const env={DB,SUPABASE_URL:'https://identity.example',SUPABASE_PUBLISHABLE_KEY:'test',emailAuthFetch:async(url,init)=>{
    if(url.endsWith('/settings'))return Response.json({mailer_autoconfirm:auto});
    const data=JSON.parse(init.body);
    assert.equal(data.email,email);
    if(url.endsWith('/signup')){assert.equal(data.password,password);return Response.json({id:'id'});}
    if(url.endsWith('/resend')){assert.equal(data.type,'signup');return Response.json({});}
    if(url.endsWith('/verify')){
      if(data.token!=='123456')return Response.json({error_code:'otp_expired'},{status:403});
      confirmed=true;return Response.json({access_token:'unused'});
    }
    assert.ok(url.endsWith('token?grant_type=password'));
    if(!confirmed)return Response.json({error_code:'email_not_confirmed'},{status:400});
    return Response.json({access_token:'unused',user:{id:'id',email,email_confirmed_at:'2026-01-01'}});
  }};
  const post=(action,data={},cookie='')=>handle(new Request(origin+'/api/v1/email/'+action,{method:'POST',headers:{origin,'Content-Type':'application/json',cookie},body:JSON.stringify({email,...data})}),env);
  const config=cookie=>handle(new Request(origin+'/api/v1/config',{headers:{cookie}}),env).then(r=>r.json());
  assert.equal((await post('register',{password})).headers.get('Set-Cookie'),null);
  assert.equal((await (await post('login',{password})).json()).verificationRequired,true);
  assert.equal((await post('verify',{code:'000000'})).status,400);
  assert.equal((await post('resend')).status,200);
  assert.equal((await post('verify',{code:'123456'})).headers.get('Set-Cookie'),null);
  assert.equal((await config('')).account,null);
  const login=await post('login',{password});
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await config(cookie)).account.email,email);
  await post('logout',{},cookie);
  assert.equal((await config(cookie)).account,null);
  auto=true;
  assert.equal((await post('register',{password})).status,503);
});
