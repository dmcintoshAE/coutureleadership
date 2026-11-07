const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validate,aggregate}=require('./dist/public/analytics');
const record=(id,department,value)=>({id,department,answers:Object.fromEntries(Array.from({length:15},(_,i)=>[i,value]))});
test('cohort means use completed participants and filters preserve suppression',()=>{
 const rows=validate([...Array.from({length:5},(_,i)=>record(`a${i}`,'Operations',5)),record('b','Finance',1),{id:'c',department:'Operations',answers:{0:1}},{id:'d',department:'Finance',answers:{}}]);
 assert.deepEqual(aggregate(rows,'Operations'),{total:6,completed:5,completion:83,suppressed:false,index:100,dimensions:[100,100,100,100,100]});
 assert.equal(aggregate(rows).index,83);
 assert.equal(aggregate(rows,'Finance').index,null);
 assert.deepEqual(aggregate(rows,'Finance').dimensions,[null,null,null,null,null]);
 assert.equal(aggregate([]).completion,0);
});
test('cohort validation rejects duplicate ids and malformed responses',()=>{
 for(const data of [null,{},[record('a','Ops',6)],[record('a','Ops',3),record('a','Ops',4)],[{id:'a',department:'Ops',answers:{15:3}}],[{id:'a',department:'Ops',answers:{0:'4'}}],[{id:'a',department:'',answers:{}}],[{id:'a',department:'Ops',answers:[]}]] ) assert.throws(()=>validate(data));
 const clean=validate([{...record('a','Ops',3),email:'discard@example.com'}]);
 assert.equal(clean[0].email,undefined);
});
test('dimension scores use the corresponding three questions without rounding participants first',()=>{
 const rows=validate(Array.from({length:5},(_,i)=>{const row=record(String(i),'Ops',1);row.answers[0]=5;row.answers[1]=5;row.answers[2]=5;return row;}));
 assert.deepEqual(aggregate(rows).dimensions,[100,0,0,0,0]);
 assert.equal(aggregate(rows).index,20);
});

test('fictional demo cohort is deterministic, isolated and supports every department',()=>{
 const {demoData}=require('./dist/public/analytics');
 const rows=demoData();
 assert.equal(rows.length,24);
 assert.equal(aggregate(rows).completed,18);
 assert.deepEqual(demoData(),rows);
 for(const department of ['Operations','Finance','People']) {
  const result=aggregate(rows,department);
  assert.equal(result.total,8);
  assert.equal(result.completed,6);
  assert.equal(result.suppressed,false);
 }
 rows[0].answers[0]=5;
 assert.equal(demoData()[0].answers[0],1);
});
test('culture priorities follow selected cohort and preserve department privacy',()=>{
 const {intelligence}=require('./dist/public/analytics');
 const rows=validate([...Array.from({length:5},(_,i)=>{const row=record('ops'+i,'Operations',4);row.answers[0]=1;row.answers[1]=1;row.answers[2]=1;return row;}),record('finance','Finance',5)]);
 const report=intelligence(rows,'Operations');
 assert.deepEqual(report.priority,{index:0,score:0});
 assert.equal(report.strength.score,75);
 assert.equal(report.departments.find(group=>group.name==='Finance').index,null);
 assert.equal(intelligence(rows,'Finance').priority,null);
 assert.equal(intelligence(rows,'Finance').strength,null);
 assert.equal(intelligence([]).priority,null);
 assert.deepEqual(intelligence([]).departments,[]);
});
