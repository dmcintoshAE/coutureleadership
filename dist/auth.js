const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const tiers = ['Free | Discover Your Leadership','Individual | My Leadership Journey','CHRO/CPO | Executive Development Partnership','Enterprise | Collective Leadership Effectiveness','Academia | Leadership Development & Career Readiness'];
function createAuth({env = process.env} = {}) {
  const dir = env.ACCOUNTS_DIR || (env.VERCEL ? '/tmp/couture-accounts' : '/data/accounts');
  // Strip URL TLS options so pg cannot override the explicit SSL policy.
  const connectionUrl = env.DATABASE_URL ? new URL(env.DATABASE_URL) : null;
  if(connectionUrl)for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])connectionUrl.searchParams.delete(key);
  const pool = env.DATABASE_URL ? new (require('pg').Pool)({
    connectionString: connectionUrl.toString(),
    ssl: env.DATABASE_URL.includes('sslmode=disable') ? false : {rejectUnauthorized:false}
  }) : null;
  const fromRow = row => row && ({id:row.id,email:row.email,firstName:row.first_name,lastName:row.last_name,tier:row.tier,role:row.role,salt:row.salt,passwordHash:row.password_hash,state:row.state});
  const insert = async a => pool.query(`INSERT INTO cl_accounts (id,email,first_name,last_name,tier,role,salt,password_hash,state) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (email) DO NOTHING RETURNING *`,[a.id,a.email,a.firstName,a.lastName,a.tier,a.role || 'member',a.salt,a.passwordHash,JSON.stringify(a.state)]);
  let startup;
  function initialize() {
    if (!startup) startup = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS cl_accounts (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, tier TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', salt TEXT NOT NULL, password_hash TEXT NOT NULL, state JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW())`);
      for (const [firstName,lastName,email] of adminAccounts) await insert(makeAdmin(firstName,lastName,email));
    })().catch(error => { startup = undefined; throw error; });
    return startup;
  }
  const adminAccounts = [['Tiffany','Founder','tiffany@coutureleadership.com'],['Admin','Owner','admin@coutureleadership.com']];
  function makeAdmin(firstName,lastName,email) {
    const salt=crypto.randomBytes(16).toString('hex');
    return {id:crypto.randomUUID(),firstName,lastName,email,tier:tiers[3],role:'admin',salt,passwordHash:crypto.scryptSync('CoutureAdmin2026!',salt,64).toString('hex'),state:{}};
  }
  // Begin schema creation and idempotent seeds at startup; requests await the same work.
  if (pool) initialize().catch(() => {});
  const ensure = () => fs.mkdirSync(dir,{recursive:true,mode:0o700});
  function secret() { if(env.SESSION_SECRET)return env.SESSION_SECRET; if(pool)return crypto.createHmac('sha256','coutureleadership-session-v1').update(env.DATABASE_URL).digest('hex'); ensure(); const file=path.join(dir,'.session-secret'); try {fs.writeFileSync(file,crypto.randomBytes(48).toString('hex'),{flag:'wx',mode:0o600});} catch(e) {if(e.code!=='EEXIST')throw e;} return env.SESSION_SECRET || fs.readFileSync(file,'utf8'); }
  const sign = value => crypto.createHmac('sha256',secret()).update(value).digest('base64url');
  const file = id => path.join(dir,id+'.json');
  const write = account => {ensure(); const tmp=file(account.id)+'.'+crypto.randomUUID()+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(account),{mode:0o600}); fs.renameSync(tmp,file(account.id));};
  function current(req) {try {const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('cl_session='))?.slice(11); if(!token)return null; const [id,expires,signature]=token.split('.'); if(!/^[a-f0-9-]{36}$/.test(id)||Number(expires)<Date.now())return null; const expected=sign(id+'.'+expires); if(!signature||signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null; if(pool)return initialize().then(()=>pool.query('SELECT * FROM cl_accounts WHERE id=$1',[id])).then(result=>fromRow(result.rows[0]) || null); return JSON.parse(fs.readFileSync(file(id),'utf8'));}catch{return null;}}
  const publicUser = a => ({id:a.id,firstName:a.firstName,lastName:a.lastName,email:a.email,tier:a.tier,role:a.role==='admin'?'admin':'member'});
  const paid = a => !!a && (a.role==='admin' || tiers.slice(1).includes(a.tier));
  function seedAdmins() {
    if(pool)return initialize();
    ensure();
    const accounts=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
    for(const [firstName,lastName,email] of adminAccounts) {
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
      if(pool)await initialize();
      if(action==='me'){const a=await current(req);return send(200,a?{user:publicUser(a),state:a.state}:{user:null});}
      if(action==='logout'){cookie(req,res,null);return send(200,{ok:true});}
      let raw='';if(req.body!==undefined){raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);}else for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>262144)return send(413,{error:'Account data is too large.'});}
      if(Buffer.byteLength(raw)>262144)return send(413,{error:'Account data is too large.'});
      let input;try{input=JSON.parse(raw||'{}');}catch{return send(400,{error:'Invalid JSON.'});}
      if(!input || typeof input!=='object'||Array.isArray(input))return send(400,{error:'Provide an account object.'});
      if(action==='signup'||action==='login') {
        const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof input.password!=='string'||input.password.length<8||input.password.length>128)return send(400,{error:'Provide a valid email and a password of 8–128 characters.'});
        let a; if(pool){a=fromRow((await pool.query('SELECT * FROM cl_accounts WHERE email=$1',[email])).rows[0]);}else{ensure();a=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))).find(a=>a.email===email);}
        if(action==='signup'){
          const tier=tiers.find(t=>t===input.tier||t.split(' | ')[0]===input.tier)||(input.tier==null?tiers[0]:null);
          if(!tier||!['firstName','lastName'].every(k=>typeof input[k]==='string'&&input[k].trim().length>0&&input[k].trim().length<=80))return send(400,{error:'Provide your first name, last name, and a valid membership tier.'});
          if(a)return send(409,{error:'An account with this email already exists.'});
          const salt=crypto.randomBytes(16).toString('hex'); a={id:crypto.randomUUID(),firstName:input.firstName.trim(),lastName:input.lastName.trim(),email,tier,salt,passwordHash:crypto.scryptSync(input.password,salt,64).toString('hex'),state:{}};if(pool){const result=await insert(a);if(!result.rowCount)return send(409,{error:'An account with this email already exists.'});}else write(a);
        }else if(!a||!crypto.timingSafeEqual(crypto.scryptSync(input.password,a.salt,64),Buffer.from(a.passwordHash,'hex')))return send(401,{error:'Email or password is incorrect.'});
        cookie(req,res,a);return send(200,{user:publicUser(a),state:a.state});
      }
      const a=await current(req);if(!a)return send(401,{error:'Sign in to save account data.'});
      if(action==='reset-data'){a.state={};if(pool)await pool.query("UPDATE cl_accounts SET state='{}'::jsonb WHERE id=$1",[a.id]);else write(a);return send(200,{ok:true,state:{}});}
      for(const key of ['discovery','diagnostic','career'])if(Object.hasOwn(input,key))a.state[key]=input[key];
      if(pool){
        const patch=Object.fromEntries(['discovery','diagnostic','career'].filter(key=>Object.hasOwn(input,key)).map(key=>[key,input[key]]));
        const result=await pool.query('UPDATE cl_accounts SET state=state || $1::jsonb WHERE id=$2 RETURNING state',[JSON.stringify(patch),a.id]);
        a.state=result.rows[0].state;
      }else write(a);return send(200,{ok:true,state:a.state});
    }catch{return send(500,{error:'Account storage is unavailable. Please try again.'});}
  }
  return {handler,current,paid,seedAdmins,close:()=>pool ? pool.end() : Promise.resolve()};
}
module.exports={createAuth,tiers};
