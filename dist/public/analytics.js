(function(root) {
 const minimum = 5;
 function validate(data) {
  if (!Array.isArray(data) || data.length > 10000) throw Error('Provide a JSON array of up to 10,000 participant records.');
  const ids = new Set();
  return data.map((row, index) => {
   if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id.trim() || row.id.length > 100 || ids.has(row.id)) throw Error(`Record ${index + 1}: a unique anonymous id is required.`);
   ids.add(row.id);
   if (typeof row.department !== 'string' || !row.department.trim() || row.department.length > 100) throw Error(`Record ${index + 1}: department is required (100 characters maximum).`);
   if (!row.answers || typeof row.answers !== 'object' || Array.isArray(row.answers)) throw Error(`Record ${index + 1}: answers must be an object with question keys 0–14.`);
   for (const [key, value] of Object.entries(row.answers)) if (!/^(?:[0-9]|1[0-4])$/.test(key) || !Number.isInteger(value) || value < 1 || value > 5) throw Error(`Record ${index + 1}: responses must be integers from 1 to 5 with keys 0–14.`);
   return {id:row.id, department:row.department.trim(), answers:{...row.answers}};
  });
 }
 function aggregate(rows, department = '') {
  const selected = rows.filter(row => !department || row.department === department);
  const complete = selected.filter(row => Object.keys(row.answers).length === 15);
  const allowed = complete.length >= minimum;
  const average = values => Math.round(values.reduce((a,b)=>a+b,0)/values.length);
  const score = values => (values.reduce((a,b)=>a+b,0)/values.length-1)*25;
  return {total:selected.length, completed:complete.length, completion:selected.length?Math.round(complete.length/selected.length*100):0, suppressed:!allowed,
   index:allowed?average(complete.map(row=>score(Object.values(row.answers)))):null,
   dimensions:Array.from({length:5},(_,i)=>allowed?average(complete.map(row=>score([0,1,2].map(q=>row.answers[i*3+q])))):null)};
 }
 function demoData() {
  return validate(Array.from({length:24}, (_,i) => ({
   id:'demo-'+String(i+1).padStart(3,'0'),
   department:['Operations','Finance','People'][Math.floor(i/8)],
   answers:Object.fromEntries(Array.from({length:i%8===7?0:i%8===6?9:15},(_,q)=>[q,1+((i*3+q*2+Math.floor(q/3))%5)]))
  })));
 }
 function intelligence(rows, department = '') {
  const snapshot = aggregate(rows, department);
  const ranked = snapshot.dimensions.map((score, index) => ({index, score})).filter(item => item.score !== null).sort((a,b) => a.score-b.score || a.index-b.index);
  return {snapshot, priority:ranked[0] ?? null, strength:ranked.length ? ranked[ranked.length-1] : null,
   departments:[...new Set(rows.map(row=>row.department))].sort().map(name=>({name,...aggregate(rows,name)}))};
 }
 const api = {validate, aggregate, minimum, demoData, intelligence};
 if (typeof module !== 'undefined') {module.exports=api;return;}
 root.EnterpriseAnalytics=api;
 const host=document.getElementById('enterprise');
 let rows=[], department='', demo=false;
 const names=['Strategic Clarity','Executive Presence','Emotional Intelligence','Influence & Impact','Resilience & Growth'];
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(){
  const {snapshot:result, priority, strength, departments}=intelligence(rows,department);
  const prompts=[
   'Align leaders on the next quarter’s priorities, decision ownership, and measures of progress.',
   'Practice communicating a clear point of view and inviting constructive challenge.',
   'Use listening sessions to explore how leaders recognize emotions and respond to feedback.',
   'Map cross-functional stakeholders and agree on one shared outcome to pursue together.',
   'Discuss sustainable workloads, recovery, and one learning experiment for the next month.'
  ];
  const culture = result.suppressed
   ? '<p class="panel-intro">Culture discussion prompts become available after five complete diagnostics in the selected cohort. Invite participation before drawing conclusions.</p>'
   : `<div class="enterprise-insights"><article class="enterprise-insight"><div class="eyebrow">BUILD ON A STRENGTH</div><h3>${names[strength.index]}</h3><p>${strength.score}/100 · Highest mean dimension in this cohort. Ask leaders which routines help this behavior show up consistently.</p></article><article class="enterprise-insight"><div class="eyebrow">EXPLORE A DEVELOPMENT PRIORITY</div><h3>${names[priority.index]}</h3><p>${priority.score}/100 · Lowest mean dimension in this cohort. Treat this as a conversation starter, with no external benchmark implied.</p><p>${prompts[priority.index]}</p></article></div>`;
  const comparison = departments.length ? `<div class="enterprise-table-wrap" role="region" aria-label="Department comparison" tabindex="0"><table class="enterprise-table"><caption>Department participation and leadership index · all imported departments</caption><thead><tr><th scope="col">Department</th><th scope="col">Participants</th><th scope="col">Completed</th><th scope="col">Completion</th><th scope="col">Mean index</th></tr></thead><tbody>${departments.map(group=>`<tr><th scope="row">${esc(group.name)}</th><td>${group.total}</td><td>${group.completed}</td><td>${group.completion}%</td><td>${group.suppressed?'Hidden · fewer than 5 complete':group.index+' / 100'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="panel-intro">Load the demo or import a cohort to compare department participation.</p>';
  host.innerHTML=`<div class="report-panel enterprise-controls"><div class="eyebrow">CHRO WORKSPACE · ENTERPRISE &amp; CULTURE INTELLIGENCE</div><h2>A clearer view of your leadership culture.</h2><p class="panel-intro">Import anonymous cohort responses to explore completion and development priorities. Data is held in memory for this session and clears on reload. No enterprise service is connected.</p><button class="secondary" id="load-demo" ${rows.length?'disabled':''}>Load demo cohort</button><p class="panel-intro">Explore 24 fictional participants across three departments. Clear the current cohort before loading the demo.</p><label for="cohort-file">Import cohort JSON (maximum 5 MB)</label><input id="cohort-file" type="file" accept=".json,application/json"><details><summary>Data format and privacy</summary><p>One record per participant, with a unique anonymous id, department, and answers keyed 0–14 (integers 1–5). Use an empty answers object for participants who have not started. Do not include names or email addresses.</p><pre>[{"id":"p001","department":"Operations","answers":{"0":4,"1":3}}]</pre><p>Scores include complete diagnostics only. At least five completed participants must be present in the selected group to display scores. Completion counts are always shown. These self-reported scores support development conversations; they are not validated measures of performance.</p></details><p id="enterprise-status" role="status">${rows.length?`${rows.length} participant records loaded.${demo?' Fictional demo data.':''}`:'No cohort loaded. Import your data to begin.'}</p><label for="department-filter">Department</label><select id="department-filter"><option value="">All departments</option>${[...new Set(rows.map(row=>row.department))].sort().map(name=>`<option value="${esc(name)}" ${name===department?'selected':''}>${esc(name)}</option>`).join('')}</select><button class="secondary" id="clear-cohort" ${rows.length?'':'disabled'}>Clear cohort</button></div><div id="enterprise-report" class="report-panel"><div class="eyebrow">COHORT SNAPSHOT · ${esc(department||'ALL DEPARTMENTS')}</div><h2>From reflection to collective growth.</h2><div class="stat-grid"><div class="stat"><div class="stat-label">PARTICIPANTS</div><div class="stat-value">${result.total}</div></div><div class="stat"><div class="stat-label">COMPLETED DIAGNOSTICS</div><div class="stat-value">${result.completed}</div><p>${result.completion}% completion</p></div><div class="stat"><div class="stat-label">MEAN LEADERSHIP INDEX</div><div class="stat-value">${result.index??'—'}<small> / 100</small></div><p>Complete diagnostics only</p></div></div><p class="panel-intro">${result.suppressed?'Scores are hidden until at least five participants have completed the diagnostic in this group.':'Each participant contributes equally to the mean. Scores range from 0 to 100; higher scores reflect more frequent self-reported behaviors.'}</p><h3>Leadership dimension profile</h3>${names.map((name,i)=>`<div class="score-row"><div>${name}</div><div class="progress-track"><div style="width:${result.dimensions[i]??0}%"></div></div><b>${result.dimensions[i]??'—'}<small>/ 100</small></b></div>`).join('')}<section class="culture-intelligence" aria-labelledby="culture-heading"><div class="eyebrow">CULTURE INTELLIGENCE</div><h3 id="culture-heading">Turn collective insight into a conversation.</h3><p class="panel-intro">Signals from the five leadership dimensions reflect participant perceptions. They do not directly measure organizational culture, psychological safety, retention, or performance. Equal scores have no meaningful rank; validate priorities with listening and context.</p>${culture}</section><section class="department-intelligence" aria-labelledby="department-heading"><h3 id="department-heading">Participation across the enterprise</h3><p class="panel-intro">Scores are hidden independently for every department with fewer than five complete diagnostics. Compare participation first; differences in averages alone do not establish meaningful differences between teams.</p>${comparison}</section><p class="panel-intro">Source: ${demo?'FICTIONAL DEMO DATA':'session import'} · ${result.completed} complete of ${result.total} participants · Generated ${new Date().toLocaleDateString()}. A personal reflection framework, not a validated psychometric assessment.</p><div class="panel-actions"><button class="primary" data-print="#enterprise-report">Print / Save as PDF</button></div></div>`;
 }
 host.addEventListener('change',async event=>{
  if(event.target.id==='department-filter'){department=event.target.value;render();host.querySelector('#department-filter').focus();}
  if(event.target.id==='cohort-file'){
   const file=event.target.files[0];if(!file)return;
   try{if(file.size>5*1024*1024)throw Error('File exceeds the 5 MB limit.');const imported=validate(JSON.parse(await file.text()));rows=imported;department='';demo=false;render();}
   catch(error){host.querySelector('#enterprise-status').textContent=`Import failed. ${error instanceof SyntaxError?'Invalid JSON.':error.message} Existing data has been kept.`;}
  }
 });
 host.addEventListener('click',event=>{if(event.target.id==='load-demo'&&!rows.length){rows=demoData();department='';demo=true;render();host.querySelector('#department-filter').focus();}if(event.target.id==='clear-cohort'){rows=[];department='';demo=false;render();host.querySelector('#load-demo').focus();}});
 render();
})(typeof window!=='undefined'?window:globalThis);
