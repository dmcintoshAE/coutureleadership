const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const executive=require('./dist/public/career-executive');

test('executive state sanitizes saved drafts and synthesizes only supplied facts',()=>{
 const state=executive.normalize({name:'Alex',facts:'Led a service redesign.',question:99,rows:[{priority:'Growth',evidence:42}],answers:['Example']});
 assert.equal(state.question,0);
 assert.equal(state.rows.length,3);
 assert.equal(state.rows[0].evidence,'');
 assert.equal(state.answers.length,5);
 assert.equal(executive.synthesize(state,{currentRole:'Director',strengths:'Strategic clarity',targetRole:'CEO'}),'Alex — Director\n\nLed a service redesign.\n\nStrengths: Strategic clarity');
 assert.match(executive.feedback(''),/Write an answer/);
 assert.match(executive.feedback('I led change'),/3 words/);
});

test('executive workspace saves separate interview answers, escapes drafts, and clears all work',()=>{
 const handlers={},elements={};let saved;
 const host={innerHTML:'',addEventListener:(type,fn)=>handlers[type]=fn,querySelector:s=>elements[s]??=( {textContent:'',value:'',focus(){}} )};
 const context={document:{},localStorage:{getItem:()=>JSON.stringify({name:'<Alex>',facts:'<script>alert(1)</script>'}),setItem:(key,value)=>saved=JSON.parse(value)}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('dist/public/career-executive.js','utf8'),context);
 const app=context.CareerExecutive.mount(host,()=>({currentRole:'Director'}));
 assert.match(host.innerHTML,/&lt;Alex&gt;/);assert.doesNotMatch(host.innerHTML,/<script>/);
 const input=(id,value)=>handlers.input({target:{dataset:{execField:id},value}});
 const click=action=>handlers.click({target:{closest:()=>({dataset:{exec:action}})}});
 input('answer','First answer');handlers.change({target:{id:'exec-question',value:'1'}});input('answer','Second answer');
 assert.deepEqual(saved.answers.slice(0,2),['First answer','Second answer']);
 click('bio');assert.match(elements['#exec-bio'].value,/Director/);
 input('priority-0','Growth');click('alignment');assert.match(elements['[data-exec-alignment]'].innerHTML,/Evidence gap/);
 input('evidence-0','Delivered a verified outcome');click('alignment');assert.match(elements['[data-exec-alignment]'].innerHTML,/Evidence recorded/);
 context.localStorage.setItem=()=>{throw Error('Unavailable');};
 input('focus','Session-only focus');
 context.CareerExecutive.mount(host,()=>({}),app.snapshot());
 assert.match(host.innerHTML,/Session-only focus/);
 assert.match(elements['[data-exec-status]'].textContent,/unavailable/);
 context.localStorage.setItem=(key,value)=>saved=JSON.parse(value);
 app.clear();assert.equal(saved.bio,'');assert.ok(saved.answers.every(a=>a===''));assert.equal(saved.rows[0].priority,'');
});
function setup(saved,fail=false){
 const handlers={},output={innerHTML:''},status={},confirm={hidden:true};let stored;
 const host={innerHTML:'',addEventListener:(type,fn)=>handlers[type]=fn,querySelector:s=>s==='#career-output'?output:s==='#career-save'?status:s==='#career-confirm'?confirm:{focus(){}}};
 vm.runInNewContext(fs.readFileSync('dist/public/career.js','utf8'),{document:{getElementById:()=>host},localStorage:{getItem(){if(fail)throw Error();return saved;},setItem(k,v){if(fail)throw Error();stored=JSON.parse(v);}}});
 return {host,output,status,confirm,get stored(){return stored;},change(i,checked){handlers.change({target:{dataset:{careerAction:String(i)},checked}});},click(action){handlers.click({target:{closest:()=>({dataset:{career:action}})}});}};
}
test('career restores escaped plans and persists completed actions',()=>{
 const app=setup(JSON.stringify({profile:{targetRole:'<Director>',strengths:'<script>'},planned:true,done:[true]}));
 assert.match(app.host.innerHTML,/&lt;Director&gt;/);
 assert.doesNotMatch(app.host.innerHTML,/<script>/);
 assert.match(app.host.innerHTML,/1 of 6 actions complete/);
 app.change(1,true);
 assert.match(app.output.innerHTML,/2 of 6 actions complete/);
 assert.deepEqual(app.stored.done,[true,true,false,false,false,false]);
 app.click('reset');assert.equal(app.confirm.hidden,false);
 app.click('confirm');assert.equal(app.stored.planned,false);
 assert.match(app.host.innerHTML,/Enter your target role/);
});
test('career handles malformed or unavailable storage without losing the workspace',()=>{
 for(const [data,fail] of [['{',false],['null',false],['',true]]){
  const app=setup(data,fail);
  assert.match(app.host.innerHTML,/Build my blueprint/);
  if(fail)assert.match(app.status.textContent,/storage is unavailable/);
 }
});
