const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('./dist/index');
const payload={scenarioId:'growth',choices:[1,0,2],reflection:'Listen before committing.'};
async function withServer(options,run){const server=createServer(options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{await run(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(resolve=>server.close(resolve));}}
const post=(base,body=payload,headers={})=>fetch(base+'/api/coach',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('coach uses authoritative scenario, protects credentials and disables storage',async()=>{
 let sent;
 await withServer({env:{OPENAI_API_KEY:'test-secret',OPENAI_MODEL:'test-model'},fetchImpl:async(url,options)=>{sent={url,...options};return {ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Consider the delivery team.'}]}]})};}},async base=>{
  const response=await post(base);assert.equal(response.status,200);assert.deepEqual(await response.json(),{text:'Consider the delivery team.'});
  const body=JSON.parse(sent.body);assert.equal(body.store,false);assert.equal(body.model,'test-model');assert.equal(sent.headers.Authorization,'Bearer test-secret');
  const input=JSON.parse(body.input);assert.equal(input.decisions[0].action,'Negotiate a phased pilot');assert.equal(input.reflection,payload.reflection);assert.equal(input.decisions.length,3);
 });
});
test('coach rejects invalid, oversized, cross-origin and unsupported requests',async()=>{
 await withServer({env:{}},async base=>{
  assert.equal((await fetch(base+'/api/coach')).status,405);
  for(const body of [{...payload,choices:[1]},{...payload,choices:[0,0,99]},{...payload,reflection:'x'.repeat(3001)},null])assert.equal((await post(base,body)).status,400);
  assert.equal((await post(base,{...payload,reflection:'x'.repeat(17000)})).status,413);
  assert.equal((await post(base,payload,{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await post(base)).status,503);
 });
});
test('coach sanitizes provider errors, refuses incomplete feedback and limits requests',async()=>{
 for(const provider of [async()=>{throw new Error('test-secret');},async()=>({ok:false,status:401}),async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})})]){
  await withServer({env:{OPENAI_API_KEY:'test-secret',OPENAI_MODEL:'test'},fetchImpl:provider},async base=>{
   const response=await post(base);assert.equal(response.status,502);assert.doesNotMatch(await response.text(),/test-secret/);
  });
 }
 await withServer({env:{OPENAI_API_KEY:'test',OPENAI_MODEL:'test'},fetchImpl:async()=>({ok:false,status:503})},async base=>{
  for(let i=0;i<5;i++)assert.equal((await post(base)).status,502);
  const response=await post(base);assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'60');
 });
});

test('expanded scenarios use their own authoritative context and decisions for coaching',async()=>{
 const {scenarios}=require('./dist/public/simulation');
 for(const scenario of scenarios.slice(3)){
  let input;
  await withServer({env:{OPENAI_API_KEY:'test',OPENAI_MODEL:'test'},fetchImpl:async(url,options)=>{
   input=JSON.parse(JSON.parse(options.body).input);
   return {ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Review your assumptions.'}]}]})};
  }},async base=>{
   const response=await post(base,{scenarioId:scenario.id,choices:[0,1,2],reflection:''});
   assert.equal(response.status,200);
   for(let i=0;i<3;i++)assert.equal(input.decisions[i].action,scenario.rounds[i].options[i][0]);
  });
 }
});