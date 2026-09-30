const fs=require('node:fs');
const path=require('node:path');
function loadConfig(file=process.env.COURSE_CONFIG||path.join(__dirname,'config.local.json')){
 const user=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
 const model={provider:'codex-cli',name:'',reasoningEffort:'low',cliPath:'',baseUrl:'',apiKeyEnv:'OPENAI_API_KEY',timeoutMs:90000,...user.model};
 if(!['codex-cli','openai-compatible','agent-file'].includes(model.provider))throw Error('Unsupported model provider');
 if(!Number.isFinite(model.timeoutMs)||model.timeoutMs<1000)throw Error('Invalid model timeoutMs');
 const lowConfidenceAction=user.lowConfidenceAction||'best-effort';
 if(!['best-effort','stop'].includes(lowConfidenceAction))throw Error('Invalid lowConfidenceAction');
 return {courseUrl:'',courseName:'',cdpUrl:'http://127.0.0.1:9222',...user,model,lowConfidenceAction};
}
module.exports={loadConfig};
