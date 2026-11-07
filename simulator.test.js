const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const ExecutiveSimulation=require('./dist/public/simulation');
function setup(overrides={}){
 const handlers={},commit={disabled:true};
 const host={innerHTML:'',addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[],querySelector:selector=>selector==='[data-sim="commit"]'?commit:{setAttribute(){},focus(){}}};
 const context={ExecutiveSimulation,document:{getElementById:()=>host,createElement:()=>({click(){}})},URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob,setTimeout:fn=>fn(),AbortSignal,...overrides};
 vm.runInNewContext(fs.readFileSync('./dist/public/simulator.js','utf8'),context);
 return {host,click(data,disabled=false){handlers.click({target:{closest:()=>({dataset:data,disabled})}});},note(value){handlers.input({target:{id:'sim-reflection',value}});}};
}
test('simulator requires commitment and completes every scenario with a debrief',()=>{
 for(const scenario of ExecutiveSimulation.scenarios){
  const app=setup();
  assert.match(app.host.innerHTML,/Choose your challenge/);
  app.click({sim:scenario.id});
  app.click({sim:'commit'});
  assert.match(app.host.innerHTML,/0 of 3 decisions committed/);
  for(let round=0;round<3;round++){
   app.click({choice:String(round)});
   assert.doesNotMatch(app.host.innerHTML,/THE CONSEQUENCE/);
   app.click({sim:'commit'});
   assert.match(app.host.innerHTML,/THE CONSEQUENCE/);
   assert.match(app.host.innerHTML,new RegExp(`${round+1} of 3 decisions committed`));
   app.click({sim:'next'});
  }
  assert.match(app.host.innerHTML,/SIMULATION COMPLETE/);
  app.note('<private reflection>');
  app.click({sim:'download'});
  app.click({sim:'retry'});
  assert.match(app.host.innerHTML,/DECISION 01/);
  assert.match(app.host.innerHTML,/0 of 3 decisions committed/);
  app.click({sim:'home'});
  assert.match(app.host.innerHTML,/Choose your challenge/);
 }
});

function complete(app){app.click({sim:'growth'});for(let i=0;i<3;i++){app.click({choice:'1'});app.click({sim:'commit'});app.click({sim:'next'});}}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('live coach sends reflection only on request, escapes output and prevents duplicate requests',async()=>{
 const calls=[];let resolve;
 const app=setup({fetch:(...args)=>{calls.push(args);return new Promise(done=>resolve=done);}});
 complete(app);assert.equal(calls.length,0);app.note('My next step');app.click({sim:'coach'});app.click({sim:'coach'});
 assert.equal(calls.length,1);assert.equal(JSON.parse(calls[0][1].body).reflection,'My next step');assert.match(app.host.innerHTML,/Preparing your coaching/);
 resolve({ok:true,json:async()=>({text:'<script>bad()</script>\nReflect on trust.'})});await settle();
 assert.match(app.host.innerHTML,/&lt;script&gt;/);assert.doesNotMatch(app.host.innerHTML,/<script>/);assert.match(app.host.innerHTML,/Refresh coaching/);
});
test('coach failures can be retried and late results cannot replace a reset session',async()=>{
 let resolve;let calls=0;
 const app=setup({fetch:async()=>{calls++;if(calls===1)throw new Error('Unavailable');return new Promise(done=>resolve=done);}});
 complete(app);app.click({sim:'coach'});await settle();assert.match(app.host.innerHTML,/Retry AI coaching/);
 app.click({sim:'coach'});app.click({sim:'home'});resolve({ok:true,json:async()=>({text:'Stale feedback'})});await settle();
 assert.match(app.host.innerHTML,/Choose your challenge/);assert.doesNotMatch(app.host.innerHTML,/Stale feedback/);
 complete(app);assert.doesNotMatch(app.host.innerHTML,/Stale feedback|Unavailable/);
});
test('scenario library renders every challenge with valid icons and numbered cards',()=>{
 const app=setup();
 for(const [index,scenario] of ExecutiveSimulation.scenarios.entries()){
  assert.ok(app.host.innerHTML.includes(`data-sim="${scenario.id}"`));
  assert.ok(app.host.innerHTML.includes(scenario.name));
  assert.ok(app.host.innerHTML.includes(`SCENARIO ${String(index+1).padStart(2,'0')}`));
 }
 assert.doesNotMatch(app.host.innerHTML,/undefined/);
});