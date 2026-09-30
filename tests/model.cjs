const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {generateJson}=require('../model.cjs');
(async()=>{
 const config={provider:'openai-compatible',name:'test-model',baseUrl:'https://example.invalid/v1/',apiKeyEnv:'COURSE_TEST_KEY',timeoutMs:1000};
 const previous=process.env.COURSE_TEST_KEY;
 process.env.COURSE_TEST_KEY='test-only-placeholder';
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'course-model-test-'));
 try{
  const result=await generateJson({prompt:'test',schema:{type:'object'},config,fetchImpl:async(url,opts)=>{
   assert.equal(url,'https://example.invalid/v1/chat/completions');
   assert.equal(opts.headers.Authorization,'Bearer test-only-placeholder');
   assert.equal(JSON.parse(opts.body).model,'test-model');
   return {ok:true,json:async()=>({choices:[{message:{content:'{"answer":"A"}'}}]})};
  }});
  assert.deepEqual(result,{answer:'A'});
  await assert.rejects(generateJson({prompt:'test',schema:{},config,fetchImpl:async()=>({ok:false,status:401})}),/HTTP 401/);
  await assert.rejects(generateJson({prompt:'test',schema:{},config,fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:'bad json'}}]})})}),SyntaxError);
  delete process.env.COURSE_TEST_KEY;
  await assert.rejects(generateJson({prompt:'test',schema:{},config}),/Missing model API key/);
  const pending=generateJson({prompt:'题目',schema:{type:'object'},workdir:dir,config:{provider:'agent-file',timeoutMs:2000}});
  const request=JSON.parse(fs.readFileSync(path.join(dir,'request.json'),'utf8'));
  fs.writeFileSync(path.join(dir,'response.json'),JSON.stringify({requestId:'stale',result:{answer:'B'}}));
  setTimeout(()=>fs.writeFileSync(path.join(dir,'response.json'),JSON.stringify({requestId:request.requestId,result:{answer:'A'}})),350);
  assert.deepEqual(await pending,{answer:'A'},'过期请求的答案不得复用');
 }finally{
  if(previous===undefined)delete process.env.COURSE_TEST_KEY;else process.env.COURSE_TEST_KEY=previous;
  fs.rmSync(dir,{recursive:true,force:true});
 }
 console.log('Model checks passed: API routing, JSON errors, missing credentials, Agent response matching.');
})().catch(e=>{console.error(e);process.exitCode=1});
