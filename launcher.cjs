const fs=require('node:fs');
const path=require('node:path');
const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {loadConfig}=require('./config.cjs');
const {findCurrentCoursePage,isVideoCourseUrl}=require('./course-page.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const mode=process.argv[2],config=loadConfig();
 if(!['video','homework'].includes(mode))throw Error('Expected video or homework');
 const runtime=path.join(__dirname,'runtime',mode==='homework'?'homework':'');
 fs.mkdirSync(runtime,{recursive:true});
 const pidFile=path.join(runtime,mode==='homework'?'worker.pid':'watcher.pid');
 if(fs.existsSync(pidFile)){
  const pid=Number(fs.readFileSync(pidFile,'utf8'));
  if(Number.isInteger(pid)&&pid>0){try{process.kill(pid,0);console.log('Worker already running');return}catch(e){if(e.code!=='ESRCH')throw e}}
 }
 const endpoint=config.cdpUrl.replace(/\/$/,'');
 const ready=async()=>{const r=await fetch(endpoint+'/json/version',{signal:AbortSignal.timeout(2000)});if(!r.ok)throw Error('CDP HTTP '+r.status);await r.json()};
 try{await ready()}catch(e){
  if(mode==='homework')throw Error('Open the connected Edge and unit test list first.');
  await promisify(execFile)('powershell.exe',['-NoProfile','-File',path.join(__dirname,'open-edge.ps1')],{windowsHide:true});
  let connected=false;
  for(let i=0;i<15;i++){await sleep(1000);try{await ready();connected=true;break}catch{}}
  if(!connected)throw Error('Edge connection failed');
 }
 if(mode==='homework'){
  const r=await fetch(endpoint+'/json/list',{signal:AbortSignal.timeout(3000)});
  const pages=await r.json();
  if(!pages.some(p=>p.url?.includes('onlineexamh5new.zhihuishu.com/stuExamWeb.html#/webExamList?')))throw Error('Open the unit test list first.');
 }
 let selectedUrl='';
 if(mode==='video'){
  const browser=await require('playwright').chromium.connectOverCDP(config.cdpUrl);
  try{
   const selected=await findCurrentCoursePage(browser);
   if(selected){
    selectedUrl=selected.url();
    for(const other of browser.contexts().flatMap(c=>c.pages())){
     if(other!==selected&&isVideoCourseUrl(other.url()))await other.evaluate(()=>document.querySelectorAll('video').forEach(v=>v.pause()));
    }
   }
  }finally{await browser.close()}
 }
 const stopFile=path.join(runtime,'STOP');if(fs.existsSync(stopFile))fs.unlinkSync(stopFile);
 const args=mode==='homework'?[path.join(__dirname,'homework/auto.cjs')]:[path.join(__dirname,'watch-course.cjs'),'--wait-for-course'];
 const prefix=mode==='homework'?'worker':'watcher';
 const stdout=fs.openSync(path.join(runtime,prefix+'.stdout.log'),'a'),stderr=fs.openSync(path.join(runtime,prefix+'.stderr.log'),'a');
 try{
  const child=spawn(process.execPath,args,{detached:true,windowsHide:true,env:{...process.env,COURSE_SELECTED_URL:selectedUrl},stdio:['ignore',stdout,stderr]});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject)});
  child.unref();console.log('Started '+mode+' worker');
 }finally{fs.closeSync(stdout);fs.closeSync(stderr)}
})().catch(e=>{console.error(e.message);process.exitCode=1});
