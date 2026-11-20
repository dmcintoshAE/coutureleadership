const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('./dist/index');
test('public landing and direct workspace routes serve distinct pages',async()=>{
 const server=createServer({env:{}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const landing=await fetch(base+'/');assert.equal(landing.status,200);assert.match(await landing.text(),/Leadership is personal/i);
  for(const route of ['/app','/app/','/app/diagnostic','/app/report','/app/simulator','/app/career','/app/analytics']){
   const response=await fetch(base+route);assert.equal(response.status,200,route);assert.match(response.headers.get('content-type'),/text\/html/);assert.match(await response.text(),/id="dashboard"/);
  }
  for(const route of ['/app/missing','/missing'])assert.equal((await fetch(base+route)).status,404);
  for(const route of ['/landing.css','/style.css','/app.js'])assert.equal((await fetch(base+route)).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('authentication aliases, landing CTAs and workspace parity',async()=>{
 const fs=require('node:fs');
 const server=createServer({env:{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const expected=fs.readFileSync('dist/public/login.html','utf8');
  for(const route of ['/login','/auth','/login?next=%2Fapp%2Fcareer']){const res=await fetch(base+route);assert.equal(res.status,200);assert.equal(await res.text(),expected);}
  assert.equal(fs.readFileSync('dist/public/workspace.html','utf8'),fs.readFileSync('dist/public/app.html','utf8'));
  const landing=await (await fetch(base)).text();
  assert.match(landing,/href="\/login" class="cl-btn-gold">Get Started/);assert.match(landing,/href="\/login">Begin discovery/);assert.doesNotMatch(landing,/\/app#auth/);
  const rewrites=JSON.parse(fs.readFileSync('vercel.json','utf8')).rewrites;
  for(const source of ['/login','/auth'])assert.ok(rewrites.some(r=>r.source===source&&r.destination==='/login.html'));
  for(const file of ['login.html','login.js','login.css'])assert.doesNotMatch(fs.readFileSync('dist/public/'+file,'utf8'),/\bAI\b/);
 }finally{await new Promise(r=>server.close(r));}
});