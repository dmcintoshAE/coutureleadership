(async function () {
  'use strict';
  const tiers=['Free | Discover Your Leadership','Individual | My Leadership Journey','CHRO/CPO | Executive Development Partnership','Enterprise | Collective Leadership Effectiveness','Academia | Leadership Development & Career Readiness'];
  const keys={discovery:'couture-discovery-v3',diagnostic:'couture-leadership-v3-draft',career:'couture-career-architect-v1',executive:'couture-career-executive-v1'};
  let user=null, timer, pending=Promise.resolve();
  async function request(action,body) {const res=await fetch('/api/auth/'+action,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw Error(data.error||'Account request failed.');return data;}
  const scoped=k=>k+':'+(user?.id||'guest');
  const read=k=>{try{return JSON.parse(localStorage.getItem(scoped(k))||'null');}catch{return null;}};
  function snapshot(){return {discovery:read(keys.discovery),diagnostic:read(keys.diagnostic),career:{plan:read(keys.career),executive:read(keys.executive)}};}
  function save(){if(!user)return;clearTimeout(timer);timer=setTimeout(()=>{pending=pending.catch(()=>{}).then(()=>request('state',snapshot())).catch(e=>{document.getElementById('account-status').textContent=e.message;});},250);}
  window.CoutureAccount={get user(){return user;},get paid(){return !!user&&(user.role==='admin'||tiers.slice(1).includes(user.tier));},storage:{getItem:k=>localStorage.getItem(scoped(k)),setItem:(k,v)=>{localStorage.setItem(scoped(k),v);save();},removeItem:k=>{localStorage.removeItem(scoped(k));save();}}};
  const widget=document.getElementById('workspace-account');
  async function flush(){clearTimeout(timer);await pending;if(user)await request('state',snapshot());}
  function render(){
    widget.replaceChildren();
    const status=document.createElement('span');status.id='account-status';status.setAttribute('role','status');
    if(user){
      const name=document.createElement('strong');name.textContent=user.firstName+' '+user.lastName;widget.append(name);
      const badge=document.createElement('span');badge.className='account-badge';badge.textContent=user.tier;widget.append(badge);
      if(user.role==='admin'){const admin=document.createElement('span');admin.className='account-badge';admin.textContent='Admin';widget.append(admin);}
      add('Reset Account Test Data',async()=>{if(!confirm('Reset all discovery, diagnostic, and career data for this account? Your credentials and membership will be kept.'))return;try{clearTimeout(timer);await pending;await request('reset-data',{});Object.keys(localStorage).filter(k=>k.endsWith(':'+user.id)).forEach(k=>localStorage.removeItem(k));location.href='/app';}catch(e){status.textContent=e.message;}});
      add('Sign Out',async()=>{try{await flush();await request('logout',{});location.replace('/login');}catch(e){status.textContent=e.message;}});
    }else{const link=document.createElement('a');link.href='/login';link.textContent='Guest Discovery · Sign in to save';widget.append(link);}
    widget.append(status);
    function add(text,fn){const button=document.createElement('button');button.type='button';button.textContent=text;button.onclick=fn;widget.append(button);}
  }
  try{const data=await request('me');user=data.user;if(user){const state=data.state||{};const values={discovery:state.discovery,diagnostic:state.diagnostic,career:state.career?.plan,executive:state.career?.executive};for(const [key,value] of Object.entries(values)){if(value!=null)localStorage.setItem(scoped(keys[key]),JSON.stringify(value));else localStorage.removeItem(scoped(keys[key]));}}}catch(e){render();document.getElementById('account-status').textContent=e.message;return;}
  if(!user&&new URLSearchParams(location.search).get('guest')!=='1'){location.replace('/login?next='+encodeURIComponent(location.pathname+location.search+location.hash));return;}
  render();
  for(const source of document.querySelectorAll('script[data-workspace-src]')){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=source.dataset.workspaceSrc;s.onload=resolve;s.onerror=reject;document.body.append(s);});}

})();
