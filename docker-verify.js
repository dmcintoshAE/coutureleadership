const {spawnSync}=require('node:child_process');
const name=`coutureleadership-verify-${process.pid}`;
function docker(args) {
 const result=spawnSync('docker',args,{encoding:'utf8'});
 if(result.error||result.status!==0) throw Error(result.error?.message||result.stderr||result.stdout||'Docker command failed');
 return result.stdout.trim();
}
async function main() {
 docker(['compose','config','--quiet']);
 docker(['build','-t','coutureleadership:verify','.']);
 let started=false;
 try {
  docker(['run','--detach','--rm','--name',name,'-p','127.0.0.1::3002','coutureleadership:verify']);
  started=true;
  const address=docker(['port',name,'3002/tcp']);
  const base=`http://${address}`;
  let ready=false;
  for(let i=0;i<30;i++) {
   try {const response=await fetch(base,{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break;}} catch {}
   await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!ready) throw Error('Container did not become ready within 30 attempts.');
  for(const [route,marker] of [['/','COUTURE'],['/analytics.js','demoData'],['/style.css','sim-coach-response'],['/dossier.js','window.print']]) {
   const response=await fetch(base+route,{signal:AbortSignal.timeout(3000)});
   if(!response.ok||!(await response.text()).includes(marker)) throw Error(`Smoke check failed: ${route}`);
  }
  const coach=await fetch(base+'/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenarioId:'growth',choices:[1,0,2],reflection:''}),signal:AbortSignal.timeout(3000)});
  if(coach.status!==503) throw Error(`Expected unconfigured coaching status 503; received ${coach.status}.`);
  console.log('Docker build and runtime smoke checks passed.');
 } finally {if(started) docker(['stop',name]);}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});