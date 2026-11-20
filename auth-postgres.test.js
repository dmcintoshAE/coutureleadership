const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {createAuth,tiers}=require('./dist/auth');

test('PostgreSQL persists accounts, seeds and state across auth instances', {skip:!process.env.TEST_DATABASE_URL}, async()=>{
 const url=new URL(process.env.TEST_DATABASE_URL);
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Use a local Docker test database');
 const env={DATABASE_URL:url.toString()};
 let auth=createAuth({env});
 const server=http.createServer((req,res)=>auth.handler(req,res));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 async function call(action,body,cookie){
  const response=await fetch(base+'/api/auth/'+action,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 try{
  await auth.seedAdmins();
  for(const email of ['tiffany@coutureleadership.com','admin@coutureleadership.com']){
   const login=await call('login',{email,password:'CoutureAdmin2026!'});
   assert.equal(login.status,200);assert.equal(login.data.user.role,'admin');assert.equal(login.data.user.tier,tiers[3]);
  }
  const details={email:'test-'+require('node:crypto').randomUUID()+'@example.com',password:'test-password',firstName:'Test',lastName:'Leader',role:'admin'};
  const signup=await call('signup',details);assert.equal(signup.status,200);assert.equal(signup.data.user.role,'member');
  assert.equal((await call('signup',details)).status,409);
  assert.equal((await call('login',{...details,password:'wrong-pass'})).status,401);
  const cookie=signup.cookie;
  await Promise.all([call('state',{discovery:{saved:true}},cookie),call('state',{career:{plan:'saved'}},cookie)]);
  await auth.close();auth=createAuth({env});await auth.seedAdmins();
  const me=await call('me',undefined,cookie);assert.equal(me.data.user.id,signup.data.user.id);assert.deepEqual(me.data.state,{discovery:{saved:true},career:{plan:'saved'}});
  assert.equal((await call('login',details)).status,200);
  assert.equal((await call('me',undefined,cookie+'bad')).data.user,null);
  assert.equal((await call('state',{})).status,401);
  assert.deepEqual((await call('reset-data',{},cookie)).data.state,{});
  await auth.close();auth=createAuth({env});
  assert.deepEqual((await call('me',undefined,cookie)).data.state,{});
 }finally{await new Promise(resolve=>server.close(resolve));await auth.close();}
});
