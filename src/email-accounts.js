// Email credentials and confirmation codes are verified by Supabase Auth.
// Only a random SpeakBuddy session identifier is returned to the browser.
export function withEmailAccounts(core, primary) {
  const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
  const fail=(message,status)=>json({error:message},status);
  async function hash(value) {
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  }
  return async function handle(request,env) {
    const url=new URL(request.url);
    const ready=!!(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY && env.DB);
    const now=Math.floor(Date.now()/1000);
    const raw=request.headers.get('Cookie')?.match(/(?:^|;\s*)sb-email=([0-9a-f]{64})(?:;|$)/)?.[1];
    const id=raw?await hash(raw):null;
    const cookie=(value,age)=>'sb-email='+value+'; HttpOnly; Path=/; SameSite=Lax; Max-Age='+age+(url.protocol==='https:'?'; Secure':'');
    if(url.pathname.startsWith('/api/v1/email/')){
      if(request.method!=='POST')return fail('Use POST.',405);
      if(request.headers.get('origin')!==url.origin)return fail('Invalid origin.',403);
      const action=url.pathname.slice('/api/v1/email/'.length);
      if(action==='logout'){
        if(id)await env.DB.prepare('DELETE FROM account_sessions WHERE id=?').bind(id).run();
        return new Response(null,{status:303,headers:{Location:'/','Set-Cookie':cookie('',0),'Cache-Control':'no-store'}});
      }
      if(!['register','verify','resend','login'].includes(action))return fail('Unknown account action.',404);
      if(!ready)return fail('Email accounts are unavailable. Use the other sign-in option.',503);
      if(!request.headers.get('content-type')?.startsWith('application/json'))return fail('Expected JSON.',415);
      const reader=request.body?.getReader();
      if(!reader)return fail('Missing form.',400);
      let size=0; const chunks=[];
      while(true){
        const {value,done}=await reader.read();if(done)break;
        size+=value.length;
        if(size>4096){await reader.cancel();return fail('Account form is too large.',413);}
        chunks.push(value);
      }
      let data;
      try{data=JSON.parse(await new Blob(chunks).text());}catch{return fail('Invalid form.',400);}
      const email=typeof data?.email==='string'?data.email.trim().toLowerCase():'';
      if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254)return fail('Enter a valid email address.',400);
      const body={email};
      if(action==='register'||action==='login'){
        if(typeof data.password!=='string'||!data.password.length||data.password.length>512)return fail('Enter your password.',400);
        if(action==='register' && data.password.length<10)return fail('Use at least 10 characters for your password.',400);
        body.password=data.password;
      }
      if(action==='verify'){
        if(typeof data.code!=='string'||!/^\d{6,10}$/.test(data.code))return fail('Enter the numeric code from your email.',400);
        Object.assign(body,{type:'email',token:data.code});
      }
      if(action==='resend')body.type='signup';
      const root=env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/';
      const call=env.emailAuthFetch||fetch;
      const headers={apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
      const options={headers,redirect:'error',signal:AbortSignal.timeout(12000)};
      try{
        const settings=await call(root+'settings',options);
        if(!settings.ok||(await settings.json()).mailer_autoconfirm!==false)return fail('Email verification is not configured. Try the other sign-in option.',503);
        const paths={register:'signup',login:'token?grant_type=password',resend:'resend',verify:'verify'};
        const response=await call(root+paths[action],{...options,method:'POST',body:JSON.stringify(body)});
        if(response.status===429)return fail('Too many attempts. Please wait before trying again.',429);
        if(response.status>=500)return fail('The email service is unavailable. Please retry later.',503);
        const result=await response.json();
        if(!response.ok){
          if(result.error_code==='email_not_confirmed')return json({error:'Verify your email before logging in.',verificationRequired:true},403);
          if(action==='login')return fail('Email or password is incorrect.',401);
          if(action==='verify')return fail('The code is incorrect or expired. Request another code.',400);
          return fail(action==='resend'?'Could not resend the code. Please try again later.':'Registration could not be completed. Check your details or try logging in.',400);
        }
        if(action!=='login')return json({ok:true});
        if(!result.access_token || !result.user?.email_confirmed_at || !result.user.id || result.user.email?.toLowerCase()!==email)return fail('Verify your email before logging in.',403);
        const owner='email-'+await hash(root+'|'+result.user.id);
        const secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
        await env.DB.prepare('DELETE FROM account_sessions WHERE expires<=?').bind(now).run();
        await env.DB.prepare('INSERT INTO account_sessions VALUES (?,?,?,?)').bind(await hash(secret),owner,email,now+604800).run();
        return json({ok:true},200,{'Set-Cookie':cookie(secret,604800)});
      }catch{return fail('Account service is unavailable. Please retry.',503);}
    }
    const account=id && ready?await env.DB.prepare('SELECT owner,email FROM account_sessions WHERE id=? AND expires>?').bind(id,now).first():null;
    if(account && (url.pathname.startsWith('/api/v1/sessions')||url.pathname==='/api/v1/me') && request.headers.get('X-SpeakBuddy-Account')!==account.owner)return fail('Your account changed. Refresh SpeakBuddy.',409);
    const response=account?await core(request,env,account.owner):await primary(request,env);
    if(url.pathname!=='/api/v1/config' || request.method!=='GET')return response;
    return json({...await response.json(),emailAccounts:ready,...(account?{accounts:true,accountProvider:'email',account}:{})});
  };
}
