const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {waitForVerification}=require('../verification.cjs');
const config=require('../config.cjs').loadConfig();
const out=path.join(__dirname,'../runtime/homework');
fs.mkdirSync(out,{recursive:true});
const host='onlineexamh5new.zhihuishu.com';
const course=config.courseName;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const compat=()=>{if(typeof window.prototype==='undefined')Object.defineProperty(window,'prototype',{value:Function.prototype,configurable:true});};
async function extract(page){
  const c=await page.context().newCDPSession(page);
  try{
    const {root}=await c.send('DOM.getDocument',{depth:-1,pierce:true});
    const cls=n=>{const a=n.attributes||[],i=a.indexOf('class');return i>=0?a[i+1]:'';};
    const text=n=>n.nodeType===3?n.nodeValue:(n.children||[]).concat(n.shadowRoots||[]).map(text).join('');
    const nodes=[];
    const walk=n=>{nodes.push(n);for(const ch of [...n.children||[],...n.shadowRoots||[]])walk(ch);};
    walk(root);
    const stems=nodes.filter(n=>cls(n).split(' ').includes('subject_type_describe')).map(text);
    const data=await page.evaluate(()=>({
      title:document.querySelector('h1')?.innerText?.trim(),
      rows:[...document.querySelectorAll('.examPaper_subject')].map((e,index)=>({
        index,id:e.querySelector('.subject_num span')?.id,
        type:e.querySelector('.subject_type')?.innerText?.trim(),
        options:[...e.querySelectorAll('.nodeLab')].map((o,index)=>({index,text:o.querySelector('.node_detail')?.innerText?.trim(),checked:!!o.querySelector('input')?.checked||!!o.querySelector('.onChecked')})),
      })),
      completion:document.querySelector('.percentage_tit')?.innerText?.trim(),
    }));
    if(!data.title?.includes('单元测试'))throw Error('只处理本课程单元作业');
    if(stems.length!==data.rows.length)throw Error('题干与题目数不一致');
    data.rows.forEach((q,i)=>{q.question=stems[i].replace(/^.*?【[^】]+】\s*\([^)]*分\)\s*/u,'').trim();if(!q.question||!q.options.length)throw Error('题干或选项缺失');});
    data.url=page.url();
    fs.writeFileSync(path.join(out,data.title+'.json'),JSON.stringify(data,null,2));
    return data;
  }finally{await c.detach();}
}
async function main(){
 if(!course)throw Error('请在 config.local.json 配置 courseName');
 const browser=await chromium.connectOverCDP(config.cdpUrl);
 try{
  const ctx=browser.contexts()[0];
  let pages=ctx.pages().filter(p=>p.url().includes(host));
  const mode=process.argv[2];
  if(mode==='open'){
    const title=process.argv[3];
    const list=pages.find(p=>!p.url().includes('/dohomework/'));
    if(!list)throw Error('作业列表未打开');
    if(!(await list.locator('body').innerText()).includes(course))throw Error('不是指定课程');
    await ctx.addInitScript(compat);
    const item=list.getByText(title,{exact:true}).first();
    const row=item.locator('xpath=ancestor::li[1]');
    const popup=ctx.waitForEvent('page',{timeout:10000});
    await row.getByText('开始答题',{exact:true}).click();
    const page=await popup;
    await page.waitForLoadState('domcontentloaded');await sleep(1200);
    console.log(JSON.stringify(await extract(page)));
    return;
  }
  const page=pages.find(p=>p.url().includes('/dohomework/'));
  if(!page)throw Error('未打开作业答题页面');
  const waitVerification=()=>waitForVerification(page,{stopped:()=>fs.existsSync(path.join(out,'STOP')),onWaiting:()=>{
    const file=path.join(out,'status.json');let state={};try{state=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
    fs.writeFileSync(file,JSON.stringify({...state,running:true,stage:'waiting-verification',message:'等待本人手动验证，完成后自动继续',updated:new Date().toISOString()}));
  }});
  await waitVerification();
  if(!(await page.locator('body').innerText()).includes(course))throw Error('不是指定课程');
  if(mode==='extract'){
    try{console.log(JSON.stringify(await extract(page)));}
    catch(e){
      if(!e.message.includes('缺失'))throw e;
      await page.addInitScript(compat);await page.reload({waitUntil:'domcontentloaded'});await sleep(1000);
      console.log(JSON.stringify(await extract(page)));
    }
  }else if(mode==='apply'){
    const answers=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
    const data=await extract(page);
    if(answers.title!==data.title||answers.answers.length!==data.rows.length)throw Error('答案与当前作业不一致');
    for(let i=0;i<data.rows.length;i++){
      await waitVerification();
      const q=data.rows[i],answer=answers.answers[i];
      if(answer.question!==q.question)throw Error('题干发生变化：'+(i+1));
      const desired=q.options.filter(o=>answer.choices.includes(o.text));
      if(desired.length!==answer.choices.length||!desired.length||(!q.type.includes('多选题')&&desired.length!==1))throw Error('选项匹配失败：'+(i+1));
      const root=page.locator('.examPaper_subject').nth(i);
      await page.locator('.answerCard li').nth(i).click();
      await root.waitFor({state:'visible',timeout:8000});
      for(const option of q.options){
        const chosen=desired.some(o=>o.index===option.index);
        const selected=await root.locator('.nodeLab').nth(option.index).evaluate(o=>!!o.querySelector('input')?.checked||!!o.querySelector('.onChecked'));
        if(q.type.includes('多选题')?selected!==chosen:chosen&&!selected){
          await root.locator('.nodeLab').nth(option.index).locator('.label').click({timeout:8000});
          await sleep(200);
        }
      }
      for(const option of q.options){const selected=await root.locator('.nodeLab').nth(option.index).evaluate(o=>!!o.querySelector('input')?.checked||!!o.querySelector('.onChecked'));if(selected!==desired.some(o=>o.index===option.index))throw Error('网站未接受答案：'+(i+1));}
      const next=page.getByRole('button',{name:i===data.rows.length-1?'保存':'下一题',exact:true});
      await next.click({timeout:8000});await sleep(400);
    }
    const done=await extract(page);
    console.log(JSON.stringify({title:done.title,completion:done.completion,selected:done.rows.map(q=>q.options.filter(o=>o.checked).map(o=>o.text)),body:(await page.locator('body').innerText()).slice(-700)}));
  }else if(mode==='submit'){
    const data=await extract(page);
    if(!data.rows.every(q=>q.options.some(o=>o.checked)))throw Error('存在未答题目，不提交');
    await page.getByText('提交作业',{exact:true}).click();await sleep(600);
    console.log(JSON.stringify({url:page.url(),text:(await page.locator('body').innerText()).slice(-2200),dialogs:await page.locator('[role=dialog]:visible').allInnerTexts()}));
  }else if(mode==='confirm'){
    const confirm=page.getByRole('button',{name:'确定',exact:true});
    await confirm.click();await sleep(1000);
    console.log(JSON.stringify({url:page.url(),text:(await page.locator('body').innerText()).slice(-2500)}));
  }else throw Error('模式：open / extract / apply / submit / confirm');
 }finally{await browser.close();}
}
module.exports={extract,compat};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
