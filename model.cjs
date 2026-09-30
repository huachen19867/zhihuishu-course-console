const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {loadConfig}=require('./config.cjs');
const {randomUUID}=require('node:crypto');
function findCli(config){
 const candidate=config.cliPath||process.env.CODEX_CLI_PATH;
 if(candidate){if(!fs.existsSync(candidate))throw Error('Configured Codex CLI path does not exist');return candidate;}
 for(const dir of (process.env.PATH||'').split(path.delimiter)){
  for(const name of process.platform==='win32'?['codex.exe','codex.cmd']:['codex']){
   const file=path.join(dir,name);if(fs.existsSync(file))return file;
  }
 }
 throw Error('Codex CLI not found. Set model.cliPath or install @openai/codex and log in.');
}
async function generateJson({prompt,schema,workdir,config=loadConfig().model,fetchImpl=fetch}){
 if(config.provider==='agent-file'){
  fs.mkdirSync(workdir,{recursive:true});
  const requestId=randomUUID(),requestFile=path.join(workdir,'request.json'),responseFile=path.join(workdir,'response.json');
  if(fs.existsSync(responseFile))fs.unlinkSync(responseFile);
  const temporary=requestFile+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify({requestId,prompt,schema,createdAt:new Date().toISOString()},null,2));
  fs.renameSync(temporary,requestFile);
  const started=Date.now();
  while(Date.now()-started<config.timeoutMs){
   for(const stopFile of [path.join(workdir,'..','STOP')])if(fs.existsSync(stopFile))throw Error('Agent request stopped');
   if(fs.existsSync(responseFile)){
    let data;try{data=JSON.parse(fs.readFileSync(responseFile,'utf8'))}catch{}
    if(data?.requestId===requestId&&data.result&&typeof data.result==='object')return data.result;
   }
   await new Promise(r=>setTimeout(r,200));
  }
  throw Error('Waiting for user Agent response timed out');
 }
 if(config.provider==='openai-compatible'){
  if(!config.baseUrl||!config.name)throw Error('Configure model.baseUrl and model.name');
  const key=process.env[config.apiKeyEnv];
  if(!key)throw Error('Missing model API key environment variable: '+config.apiKeyEnv);
  const response=await fetchImpl(config.baseUrl.replace(/\/$/,'')+'/chat/completions',{
   method:'POST',signal:AbortSignal.timeout(config.timeoutMs),
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
   body:JSON.stringify({model:config.name,messages:[{role:'user',content:prompt+'\nReturn only JSON matching this schema:\n'+JSON.stringify(schema)}],response_format:{type:'json_object'}})
  });
  // Error responses may contain provider secrets or request contents; do not log their bodies.
  if(!response.ok)throw Error('Model provider returned HTTP '+response.status);
  const data=await response.json(),content=data.choices?.[0]?.message?.content;
  if(typeof content!=='string')throw Error('Model provider returned no JSON content');
  return JSON.parse(content);
 }
 fs.mkdirSync(workdir,{recursive:true});
 const schemaFile=path.join(workdir,'schema.json'),resultFile=path.join(workdir,'model-result.json');
 fs.writeFileSync(schemaFile,JSON.stringify(schema));
 if(fs.existsSync(resultFile))fs.unlinkSync(resultFile);
 const exe=findCli(config);
 const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','-s','read-only'];
 if(config.name)args.push('-m',config.name);
 if(config.reasoningEffort)args.push('-c','model_reasoning_effort='+JSON.stringify(config.reasoningEffort));
 if(config.baseUrl){
  args.push('-c','model_provider="course_https"','-c','model_providers.course_https={name="Course HTTPS",base_url='+JSON.stringify(config.baseUrl)+',wire_api="responses",requires_openai_auth=true,supports_websockets=false}');
 }
 args.push('-C',workdir,'--output-schema',schemaFile,'-o',resultFile,'-');
 // npm installs a .cmd shim on Windows. Resolve its underlying JS entry instead of shell interpolation.
 let command=exe,commandArgs=args;
 if(process.platform==='win32'&&/\.cmd$/i.test(exe)){
  const entry=path.join(path.dirname(exe),'node_modules/@openai/codex/bin/codex.js');
  if(!fs.existsSync(entry))throw Error('Set model.cliPath to codex.exe; unsupported .cmd installation');
  command=process.execPath;commandArgs=[entry,...args];
 }
 await new Promise((resolve,reject)=>{
  const child=spawn(command,commandArgs,{windowsHide:true,stdio:['pipe','ignore','pipe']});
  child.stderr.on('data',()=>{});
  const timer=setTimeout(()=>{child.kill();reject(Error('Model request timed out'))},config.timeoutMs);
  child.on('error',()=>{clearTimeout(timer);reject(Error('Could not start model CLI'))});
  child.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Model CLI failed (exit '+code+'). Check login and model configuration.'))});
  child.stdin.on('error',()=>{});child.stdin.end(prompt);
 });
 return JSON.parse(fs.readFileSync(resultFile,'utf8'));
}
module.exports={generateJson,findCli};
