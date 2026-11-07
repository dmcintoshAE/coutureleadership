(() => {
 const host=document.getElementById('career'), key='couture-career-architect-v1';
 const fields=['currentRole','targetRole','horizon','strengths','growth','motivation'];
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let profile={}, done=[], planned=false, available=true, executive;
 try {
  const saved=JSON.parse(localStorage.getItem(key)||'{}');
  fields.forEach(f=>profile[f]=typeof saved?.profile?.[f]==='string'?saved.profile[f].slice(0,1000):'');
  done=Array.from({length:6},(_,i)=>saved?.done?.[i]===true);planned=saved?.planned===true&&!!profile.targetRole?.trim();
 } catch {available=false;}
 function save(){try{localStorage.setItem(key,JSON.stringify({profile,done,planned}));}catch{available=false;}status();}
 function status(){const el=host.querySelector('#career-save');if(el)el.textContent=available?'Saved in this browser · Your plan stays private.':'Browser storage is unavailable. Keep a downloaded copy; changes last for this session only.';}
 function actions(){return [
  ['Days 1–15','Define the destination',`Review three role descriptions for ${profile.targetRole}. Identify the responsibilities, scope, and evidence of impact they require.`],
  ['Days 16–30','Gather perspective',`Arrange two conversations with people familiar with ${profile.targetRole}. Test your assumptions and ask what readiness looks like.`],
  ['Days 31–45','Put a strength to work',`Choose a stretch assignment that demonstrates ${profile.strengths||'one of your leadership strengths'}. Agree on an observable outcome with a stakeholder.`],
  ['Days 46–60','Close a development gap',`Practice ${profile.growth||'one capability required for your target role'} through a project, mentor conversation, or focused learning activity. Request specific feedback.`],
  ['Days 61–75','Make your impact visible','Document one achievement with the challenge, your contribution, and the result. Share it with a trusted sponsor or mentor and ask for feedback.'],
  ['Days 76–90','Review and choose your next move',`Review your evidence against the requirements for ${profile.targetRole}. Decide whether to pursue an opportunity, expand your current scope, or run another development cycle.`]
 ];}
 function render(){
  host.innerHTML=`<div class="career-layout"><form id="career-form" class="report-panel"><div class="eyebrow">YOUR CAREER BLUEPRINT</div><h2>Start with intention.</h2><p class="panel-intro">Define the move you want to make. Your answers shape a practical first 90 days.</p>${[
   ['currentRole','Current role','e.g. Senior manager'],['targetRole','Target role or next chapter','e.g. Director of operations'],['strengths','Strengths to build on','e.g. Strategic clarity and cross-team influence'],['growth','Capability to develop','e.g. Leading through other managers'],['motivation','What matters in your next chapter?','e.g. Broader impact, autonomy, and sustainable pace']
  ].map(([id,label,placeholder])=>`<label for="career-${id}">${label}${id==='targetRole'?' <span aria-hidden="true">*</span>':''}</label><input id="career-${id}" name="${id}" maxlength="1000" ${id==='targetRole'?'required':''} value="${esc(profile[id])}" placeholder="${placeholder}">`).join('')}<label for="career-horizon">Target timeframe</label><select id="career-horizon" name="horizon">${['6 months','12 months','18 months','24 months'].map(v=>`<option ${profile.horizon===v?'selected':''}>${v}</option>`).join('')}</select><p class="panel-intro">Use your intelligence report to identify a strength or development priority. You can also begin without a diagnostic.</p><button class="primary" type="submit">${planned?'Update blueprint':'Build my blueprint'} ↗</button><p id="career-save" class="save-message" role="status"></p></form><div id="career-output" aria-live="polite">${planned?plan():`<div class="report-panel empty-report"><div class="eyebrow">AMBITION → ACTION</div><h2>A career with intention.</h2><p>Enter your target role to create a six-step roadmap. Track your actions, gather evidence, and revisit your direction as you grow.</p><span class="subtle-tag">Your first 90 days · At your own pace</span></div>`}</div></div>`;
  if(typeof CareerExecutive!=='undefined'){const section=document.createElement('div');section.id='career-executive';host.append(section);executive=CareerExecutive.mount(section,()=>profile,executive?.snapshot());}
  status();
 }
 function plan(){const completed=done.filter(Boolean).length;return `<div class="report-panel"><div class="eyebrow">YOUR PERSONAL CAREER BLUEPRINT</div><h2>${esc(profile.targetRole)}</h2><p class="panel-intro">${esc(profile.currentRole||'Your next chapter')} → ${esc(profile.targetRole)} · Target: ${esc(profile.horizon||'6 months')}</p>${profile.motivation?`<div class="insight"><b>Your north star</b><p>${esc(profile.motivation)}</p></div>`:''}<div class="section-heading career-progress"><h3>Your first 90 days</h3><span class="subtle-tag">${completed} of 6 actions complete</span></div><progress value="${completed}" max="6" aria-label="Career action completion"></progress><div class="career-actions">${actions().map(([when,title,description],i)=>`<label class="career-action"><input type="checkbox" data-career-action="${i}" ${done[i]?'checked':''}><span><span class="eyebrow">${when}</span><strong>${title}</strong><span>${esc(description)}</span></span></label>`).join('')}</div><p class="panel-intro">A planning framework based on your inputs. Review timing and opportunities with a mentor; this plan does not predict career outcomes. Updating your blueprint resets action completion.</p><div class="panel-actions"><button class="secondary" data-print="#career-output">Print / Save as PDF</button><button class="primary" data-career="download">Download blueprint ↓</button><button class="reset" data-career="reset">Clear career plan</button></div><div id="career-confirm" hidden><p>Remove your career profile, action progress, and executive preparation drafts from this browser?</p><button class="secondary" data-career="cancel">Keep plan</button> <button class="primary" data-career="confirm">Remove plan</button></div></div>`;}
 host.addEventListener('input',e=>{if(fields.includes(e.target.name)){profile[e.target.name]=e.target.value;save();}});
 host.addEventListener('change',e=>{
  if(e.target.name==='horizon'){profile.horizon=e.target.value;save();}
  if(e.target.dataset.careerAction!==undefined){done[Number(e.target.dataset.careerAction)]=e.target.checked;save();host.querySelector('#career-output').innerHTML=plan();}
 });
 host.addEventListener('submit',e=>{if(e.target.id!=='career-form')return;e.preventDefault();const form=host.querySelector('#career-form');if(!form.reportValidity())return;fields.forEach(f=>profile[f]=form.elements[f].value.trim());if(!profile.targetRole){form.elements.targetRole.value='';form.reportValidity();return;}done=Array(6).fill(false);planned=true;save();render();host.querySelector('#career-output h2').setAttribute('tabindex','-1');host.querySelector('#career-output h2').focus();});
 host.addEventListener('click',e=>{
  const action=e.target.closest('button')?.dataset.career;if(!action)return;
  if(action==='reset'){host.querySelector('#career-confirm').hidden=false;host.querySelector('[data-career="cancel"]').focus();}
  if(action==='cancel')host.querySelector('#career-confirm').hidden=true;
  if(action==='confirm'){executive?.clear();profile={};done=[];planned=false;save();render();}
  if(action==='download'){
   const lines=['COUTURE LEADERSHIP™ — CAREER BLUEPRINT','',...fields.map(f=>`${({currentRole:'Current role',targetRole:'Target role',horizon:'Timeframe',strengths:'Strengths',growth:'Development priority',motivation:'North star'})[f]}: ${profile[f]||'Not specified'}`),'',...actions().map(([when,title,description],i)=>`${done[i]?'[x]':'[ ]'} ${when}: ${title}\n${description}`),'','A planning framework based on your inputs, not a prediction of career outcomes.'];
   const url=URL.createObjectURL(new Blob([lines.join('\n\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='couture-career-blueprint.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
 });
 render();
})();
