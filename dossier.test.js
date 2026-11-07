const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('dossier snapshots live text and completion, strips controls, and cleans up after print',()=>{
 let click,removed=0,printed=false;
 const replacements=[];
 const snapshot={removeAttribute(){},querySelectorAll(selector){return selector.startsWith('button')?[{remove(){removed++;}}]:[{type:'checkbox',checked:true,replaceWith(el){replacements.push(el.textContent);}},{type:'textarea',value:'<private reflection>',replaceWith(el){replacements.push(el.textContent);}}];}};
 const dossier={append(){},remove(){removed++;}};
 const document={title:'Workspace',addEventListener(type,fn){click=fn;},getElementById(){return null;},querySelector(){return {cloneNode(){return snapshot;}};},createElement(tag){return tag==='article'?dossier:{};},body:{append(){}}};
 vm.runInNewContext(fs.readFileSync('./dist/public/dossier.js','utf8'),{document,window:{print(){printed=true;assert.equal(document.title,'Couture Leadership - Executive Dossier');}}});
 click({target:{closest(){return {dataset:{print:'#results'}};}}});
 assert.equal(printed,true);assert.equal(document.title,'Workspace');assert.equal(removed,2);
 assert.deepEqual(replacements,['Complete — ','<private reflection>']);
});
