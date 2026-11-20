const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
function createSpeakingHandler({directory=process.env.SPEAKING_INQUIRY_DIR||path.join('/tmp','couture-speaking-inquiries')}={}){
 return async(req,res)=>{
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'Use POST.'});}
 if(req.headers.origin&&!['http://'+req.headers.host,'https://'+req.headers.host].includes(req.headers.origin))return send(403,{error:'Request origin is not allowed.'});
 if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'Send application/json.'});
 try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)return send(413,{error:'Inquiry is too large.'});}let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'Invalid JSON.'});}
 const fields=['organization','contactName','email','eventDate','location','audience','format','attendance','topic','budget'];
 if(!body||fields.some(k=>typeof body[k]!=='string'||!body[k].trim()||body[k].length>500)||!/^\S+@\S+\.\S+$/.test(body.email)||(!/^\d{4}-\d{2}-\d{2}$/.test(body.eventDate)||!Number.isFinite(Date.parse(body.eventDate))||new Date(body.eventDate).toISOString().slice(0,10)!==body.eventDate)||!Number.isInteger(Number(body.attendance))||Number(body.attendance)<1||Number(body.attendance)>1000000)return send(400,{error:'Provide valid contact and event details.'});
 const inquiry=Object.fromEntries([...fields,'phone'].map(k=>[k,typeof body[k]==='string'?body[k].trim().slice(0,500):'']));const id=crypto.randomUUID();await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,id+'.json'),JSON.stringify({id,receivedAt:new Date().toISOString(),...inquiry}),{flag:'wx',mode:0o600});return send(201,{id,status:'received'});
 }catch{return send(503,{error:'Inquiry could not be stored. Please try again.'});}
 };
}
module.exports={createSpeakingHandler};
