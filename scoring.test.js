const {test}=require('node:test');
const assert=require('node:assert/strict');
const {score,sanitize}=require('./dist/public/scoring');
test('unanswered assessments do not receive a score',()=>assert.equal(score([]),null));
test('scale endpoints and midpoint normalize correctly',()=>{assert.equal(score([1,1,1]),0);assert.equal(score([3,3,3]),50);assert.equal(score([5,5,5]),100);});
test('partial scores exclude unanswered and invalid items',()=>assert.equal(score([5,undefined,null,0,6,'4']),100));
test('responses are equally weighted and rounded',()=>assert.equal(score([1,2,5]),42));
test('saved data accepts only valid question IDs and ratings',()=>assert.deepEqual(sanitize({0:5,1:'3',2:6,14:1,15:4}),{0:5,14:1}));
