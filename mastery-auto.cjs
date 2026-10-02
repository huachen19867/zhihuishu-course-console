const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {loadConfig}=require('./config.cjs');
const {generateJson}=require('./model.cjs');
const {findCurrentCoursePage}=require('./course-page.cjs');
const {openMasteryTest}=require('./mastery-entry.cjs');
const {waitForVerification}=require('./verification.cjs');
const {isMasteryPage,courseId,readHeatmapDom,readQuestionsDom,validateQuestions,fingerprint,validateAnswers,buildRequest,eligibleUnits,readResultDom,validateResult}=require('./mastery.cjs');
const config=loadConfig(),runtime=path.join(__dirname,'runtime/mastery');
fs.mkdirSync(runtime,{recursive:true});
const pidFile=path.join(runtime,'worker.pid'),stopFile=path.join(runtime,'STOP'),resultFile=path.join(runtime,'results.json'),pendingFile=path.join(runtime,'pending.json');
let browser,page,course,ownsLock=false,courseName='',unit='',completed=fs.existsSync(resultFile)?JSON.parse(fs.readFileSync(resultFile,'utf8')):[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const stopped=()=>fs.existsSync(stopFile);
function status(stage,info={}){
 if(!ownsLock)return;
 const state={running:!['complete','error','stopped'].includes(stage),stage,courseName,unit,completed:completed.filter(r=>!r.skipped),updated:new Date().toISOString(),...info};
 fs.writeFileSync(path.join(runtime,'status.json'),JSON.stringify(state,null,2));
 fs.appendFileSync(path.join(runtime,'events.ndjson'),JSON.stringify({at:state.updated,stage,unit,...info})+'\n');
}
async function guard(){
 if(stopped())throw Error('已收到停止请求');
 if(!page||page.isClosed())throw Error('掌握度页面已关闭');
 if(courseId(page.url())!==course)throw Error('页面已离开本次课程，停止操作');
 await waitForVerification(page,{stopped,onWaiting:()=>status('waiting-verification',{message:'等待本人手动验证，完成后继续'})});
 if(stopped())throw Error('已收到停止请求');
 if(courseId(page.url())!==course)throw Error('页面已离开本次课程，停止操作');
}
async function questions(){await guard();return validateQuestions(await page.evaluate(readQuestionsDom));}
async function solve(data,knowledge){
 const key=fingerprint(course,knowledge,data),answerFile=path.join(runtime,'answer-'+key+'.json');
 const checked=raw=>{const answers=validateAnswers(data,raw);if(config.lowConfidenceAction==='stop'&&answers.some(a=>a.confidence<0.8))throw Error('答案置信度不足，按配置停止');return answers;};
 if(fs.existsSync(answerFile))return checked(JSON.parse(fs.readFileSync(answerFile,'utf8')));
 const request=buildRequest(courseName||course,data);
 for(let attempt=0;attempt<2;attempt++){
  await guard();status('solving',{message:attempt?'上次请求无有效答案，自动重试一次':'集中分析 '+data.rows.length+' 道题'});
  const workdir=path.join(runtime,'request-'+key+'-'+Date.now());
  try{
   const raw=await generateJson({...request,prompt:request.prompt+(attempt?'\n上次请求未得到有效答案。逐题核对index，choices只能使用该题options中的id，禁止使用其他题的选项id。必须覆盖全部题目。':''),workdir});
   await guard();
   if(fingerprint(course,knowledge,await questions())!==key)throw Error('分析期间题目已变化，未填写');
   const answers=checked(raw);
   fs.writeFileSync(answerFile,JSON.stringify({answers},null,2));return answers;
  }catch(error){
   if(attempt||!(/Model request timed out|模型答案未覆盖全部题目|模型答案与题目选项不匹配/.test(error.message)))throw error;
   await guard();
   if(fingerprint(course,knowledge,await questions())!==key)throw Error('重试前题目已变化，未填写');
   await sleep(2000);
  }
 }
}
async function fill(data,answers,knowledge){
 status('answering',{message:'逐题选择并核验'});
 const key=fingerprint(course,knowledge,data);
 for(const q of data.rows){
  await guard();
  if(fingerprint(course,knowledge,await questions())!==key)throw Error('题目已变化，停止填写');
  await page.locator('.exam .answer-card .list .item').nth(q.index).click({timeout:4000});
  const card=page.locator('.exam .exam-item').nth(q.index);
  await card.waitFor({state:'visible',timeout:4000});
  const answer=answers[q.index];
  for(const [index,o] of q.options.entries()){
   await guard();
   const label=card.locator('label.el-radio, label.el-checkbox').nth(index);
   const selected=await label.locator('input').isChecked();
   const shouldSelect=answer.choices.includes(o.id);
   if(q.type==='多选题'?selected!==shouldSelect:(!selected&&shouldSelect)){
    await label.scrollIntoViewIfNeeded();
    const box=await label.boundingBox();if(!box)throw Error('第 '+(q.index+1)+' 题选项不可见');
    await page.mouse.click(box.x+Math.min(20,box.width/4),box.y+box.height/2);
    let confirmed=false;
    for(let poll=0;poll<20;poll++){
     await guard();
     confirmed=await label.locator('input').isChecked()===shouldSelect;
     if(confirmed)break;
     await sleep(100);
    }
    if(!confirmed)throw Error('点击后网站未更新第 '+(q.index+1)+' 题选项状态');
   }
  }
  const fresh=(await questions()).rows[q.index].options.filter(o=>o.selected).map(o=>o.id).sort();
  if(JSON.stringify(fresh)!==JSON.stringify([...answer.choices].sort()))throw Error('网站未确认第 '+(q.index+1)+' 题选中状态');
 }
 const check=await questions();
 for(const q of check.rows)if(JSON.stringify(q.options.filter(o=>o.selected).map(o=>o.id).sort())!==JSON.stringify([...answers[q.index].choices].sort()))throw Error('提交前答案核验失败');
}
async function recordResult(pending){
 await guard();
 await page.getByText('总题数',{exact:true}).waitFor({timeout:15000});
 await page.getByText('已答对',{exact:true}).waitFor({timeout:15000});
 await page.waitForFunction(expected=>{const counts=[...document.querySelectorAll('.point .line1-count-total')];return counts.some(e=>e.querySelector('.line1-count-total-title')?.textContent.trim()==='总题数'&&Number(e.querySelector('.line1-count-total-num')?.textContent.trim())===expected);},pending.questions,{timeout:15000});
 await sleep(500);
 await guard();
 const {total,correct}=validateResult(pending,await page.evaluate(readResultDom),page.url());
 const result={course,knowledge:pending.knowledge,unit:pending.unit,total,correct,score:100*correct/total,submittedAt:new Date().toISOString()};
 completed=completed.filter(r=>!(r.course===course&&r.knowledge===pending.knowledge));completed.push(result);
 fs.writeFileSync(resultFile,JSON.stringify(completed,null,2));
 if(fs.existsSync(pendingFile))fs.unlinkSync(pendingFile);
 status('result',{score:result.score,message:'已答对 '+correct+'/'+total+'，返回掌握度热力图'});
}
async function returnHome(){
 await guard();status('returning');
 await page.locator('.point .backup-icon').click({timeout:4000});
 await page.locator('li.item-box').first().waitFor({timeout:15000});await guard();
}
async function finishExam(){
 const data=await questions(),knowledge=new URL(page.url()).searchParams.get('knowledgeId');
 if(!knowledge)throw Error('测试缺少知识点标识');
 unit=data.title;
 const existing=fs.existsSync(pendingFile)?JSON.parse(fs.readFileSync(pendingFile,'utf8')):null;
 if(existing?.submissionStarted)throw Error('上次提交结果未确认，请先核验当前测试，避免覆盖记录或重复提交');
 const answers=await solve(data,knowledge);await fill(data,answers,knowledge);await guard();
 const pending={course,knowledge,unit,questions:data.rows.length,submissionStarted:true};
 fs.writeFileSync(pendingFile,JSON.stringify(pending,null,2));status('submitting');
 await page.locator('.exam .header .submit').click({timeout:4000});
 await page.waitForFunction(()=>document.body?.innerText.includes('总题数')||[...document.querySelectorAll('[role="dialog"]')].some(e=>e.getBoundingClientRect().height>0),null,{timeout:15000});
 await guard();
 const dialog=page.locator('[role="dialog"]:visible');
 if(await dialog.count()){
  const text=await dialog.innerText();
  if(!/提交/.test(text)||/未作答|未答|未完成/.test(text))throw Error('提交出现未知或未完成提示：'+text.slice(0,200));
  const confirm=dialog.getByRole('button',{name:/^(确定|确认|确认提交)$/});
  if(await confirm.count()!==1)throw Error('无法识别提交确认按钮');
  await guard();await confirm.click({timeout:4000});
 }
 await recordResult(pending);await returnHome();
}
async function main(){
 for(let attempt=0;attempt<2;attempt++){
  try{const fd=fs.openSync(pidFile,'wx');fs.writeFileSync(fd,String(process.pid));fs.closeSync(fd);ownsLock=true;break;}
  catch(error){if(error.code!=='EEXIST')throw error;const prior=Number(fs.readFileSync(pidFile,'utf8'));if(!Number.isInteger(prior)||prior<=0)throw Error('掌握度PID记录异常，请核验');try{process.kill(prior,0);throw Error('已有掌握度程序运行');}catch(e){if(e.code!=='ESRCH')throw e;}if(Number(fs.readFileSync(pidFile,'utf8'))===prior)fs.unlinkSync(pidFile);}
 }
 if(!ownsLock)throw Error('未取得掌握度运行锁');
 browser=await chromium.connectOverCDP(config.cdpUrl);
 page=await findCurrentCoursePage(browser,isMasteryPage);
 if(!page)throw Error('请在可接管Edge打开当前课程的掌握度热力图');
 course=courseId(page.url());
 courseName=(await page.locator('body').innerText()).match(/课程名称[:：]\s*([^\n|]+)/)?.[1]?.trim()||new URL(page.url()).searchParams.get('name')||'';
 await guard();
 if(fs.existsSync(pendingFile)&&!new URL(page.url()).pathname.startsWith('/pointOfMastery/'))throw Error('存在待确认的提交结果，请先回到对应结果页核验，避免重复测试');
 if(await page.locator('.exam').count())await finishExam();
 else if(await page.getByText('总题数',{exact:true}).count()){
  const pending=fs.existsSync(pendingFile)?JSON.parse(fs.readFileSync(pendingFile,'utf8')):null;
  if(pending){if(pending.course!==course)throw Error('待确认结果属于其他课程');unit=pending.unit;await recordResult(pending);}
  await returnHome();
 }
 if(process.argv.includes('--once')){status('stopped',{message:'单组现场核验完成'});return;}
 for(let turn=0;turn<300;turn++){
  await guard();status('reading');
  await page.locator('li.item-box').first().waitFor({timeout:15000});
  const units=await page.evaluate(readHeatmapDom);
  if(!units.length||units.some(u=>!u.name||u.state==='unknown'))throw Error('未完整识别掌握度热力图，需适配');
  const next=eligibleUnits(units,completed,course)[0];
  if(!next){status('complete',{message:'本课程待测知识点已处理；低分记录可在网站查看'});return;}
  unit=next.name;status('opening');
  const opened=await openMasteryTest(page,{index:next.index,name:unit,guard});
  if(opened==='no-questions'){
   completed.push({course,unit,skipped:true,reason:'网站提示暂无练习题目，不纳入掌握度考核',at:new Date().toISOString()});
   fs.writeFileSync(resultFile,JSON.stringify(completed,null,2));
   status('reading',{message:'网站未提供该知识点练习题，记录跳过并继续'});continue;
  }
  await finishExam();
 }
 throw Error('知识点处理超过预期上限，停止核验');
}
main().catch(error=>{status(stopped()?'stopped':'error',{message:error.message});console.error(error.message);process.exitCode=stopped()?0:1;}).finally(async()=>{
 if(browser)await browser.close();
 if(ownsLock&&fs.existsSync(pidFile)&&Number(fs.readFileSync(pidFile,'utf8'))===process.pid)fs.unlinkSync(pidFile);
});
