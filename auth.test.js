const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createServer}=require('./dist/index');
const {createAuth,tiers}=require('./dist/auth');

test('admin seeding is idempotent and login preserves paid module and coaching access regardless of tier',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'couture-admin-'));
 const env={ACCOUNTS_DIR:dir,REQUIRE_PAID_COACH:'true',COACH_MEMBERSHIP_TOKEN:'manual',OPENAI_API_KEY:'test',OPENAI_MODEL:'test'};
 const auth=createAuth({env});auth.seedAdmins();
 const records=()=>fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
 const initial=records();assert.equal(initial.length,2);
 auth.seedAdmins();assert.deepEqual(records(),initial);
 for(const a of initial){assert.equal(a.role,'admin');assert.equal(a.tier,tiers[3]);assert.equal(a.passwordHash,require('node:crypto').scryptSync('CoutureAdmin2026!',a.salt,64).toString('hex'));}
 const founder=initial.find(a=>a.email==='tiffany@coutureleadership.com');
 founder.tier=tiers[0];founder.state={discovery:{saved:true}};
 fs.writeFileSync(path.join(dir,founder.id+'.json'),JSON.stringify(founder));
 auth.seedAdmins();assert.deepEqual(records().find(a=>a.id===founder.id),founder);
 const server=createServer({env,fetchImpl:async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Reflect on your choices.'}]}]})})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const a of records()){
   const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:a.email,password:'CoutureAdmin2026!'})});
   assert.equal(login.status,200);const data=await login.json();assert.equal(data.user.role,'admin');assert.equal(data.user.passwordHash,undefined);assert.equal(auth.paid(data.user),true);
   const cookie=login.headers.get('set-cookie').split(';')[0];
   const me=await (await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).json();assert.equal(me.user.role,'admin');
   const coaching=await fetch(base+'/api/coach',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({scenarioId:'growth',choices:[1,0,2],reflection:'Listen first.'})});assert.equal(coaching.status,200);
  }
 }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
test('account lifecycle, isolated state, signed cookies and paid coaching',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'couture-auth-'));
 const server=createServer({env:{ACCOUNTS_DIR:dir,REQUIRE_PAID_COACH:'true',COACH_MEMBERSHIP_TOKEN:'manual',OPENAI_API_KEY:'test',OPENAI_MODEL:'test'},fetchImpl:async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Reflect on your choices.'}]}]})})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 async function call(action,body,cookie){return fetch(base+'/api/'+action,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});}
 const details={firstName:'Test',lastName:'Leader',email:'first@example.com',password:'test-password',role:'admin'};
 try{
  assert.equal((await call('auth/signup',{...details,password:'short'})).status,400);
  const signup=await call('auth/signup',details);assert.equal(signup.status,200);
  const cookie=signup.headers.get('set-cookie').split(';')[0];assert.match(signup.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
  const first=await signup.json();assert.equal(first.user.tier,tiers[0]);assert.equal(first.user.role,'member');assert.equal(first.user.passwordHash,undefined);
  assert.equal((await call('auth/signup',details)).status,409);
  assert.equal((await call('auth/login',{email:details.email,password:'wrong-pass'})).status,401);
  assert.equal((await call('auth/login',{email:details.email.toUpperCase(),password:details.password})).status,200);
  await call('auth/state',{discovery:{firstName:'Saved'},diagnostic:{0:5},career:{plan:{done:true}}},cookie);
  const other=await call('auth/signup',{...details,email:'second@example.com',tier:tiers[1]});const secondCookie=other.headers.get('set-cookie').split(';')[0];
  assert.deepEqual((await (await call('auth/me',undefined,secondCookie)).json()).state,{});
  assert.equal((await (await call('auth/me',undefined,cookie)).json()).state.diagnostic[0],5);
  assert.deepEqual(await (await call('auth/me',undefined,cookie+'bad')).json(),{user:null});
  assert.equal((await call('auth/state',{})).status,401);
  const coaching={scenarioId:'growth',choices:[1,0,2],reflection:'Listen first.'};
  assert.equal((await call('coach',coaching,cookie)).status,403);
  assert.equal((await call('coach',coaching,secondCookie)).status,200);
  for(const tier of tiers.slice(2)){const response=await call('auth/signup',{...details,email:tier.split(' ')[0].replace('/','')+'@example.com',tier});assert.equal(response.status,200);assert.equal((await call('coach',coaching,response.headers.get('set-cookie').split(';')[0])).status,200);}
  assert.deepEqual(await (await call('auth/reset-data',{},cookie)).json(),{ok:true,state:{}});
  const me=await (await call('auth/me',undefined,cookie)).json();assert.deepEqual(me.state,{});assert.equal(me.user.id,first.user.id);assert.equal(me.user.tier,tiers[0]);
  assert.equal((await call('auth/login',{email:details.email,password:details.password})).status,200);
  assert.match((await call('auth/logout',{},cookie)).headers.get('set-cookie'),/Max-Age=0/);
 }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});

test('workspace gates anonymous visits and renders guest or account controls',async()=>{
 const vm=require('node:vm');
 async function visit(search,user){
  const nodes={};const element=()=>({children:[],setAttribute(){},append(n){this.children.push(n);},replaceChildren(){this.children=[];}});
  nodes['workspace-account']=element();let redirected;
  const context={URLSearchParams,encodeURIComponent,window:{},location:{pathname:'/app/career',search,hash:'',replace(url){redirected=url;}},localStorage:{removeItem(){},getItem(){return null;}},document:{getElementById:id=>nodes[id],createElement:element,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>({user,state:{}})})};
  await vm.runInNewContext(fs.readFileSync('dist/public/auth-client.js','utf8'),context);
  return {redirected,children:nodes['workspace-account'].children,paid:context.window.CoutureAccount.paid};
 }
 assert.equal((await visit('',null)).redirected,'/login?next=%2Fapp%2Fcareer');
 const guest=await visit('?guest=1',null);assert.equal(guest.redirected,undefined);assert.equal(guest.children[0].textContent,'Guest Discovery · Sign in to save');
 const member=await visit('',{id:'member',firstName:'Jane',lastName:'Leader',tier:tiers[2]});assert.equal(member.redirected,undefined);assert.deepEqual(member.children.slice(0,4).map(x=>x.textContent),['Jane Leader',tiers[2],'Reset Account Test Data','Sign Out']);
 const admin=await visit('',{id:'admin',firstName:'Tiffany',lastName:'Founder',tier:tiers[0],role:'admin'});assert.equal(admin.paid,true);assert.deepEqual(admin.children.slice(0,3).map(x=>x.textContent),['Tiffany Founder',tiers[0],'Admin']);
 assert.equal((await visit('',{id:'free',tier:tiers[0]})).paid,false);
});

test('login submits both modes and restricts next to local destinations',async()=>{
 const vm=require('node:vm');
 async function submit(next,create=false,ok=true){
  const nodes={};for(const id of ['signin-tab','signup-tab','account-panel','account-names','account-tier','account-title','account-intro','account-error'])nodes[id]={setAttribute(){},focus(){}};
  const button={};const form={elements:{tier:{},password:{}},querySelector:()=>button};nodes['login-form']=form;let redirected,endpoint;
  const context={URL,URLSearchParams,location:{origin:'http://localhost:3002',search:'?next='+encodeURIComponent(next),replace:url=>redirected=url},document:{getElementById:id=>nodes[id]},FormData:class{*[Symbol.iterator](){yield ['email','leader@example.com'];}},fetch:async url=>{endpoint=url;return {ok,json:async()=>ok?{user:{}}:{error:'Invalid credentials.'}};}};
  vm.runInNewContext(fs.readFileSync('dist/public/login.js','utf8'),context);
  if(create)nodes['signup-tab'].onclick();await form.onsubmit({preventDefault(){}});
  return {redirected,endpoint,error:nodes['account-error'].textContent,button};
 }
 assert.equal((await submit('/app/career')).redirected,'/app/career');
 const signup=await submit('/app',true);assert.equal(signup.endpoint,'/api/auth/signup');assert.equal(signup.redirected,'/app');
 for(const next of ['https://example.com','//example.com','/login','/auth?next=/app','/\\example.com'])assert.equal((await submit(next)).redirected,'/app');
 const failed=await submit('/app',false,false);assert.equal(failed.redirected,undefined);assert.equal(failed.error,'Invalid credentials.');assert.equal(failed.button.disabled,false);
});
