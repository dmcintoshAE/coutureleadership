const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('./dist/index');
test('public landing and direct workspace routes serve distinct pages',async()=>{
 const server=createServer({env:{}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const landing=await fetch(base+'/');assert.equal(landing.status,200);assert.match(await landing.text(),/Leadership is personal/);
  for(const route of ['/app','/app/','/app/diagnostic','/app/report','/app/simulator','/app/career','/app/analytics']){
   const response=await fetch(base+route);assert.equal(response.status,200,route);assert.match(response.headers.get('content-type'),/text\/html/);assert.match(await response.text(),/id="dashboard"/);
  }
  for(const route of ['/app/missing','/missing'])assert.equal((await fetch(base+route)).status,404);
  for(const route of ['/landing.css','/style.css','/app.js'])assert.equal((await fetch(base+route)).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
