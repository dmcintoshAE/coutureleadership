const {test}=require('node:test');
const assert=require('node:assert/strict');
const {scenarios,outcome}=require('./dist/public/simulation');
test('every scenario path has consequences and bounded outcome indicators',()=>{
 assert.equal(scenarios.length,9);
 assert.equal(new Set(scenarios.map(s=>s.id)).size,scenarios.length);
 for(const scenario of scenarios){
  for(const field of ['id','name','category','time','summary','context','stakeholders'])assert.ok(typeof scenario[field]==='string' && scenario[field].trim(),field);
  assert.equal(scenario.rounds.length,3);
  for(const round of scenario.rounds){assert.equal(round.options.length,3);for(const option of round.options){assert.ok(option[3]);assert.equal(option[2].length,3);}}
  for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++){
   const scores=outcome([a,b,c],scenario);
   assert.equal(scores.length,3);
   assert.ok(scores.every(n=>Number.isFinite(n)&&n>=0&&n<=100));
  }
 }
});
test('outcomes accumulate the trade-offs for selected decisions',()=>{
 assert.deepEqual(outcome([],scenarios[0]),[50,50,50]);
 assert.deepEqual(outcome([1,0,0],scenarios[0]),[75,85,75]);
 assert.notDeepEqual(outcome([0,0,0],scenarios[0]),outcome([1,1,1],scenarios[0]));
});
