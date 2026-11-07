(function(root){
 'use strict';
 const key='couture-career-executive-v1';
 const questions=[
  'Which board priority would you address first, and what evidence supports your recommendation?',
  'Describe a strategic decision you led. What trade-off did you make, and what changed?',
  'Tell us about a time you challenged a senior stakeholder. How did you preserve trust?',
  'How would you oversee a material risk while maintaining business momentum?',
  'What would your first 90 days in this role deliver, and how would the board know?'
 ];
 const clean=v=>typeof v==='string'?v.slice(0,3000):'';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function normalize(data){return {
  name:clean(data?.name),facts:clean(data?.facts),focus:clean(data?.focus),bio:clean(data?.bio),
  rows:Array.from({length:3},(_,i)=>({priority:clean(data?.rows?.[i]?.priority),evidence:clean(data?.rows?.[i]?.evidence),next:clean(data?.rows?.[i]?.next)})),
  answers:questions.map((_,i)=>clean(data?.answers?.[i])),question:Number.isInteger(data?.question)&&data.question>=0&&data.question<questions.length?data.question:0
 };}
 function synthesize(state,profile){
  const opening=[state.name.trim(),profile.currentRole?.trim()].filter(Boolean).join(' — ');
  return [opening,state.focus.trim()?`Leadership focus: ${state.focus.trim()}`:'',state.facts.trim(),profile.strengths?.trim()?`Strengths: ${profile.strengths.trim()}`:''].filter(Boolean).join('\n\n').slice(0,3000);
 }
 function feedback(answer){
  if(!answer.trim())return 'Write an answer before reviewing it.';
  return `Review your answer against these prompts: What was the context? What did you personally decide or do? What result can you substantiate? Which board priority does it address? What trade-off or lesson would you discuss? Your draft contains ${answer.trim().split(/\s+/).length} words. This is a reflection guide, not a rating of interview performance.`;
 }
 function mount(host,getProfile,previous){
  let state=normalize(previous?.state),available=previous?.available??true,review='';
  if(!previous)try{state=normalize(JSON.parse(localStorage.getItem(key)||'{}'));}catch{available=false;}
  const field=(id,label,value,placeholder='')=>`<label for="exec-${id}">${label}</label><textarea id="exec-${id}" data-exec-field="${id}" rows="3" maxlength="3000" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  function status(){host.querySelector('[data-exec-status]').textContent=available?'Executive drafts saved in this browser.':'Browser storage is unavailable. Download your work before leaving this session.';}
  function save(){try{localStorage.setItem(key,JSON.stringify(state));available=true;}catch{available=false;}status();}
  function render(){host.innerHTML=`<div class="section-heading"><div><div class="eyebrow">EXECUTIVE EXPANSION</div><h2>Prepare for your next seat at the table.</h2></div></div><p class="panel-intro">Map board expectations, shape your story, and rehearse the conversation. These local drafting tools use only the facts you enter; nothing is sent to an AI service.</p><p data-exec-status role="status" class="save-message"></p>
   <section class="report-panel" aria-labelledby="exec-board"><div class="eyebrow">01 · BOARD ALIGNMENT</div><h3 id="exec-board">Connect priorities to evidence</h3><p>Enter up to three priorities from your target organization or role brief. An evidence entry records your claim; it does not verify readiness.</p><div class="exec-board-grid">${state.rows.map((r,i)=>`<fieldset><legend>Priority ${i+1}</legend>${field(`priority-${i}`,'Board priority',r.priority,'e.g. Sustainable growth')}${field(`evidence-${i}`,'Your supporting evidence',r.evidence,'Your contribution, outcome, and source')}${field(`next-${i}`,'Gap or next validation step',r.next,'What still needs evidence or discussion?')}</fieldset>`).join('')}</div><button type="button" class="secondary" data-exec="alignment">Review alignment</button><div data-exec-alignment aria-live="polite"></div></section>
   <section class="report-panel" aria-labelledby="exec-bio-heading"><div class="eyebrow">02 · BIO SYNTHESIS</div><h3 id="exec-bio-heading">Draft your executive bio</h3>${field('name','Name',state.name)}${field('focus','Leadership focus',state.focus,'Your expertise and the value you bring')}${field('facts','Verified career facts and achievements',state.facts,'Include only roles, outcomes, credentials, and numbers you can substantiate')}<p class="panel-intro">The draft combines these facts with your current role and strengths from the career profile. It adds no credentials or achievements. Generating again replaces the editable draft.</p><button type="button" class="primary" data-exec="bio">Synthesize bio</button>${field('bio','Editable executive bio',state.bio)}<p data-exec-bio-status role="status"></p></section>
   <section class="report-panel" aria-labelledby="exec-interview"><div class="eyebrow">03 · INTERVIEW SANDBOX</div><h3 id="exec-interview">Practice your executive narrative</h3><label for="exec-question">Interview question</label><select id="exec-question">${questions.map((q,i)=>`<option value="${i}" ${state.question===i?'selected':''}>${i+1}. ${esc(q)}</option>`).join('')}</select><p class="insight">${esc(questions[state.question])}</p>${field('answer','Your practice answer',state.answers[state.question],'Describe context, your action, evidence of impact, and the board relevance.')}<button type="button" class="secondary" data-exec="review">Review my answer</button><p data-exec-feedback role="status">${esc(review)}</p><p class="panel-intro">Each question keeps its own answer. Use the prompts to refine your story; no automated hiring score is assigned.</p></section><div class="panel-actions"><button type="button" class="primary" data-exec="download">Download executive preparation ↓</button><button type="button" class="secondary" data-print="#career-executive">Print executive preparation</button></div>`;status();}
  host.addEventListener('input',e=>{
   const id=e.target.dataset.execField;if(!id)return;
   const value=clean(e.target.value),match=/^(priority|evidence|next)-(\d)$/.exec(id);
   if(match)state.rows[Number(match[2])][match[1]]=value;
   else if(id==='answer'){state.answers[state.question]=value;review='';host.querySelector('[data-exec-feedback]').textContent='';}
   else if(['name','focus','facts','bio'].includes(id))state[id]=value;
   host.querySelector('[data-exec-alignment]').textContent='';save();
  });
  host.addEventListener('change',e=>{if(e.target.id==='exec-question'){state.question=Number(e.target.value);review='';save();render();host.querySelector('#exec-question').focus();}});
  host.addEventListener('click',e=>{
   const action=e.target.closest('button')?.dataset.exec;
   if(action==='alignment')host.querySelector('[data-exec-alignment]').innerHTML=state.rows.map((r,i)=>`<p><b>Priority ${i+1}: ${esc(r.priority||'Not specified')}</b> · ${!r.priority.trim()?'Define the board priority.':!r.evidence.trim()?'Evidence gap: add a substantiated example.':'Evidence recorded: validate its relevance with a trusted reviewer.'} ${esc(r.next?`Next step: ${r.next}`:'Add a next validation step.')}</p>`).join('');
   if(action==='bio'){
    if(!state.name.trim()||!state.facts.trim()){host.querySelector('[data-exec-bio-status]').textContent='Add your name and at least one verified career fact to create a bio.';return;}
    state.bio=synthesize(state,getProfile());save();host.querySelector('#exec-bio').value=state.bio;host.querySelector('[data-exec-bio-status]').textContent='Bio draft created. Review and edit before sharing.';
   }
   if(action==='review'){review=feedback(state.answers[state.question]);host.querySelector('[data-exec-feedback]').textContent=review;}
   if(action==='download'){
    const profile=getProfile();const text=['COUTURE LEADERSHIP™ — EXECUTIVE PREPARATION',`Target role: ${profile.targetRole||'Not specified'}`,'BOARD ALIGNMENT',...state.rows.map((r,i)=>`${i+1}. ${r.priority||'Not specified'}\nEvidence: ${r.evidence||'Not recorded'}\nNext step: ${r.next||'Not recorded'}`),'EXECUTIVE BIO',state.bio||'No draft created','INTERVIEW SANDBOX',...questions.map((q,i)=>`${q}\n${state.answers[i]||'Not answered'}`),'User-supplied claims require verification. Interview prompts are a reflection guide.'].join('\n\n');
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='couture-executive-preparation.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }
  });
  render();
  return {snapshot(){return {state:normalize(state),available};},clear(){state=normalize({});review='';save();render();}};
 }
 const api={normalize,synthesize,feedback,questions,mount};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.CareerExecutive=api;
})(typeof globalThis==='object'?globalThis:this);
