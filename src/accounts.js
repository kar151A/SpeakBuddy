// Authentication is optional so existing device-only installations keep working.
export function withAccounts(api) {
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b=>b.toString(16).padStart(2,'0')).join('');
  async function digest(value) {
    const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
    return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  }
  return async function handle(request,env,device) {
    if (!(env.AUTH0_DOMAIN && env.AUTH0_CLIENT_ID && env.AUTH0_CLIENT_SECRET && env.APP_ORIGIN)) return api(request,env,device);
    const url=new URL(request.url), issuer='https://'+env.AUTH0_DOMAIN;
    const callback=new URL('/api/v1/auth/callback',env.APP_ORIGIN).href;
    const secure=callback.startsWith('https:')?'; Secure':'';
    const cookie=(name,value,age)=>name+'='+value+'; HttpOnly; SameSite=Lax; Path=/; Max-Age='+age+secure;
    const read=name=>(request.headers.get('Cookie')||'').split(/;\s*/).find(c=>c.startsWith(name+'='))?.slice(name.length+1);
    const redirect=(location,value)=>new Response(null,{status:303,headers:{Location:location,'Set-Cookie':value,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    const failure=(message,status)=>new Response(message,{status,headers:{'Cache-Control':'no-store'}});
    const now=Math.floor(Date.now()/1000);
    const session=read('sb-account');
    const sessionHash=session && /^[0-9a-f]{64}$/.test(session)?await digest(session):null;
    const db=env.DB;
    if(url.pathname==='/api/v1/auth/login' && request.method==='GET'){
      // Start and finish on the same origin so the callback receives the PKCE cookie.
      const start=new URL('/api/v1/auth/login',env.APP_ORIGIN);
      if(url.origin!==start.origin)return new Response(null,{status:303,headers:{Location:start.href,'Cache-Control':'no-store'}});
      const verifier=token(), state=token();
      const target=new URL('/authorize',issuer);
      target.search=new URLSearchParams({response_type:'code',client_id:env.AUTH0_CLIENT_ID,scope:'openid email',redirect_uri:callback,state,code_challenge:await digest(verifier),code_challenge_method:'S256',prompt:'login'});
      return redirect(target.href,cookie('sb-login',state+'.'+verifier,600));
    }
    if(url.pathname==='/api/v1/auth/callback' && request.method==='GET'){
      const [state,verifier]=(read('sb-login')||'').split('.');
      const code=url.searchParams.get('code');
      if(!state || !verifier || !code || state!==url.searchParams.get('state'))return failure('Sign-in expired or cancelled. Return to Settings and try again.',400);
      const call=env.authFetch||fetch;
      const res=await call(issuer+'/oauth/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',client_id:env.AUTH0_CLIENT_ID,client_secret:env.AUTH0_CLIENT_SECRET,code,redirect_uri:callback,code_verifier:verifier})});
      if(!res.ok)return failure('Sign-in could not be completed. Please try again.',401);
      const {access_token}=await res.json();
      const identity=await call(issuer+'/userinfo',{headers:{Authorization:'Bearer '+access_token}});
      if(!identity.ok)return failure('Account verification failed.',401);
      const {sub,email}=await identity.json();
      if(typeof sub!=='string'||!sub)return failure('Missing account identity.',401);
      const owner='account-'+await digest(issuer+'|'+sub), id=token();
      await db.prepare('DELETE FROM account_sessions WHERE expires<=?').bind(now).run();
      await db.prepare('INSERT INTO account_sessions VALUES (?,?,?,?)').bind(await digest(id),owner,email||'',now+604800).run();
      return redirect('/',cookie('sb-account',id,604800));
    }
    if(url.pathname==='/api/v1/auth/logout' && request.method==='POST'){
      if(request.headers.get('Origin')!==new URL(env.APP_ORIGIN).origin)return failure('Invalid origin.',403);
      if(sessionHash)await db.prepare('DELETE FROM account_sessions WHERE id=?').bind(sessionHash).run();
      return redirect('/',cookie('sb-account','',0));
    }
    const account=sessionHash?await db.prepare('SELECT owner,email FROM account_sessions WHERE id=? AND expires>?').bind(sessionHash,now).first():null;
    if(url.pathname==='/api/v1/config'){
      const base=await api(request,env,account?.owner);
      return Response.json({...await base.json(),accounts:true,account:account||null},{headers:{'Cache-Control':'no-store'}});
    }
    if(url.pathname.startsWith('/api/v1/sessions') || url.pathname==='/api/v1/me'){
      if(account && request.headers.get('X-SpeakBuddy-Account')!==account.owner)return failure('Account changed. Refresh SpeakBuddy.',409);
    }
    return api(request,env,account?.owner);
  };
}

// Only the deployed Worker uses this adapter. The local Node server never trusts identity headers.
export function withHostedAccounts(api) {
  return async function handle(request, env) {
    const owner = request.headers.get('oai-authenticated-user-id');
    const path = new URL(request.url).pathname;
    if (path === '/api/v1/auth/login' && request.method === 'GET') {
      return new Response(null, {status:303, headers:{
        Location:'/signin-with-chatgpt?return_to=%2F', 'Cache-Control':'no-store'
      }});
    }
    if (path === '/api/v1/config' && request.method === 'GET') {
      const base = await api(request, env, owner);
      const account = owner ? {owner, email:request.headers.get('oai-authenticated-user-email') || ''} : null;
      return Response.json({...await base.json(), accounts:true, accountProvider:'hosted', account}, {
        headers:{'Cache-Control':'no-store'}
      });
    }
    if (owner && (path.startsWith('/api/v1/sessions') || path === '/api/v1/me')
        && request.headers.get('X-SpeakBuddy-Account') !== owner) {
      return Response.json({error:'Your signed-in account changed. Refresh SpeakBuddy.'},{status:409});
    }
    return api(request, env, owner);
  };
}
