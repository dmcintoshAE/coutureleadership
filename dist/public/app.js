const dimensions = [
  {name:'Strategic Clarity',icon:'◎',description:'See the bigger picture. Set a meaningful direction.',questions:['I can articulate a clear, compelling vision for the future.','I prioritize decisions that support our long-term goals.','I translate complex challenges into focused, actionable priorities.'],action:'Choose one strategic priority and define what success looks like in 90 days. Share it with your team and ask what needs to become clearer.'},
  {name:'Executive Presence',icon:'◇',description:'Lead with confidence. Inspire trust in every room.',questions:['I communicate with clarity and confidence in high-stakes situations.','I remain composed and attentive when challenged.','My actions consistently reflect the values I communicate.'],action:'Before your next high-stakes conversation, write your central message in one sentence. Practice delivering it calmly, then invite candid feedback.'},
  {name:'Emotional Intelligence',icon:'✧',description:'Understand yourself. Connect deeply with others.',questions:['I recognize how my emotions influence my decisions.','I seek to understand others before offering my perspective.','I adapt my approach to the emotional needs of the situation.'],action:'After a difficult interaction, record what you felt, what the other person may have felt, and one response you would choose next time.'},
  {name:'Influence & Impact',icon:'↗',description:'Move people forward. Create meaningful change.',questions:['I build trusting relationships across teams and perspectives.','I gain commitment by connecting work to a shared purpose.','I turn important conversations into clear ownership and action.'],action:'Map the people essential to your next initiative. Schedule one listening conversation to understand their priorities and agree on a shared next step.'},
  {name:'Resilience & Growth',icon:'♧',description:'Navigate change. Evolve with intention.',questions:['I recover constructively from setbacks and unexpected change.','I actively seek feedback and put it into practice.','I protect the habits and boundaries that sustain my leadership.'],action:'Protect a weekly 20-minute reflection: identify one lesson, one piece of feedback to act on, and one boundary that will sustain your energy.'}
];
const key = 'couture-leadership-phase1';
const {score,sanitize} = LeadershipScoring;
let answers = {}, current = 0, view = 'dashboard', storageAvailable = true;
try { answers = sanitize(JSON.parse(localStorage.getItem(key) || '{}')); } catch { storageAvailable = false; }
const $ = id => document.getElementById(id);
const count = () => Object.keys(answers).length;
const values = d => dimensions[d].questions.map((_,q) => answers[d*3+q]);
const completed = d => values(d).filter(Boolean).length;
function save() { try {localStorage.setItem(key,JSON.stringify(answers));} catch {storageAvailable=false;} }
function stats() {
  const total=count(), index=score(Object.values(answers));
  $('progress-value').innerHTML=`${total} <small>/ 15 reflections</small>`;
  $('overview-progress').style.width=`${total/15*100}%`;
  $('progress-caption').textContent=total===15?'Your diagnostic is complete':total?`${15-total} reflections to your complete picture`:'Your next chapter starts here';
  $('index-value').innerHTML=`${index??'—'} <small>/ 100</small>`;
  $('index-status').textContent=total===15?'Your completed leadership index':total?'Live score · provisional':'Available as you reflect';
  const full=dimensions.map((d,i)=>({i,score:score(values(i))})).filter(d=>completed(d.i)===3).sort((a,b)=>b.score-a.score);
  $('strongest-value').textContent=full.length?dimensions[full[0].i].name:'Yet to be discovered';
  $('strongest-status').textContent=full.length?(total===15?'Your leading dimension':'Based on completed dimensions'):'Complete a dimension to reveal';
  $('begin').innerHTML=total===15?'Explore your report <span>↗</span>':total?'Continue your diagnostic <span>↗</span>':'Begin your diagnostic <span>↗</span>';
  $('dimension-grid').innerHTML=dimensions.map((d,i)=>`<button class="dimension-card" data-dimension="${i}"><div class="dimension-top"><span class="dimension-icon">${d.icon}</span><span>0${i+1}</span></div><h3>${d.name}</h3><p>${d.description}</p><div class="dimension-bottom"><span>${completed(i)?`${completed(i)} / 3 reflected`:'Explore dimension'}</span><span>↗</span></div></button>`).join('');
}
const viewRoutes={dashboard:'/app',assessment:'/app/diagnostic',results:'/app/report',simulator:'/app/simulator',career:'/app/career',enterprise:'/app/analytics'};
function navigate(next, updateHistory=true) {
  if(!Object.hasOwn(viewRoutes,next))next='dashboard';
  if(updateHistory && location.pathname!==viewRoutes[next])history.pushState({},'',viewRoutes[next]);
  view=next;
  ['dashboard','assessment','results','simulator','career','enterprise'].forEach(id=>$(id).hidden=id!==view);
  document.querySelectorAll('.nav-item').forEach(el=>{el.classList.toggle('active',el.dataset.view===view);if(el.dataset.view===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  const titles={enterprise:['Enterprise Analytics','Leadership culture, in perspective.','Explore participation, leadership patterns, and priorities for collective growth.'],career:['Career Architect','Design your next chapter.','Turn your ambition into a focused, practical career plan.'],simulator:['AI Decision Simulator','Your next decision. A new perspective.','Practice navigating complexity before the stakes are real.'],dashboard:['Overview','Your leadership, in perspective.','Understand where you are. Discover what’s next. Lead with intention.'],assessment:['Leadership diagnostic','A moment of reflection. A clearer path.','Think about your leadership over the past three months. Choose what feels most true.'],results:['Intelligence report','Insight, tailored to your next chapter.','Connect your strengths with practical opportunities to grow.']};
  document.querySelector('.phase').textContent=view==='enterprise'?'● PHASE 02':'● PHASE 01';
  const t=titles[view];$('crumb').textContent=t[0];$('page-title').textContent=t[1];$('page-subtitle').textContent=t[2];
  if(view==='assessment')renderAssessment();if(view==='results')renderReport();
  window.scrollTo({top:0,behavior:'smooth'});
}
function renderAssessment() {
 const d=dimensions[current];
 $('assessment').innerHTML=`<div class="assessment-layout"><aside class="steps"><div class="eyebrow">YOUR FIVE DIMENSIONS</div>${dimensions.map((item,i)=>`<button class="step ${current===i?'active':''}" data-step="${i}" ${current===i?'aria-current="step"':''}>0${i+1} &nbsp; ${item.name}<small>${completed(i)} of 3 reflections ${completed(i)===3?'✓':''}</small></button>`).join('')}</aside><div class="question-panel"><div class="eyebrow">DIMENSION 0${current+1} / 05 &nbsp; · &nbsp; ${count()} OF 15 ANSWERED</div><h2>${d.name}</h2><p class="panel-intro">${d.description} Select a response for each statement.<br>1 = Rarely · 2 = Sometimes · 3 = Often · 4 = Usually · 5 = Consistently</p>${d.questions.map((question,q)=>`<div class="question"><h3>${current*3+q+1}. ${question}</h3><div class="ratings" role="group" aria-label="${question}">${['Rarely','Sometimes','Often','Usually','Consistently'].map((label,r)=>`<button class="rating" data-question="${current*3+q}" data-rating="${r+1}" aria-pressed="${answers[current*3+q]===r+1}" aria-label="${r+1}: ${label}">${r+1}<small>${label}</small></button>`).join('')}</div></div>`).join('')}<div class="panel-actions"><button class="secondary" id="previous">${current?'← Previous dimension':'← Overview'}</button><span id="live-dimension" class="subtle-tag">Live score: ${score(values(current))??'—'} / 100</span><button class="primary" id="next">${current===4?'View intelligence report':'Next dimension'} <span>→</span></button></div><div class="save-message" role="status">${storageAvailable?'Your progress is saved automatically in this browser.':'Browser storage is unavailable. Progress will last for this session only.'}</div></div></div>`;
}
function renderReport() {
 const total=count();
 if(!total){$('results').innerHTML='<div class="report-panel empty-report"><div class="eyebrow">YOUR PERSONAL INTELLIGENCE REPORT</div><h2>Your next chapter is waiting.</h2><p>Begin your diagnostic to discover your leadership profile and tailored next steps.</p><button class="primary" id="report-start">Begin your diagnostic ↗</button></div>';return;}
 const ranked=dimensions.map((d,i)=>({i,value:score(values(i))})).filter(d=>completed(d.i)===3).sort((a,b)=>b.value-a.value);
 const strongest=ranked[0], growth=ranked[ranked.length-1];
 $('results').innerHTML=`<div class="report-panel"><div class="eyebrow">YOUR PERSONAL INTELLIGENCE REPORT · ${total===15?'COMPLETE':'IN PROGRESS'}</div><h2>Your leadership at a glance.</h2><div class="score-summary"><div class="large-score">${score(Object.values(answers))}<small> / 100</small></div><div><b>${total===15?'Your leadership index':'Your provisional leadership index'}</b><p>${total} of 15 reflections completed. ${total===15?'Use this snapshot as a starting point for intentional growth.':'Answer every reflection for a complete, balanced profile.'}</p></div></div>${dimensions.map((d,i)=>`<div class="score-row"><div>${d.name}<small>${completed(i)} of 3 answered${completed(i)<3?' · provisional':''}</small></div><div class="progress-track"><div style="width:${score(values(i))??0}%"></div></div><b>${score(values(i))??'—'}<small>/ 100</small></b></div>`).join('')}<div class="insight-grid"><div class="insight"><div class="eyebrow">A STRENGTH TO BUILD ON</div><h3>${strongest?dimensions[strongest.i].name:'Keep exploring'}</h3><p>${strongest?`This is a leading score among your completed dimensions. Notice when you use this strength well and find one opportunity to apply it more intentionally.`:'Complete all three reflections in a dimension to reveal your emerging strengths.'}</p></div><div class="insight"><div class="eyebrow">YOUR NEXT INTENTIONAL STEP</div><h3>${growth?dimensions[growth.i].name:'Make space for reflection'}</h3><p>${growth?dimensions[growth.i].action:'Set aside a few uninterrupted minutes and answer each reflection honestly. Your personal next step will appear here.'}</p></div></div><p class="panel-intro">${total===15?'All dimensions are equally weighted.':'Partial scores reflect answered items only and may change.'} This reflection tool is not a validated psychometric assessment.</p><div class="panel-actions"><button class="secondary" id="review">${total===15?'Review your responses':'Continue your diagnostic'} ↗</button><button class="secondary" data-print="#results">Print / Save as PDF</button><button class="primary" id="download">Download report <span>↓</span></button><button class="reset" id="reset">Reset assessment</button></div><div id="reset-confirm" hidden><p class="panel-intro">Remove all 15 responses saved in this browser? This cannot be undone.</p><div class="reset-actions"><button class="secondary" id="cancel-reset">Keep responses</button><button class="primary" id="confirm-reset">Remove responses</button></div></div></div>`;
}
function resume() {const first=dimensions.findIndex((_,i)=>completed(i)<3);current=first<0?0:first;navigate('assessment');}
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.view)navigate(button.dataset.view);
 if(button.dataset.dimension!==undefined){current=Number(button.dataset.dimension);navigate('assessment');}
 if(button.dataset.step!==undefined){current=Number(button.dataset.step);renderAssessment();}
 if(button.dataset.rating){const question=Number(button.dataset.question);answers[question]=Number(button.dataset.rating);save();stats();button.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===button));$('live-dimension').textContent=`Live score: ${score(values(current))} / 100`;document.querySelector('.save-message').textContent=storageAvailable?'Response saved · Your live score has been updated.':'Response recorded for this session. Browser storage is unavailable.';document.querySelectorAll('.step small').forEach((el,i)=>el.textContent=`${completed(i)} of 3 reflections ${completed(i)===3?'✓':''}`);}
 if(button.id==='begin'){if(count()===15)navigate('results');else resume();}
 if(['report-start','review'].includes(button.id))resume();
 if(button.id==='next'){if(current===4)navigate('results');else{current++;renderAssessment();window.scrollTo({top:0,behavior:'smooth'});}}
 if(button.id==='previous'){if(!current)navigate('dashboard');else{current--;renderAssessment();}}
 if(button.classList.contains('help')||button.id==='methodology')$('info-dialog').showModal();
 if(button.classList.contains('close')||button.classList.contains('close-info'))$('info-dialog').close();
 if(button.id==='reset'){$('reset-confirm').hidden=false;$('cancel-reset').focus();}
 if(button.id==='cancel-reset')$('reset-confirm').hidden=true;
 if(button.id==='confirm-reset'){answers={};save();current=0;stats();renderReport();}
 if(button.id==='download'){
 const lines=['COUTURE LEADERSHIP™ — EXECUTIVE INTELLIGENCE REPORT',new Date().toLocaleDateString(),'',`Status: ${count()===15?'Complete':'Provisional'} · ${count()}/15 reflections`,`Leadership index: ${score(Object.values(answers))}/100`,''];
 dimensions.forEach((d,i)=>{lines.push(`${d.name}: ${score(values(i))??'Unanswered'} / 100 (${completed(i)}/3 answered)`);d.questions.forEach((q,j)=>lines.push(`  ${q} ${answers[i*3+j]??'Unanswered'}/5`));lines.push(`Suggested practice: ${d.action}`,'');});
 lines.push('Method: (average answered response − 1) / 4 × 100. All items equally weighted. Partial scores are provisional.','A personal reflection tool, not a validated psychometric assessment.');
 const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='couture-leadership-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
});
$('year').textContent=new Date().getFullYear();stats();


function restoreRoute(){navigate(Object.keys(viewRoutes).find(key=>viewRoutes[key]===location.pathname.replace(/\/$/,''))||'dashboard',false);}
window.addEventListener('popstate',restoreRoute);
window.addEventListener('DOMContentLoaded',restoreRoute);
