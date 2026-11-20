const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const tiers = ['Free | Discover Your Leadership','Individual | My Leadership Journey','CHRO/CPO | Executive Development Partnership','Enterprise | Collective Leadership Effectiveness','Academia | Leadership Development & Career Readiness'];
function createAuth({env = process.env} = {}) {
  const dir = env.ACCOUNTS_DIR || (env.VERCEL ? '/tmp/couture-accounts' : '/data/accounts');
  const ensure = () => fs.mkdirSync(dir,{recursive:true,mode:0o700});
  function secret() { ensure(); const file=path.join(dir,'.session-secret'); try {fs.writeFileSync(file,crypto.randomBytes(48).toString('hex'),{flag:'wx',mode:0o600});} catch(e) {if(e.code!=='EEXIST')throw e;} return env.SESSION_SECRET || fs.readFileSync(file,'utf8'); }
  const sign = value => crypto.createHmac('sha256',secret()).update(value).digest('base64url');
  const file = id => path.join(dir,id+'.json');
  const write = account => {ensure(); const tmp=file(account.id)+'.'+crypto.randomUUID()+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(account),{mode:0o600}); fs.renameSync(tmp,file(account.id));};
  function current(req) {try {const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('cl_session='))?.slice(11); if(!token)return null; const [id,expires,signature]=token.split('.'); if(!/^[a-f0-9-]{36}$/.test(id)||Number(expires)<Date.now())return null; const expected=sign(id+'.'+expires); if(!signature||signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null; return JSON.parse(fs.readFileSync(file(id),'utf8'));}catch{return null;}}
  const publicUser = a => ({id:a.id,firstName:a.firstName,lastName:a.lastName,email:a.email,tier:a.tier,role:a.role==='admin'?'admin':'member'});
  const paid = a => !!a && (a.role==='admin' || tiers.slice(1).includes(a.tier));
  function seedAdmins() {
    ensure();
    const accounts=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
    for(const [firstName,lastName,email] of [['Tiffany','Founder','tiffany@coutureleadership.com'],['Admin','Owner','admin@coutureleadership.com']]) {
      if(accounts.some(a=>a.email?.trim().toLowerCase()===email))continue;
      const salt=crypto.randomBytes(16).toString('hex');
      write({id:crypto.randomUUID(),firstName,lastName,email,tier:tiers[3],role:'admin',salt,passwordHash:crypto.scryptSync('CoutureAdmin2026!',salt,64).toString('hex'),state:{}});
    }
  }
  function cookie(req,res,a) {const value=a ? a.id+'.'+(Date.now()+604800000) : ''; res.setHeader('Set-Cookie',`cl_session=${a?value+'.'+sign(value):''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${a?604800:0}${req.socket?.encrypted || env.VERCEL || env.NODE_ENV==='production'?'; Secure':''}`);}
  async function handler(req,res) {
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    const url=new URL(req.url,'http://localhost');
    const action=url.searchParams.get('action') || url.pathname.split('/').pop();
    if(!['signup','login','logout','me','state','reset-data'].includes(action))return send(404,{error:'Unknown account action.'});
    if(req.method!==(action==='me'?'GET':'POST'))return send(405,{error:'Method not allowed.'});
    if(req.headers.origin && ![`http://${req.headers.host}`,`https://${req.headers.host}`].includes(req.headers.origin))return send(403,{error:'Request origin is not allowed.'});
    try {
      if(action==='me'){const a=current(req);return send(200,a?{user:publicUser(a),state:a.state}:{user:null});}
      if(action==='logout'){cookie(req,res,null);return send(200,{ok:true});}
      let raw='';if(req.body!==undefined){raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);}else for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>262144)return send(413,{error:'Account data is too large.'});}
      if(Buffer.byteLength(raw)>262144)return send(413,{error:'Account data is too large.'});
      let input;try{input=JSON.parse(raw||'{}');}catch{return send(400,{error:'Invalid JSON.'});}
      if(!input || typeof input!=='object'||Array.isArray(input))return send(400,{error:'Provide an account object.'});
      if(action==='signup'||action==='login') {
        const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof input.password!=='string'||input.password.length<8||input.password.length>128)return send(400,{error:'Provide a valid email and a password of 8–128 characters.'});
        ensure();let a=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))).find(a=>a.email===email);
        if(action==='signup'){
          const tier=tiers.find(t=>t===input.tier||t.split(' | ')[0]===input.tier)||(input.tier==null?tiers[0]:null);
          if(!tier||!['firstName','lastName'].every(k=>typeof input[k]==='string'&&input[k].trim().length>0&&input[k].trim().length<=80))return send(400,{error:'Provide your first name, last name, and a valid membership tier.'});
          if(a)return send(409,{error:'An account with this email already exists.'});
          const salt=crypto.randomBytes(16).toString('hex'); a={id:crypto.randomUUID(),firstName:input.firstName.trim(),lastName:input.lastName.trim(),email,tier,salt,passwordHash:crypto.scryptSync(input.password,salt,64).toString('hex'),state:{}};write(a);
        }else if(!a||!crypto.timingSafeEqual(crypto.scryptSync(input.password,a.salt,64),Buffer.from(a.passwordHash,'hex')))return send(401,{error:'Email or password is incorrect.'});
        cookie(req,res,a);return send(200,{user:publicUser(a),state:a.state});
      }
      const a=current(req);if(!a)return send(401,{error:'Sign in to save account data.'});
      if(action==='reset-data'){a.state={};write(a);return send(200,{ok:true,state:{}});}
      for(const key of ['discovery','diagnostic','career'])if(Object.hasOwn(input,key))a.state[key]=input[key];
      write(a);return send(200,{ok:true,state:a.state});
    }catch{return send(500,{error:'Account storage is unavailable. Please try again.'});}
  }
  return {handler,current,paid,seedAdmins};
}
module.exports={createAuth,tiers};
