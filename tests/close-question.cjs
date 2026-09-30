const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {closeQuestion}=require('../close-question.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<div id="question" data-id="old"><button id="close">关闭</button></div><div style="position:fixed;inset:0;z-index:10"></div>');
  const read=()=>page.evaluate(()=>{const e=document.querySelector('#question');return e?{fingerprint:e.dataset.id}:null});
  let clicks=0;
  const click=()=>{clicks++;return page.locator('#close').click({timeout:300})};
  await page.evaluate(()=>setTimeout(()=>document.querySelector('#question').remove(),120));
  await closeQuestion({read,click,guard:async()=>{}});
  assert.equal(await read(),null);assert.equal(clicks,1);
  let state={fingerprint:'old'},attempts=0;
  const timeout=()=>{const e=Error('timeout');e.name='TimeoutError';return e};
  await closeQuestion({read:async()=>state,guard:async()=>{},pause:async()=>{},click:async()=>{attempts++;if(attempts===1)throw timeout();state=null}});
  assert.equal(attempts,2);
  attempts=0;
  await assert.rejects(closeQuestion({read:async()=>({fingerprint:'old'}),guard:async()=>{},pause:async()=>{},click:async()=>{attempts++;throw timeout()}}),/三次/);
  assert.equal(attempts,3);
  state={fingerprint:'old'};attempts=0;
  await closeQuestion({read:async()=>state,guard:async()=>{state={fingerprint:'new'}},click:async()=>{attempts++}});
  assert.equal(attempts,0);
  await closeQuestion({read:async()=>state,guard:async()=>{},stopped:()=>true,click:async()=>{attempts++}});
  assert.equal(attempts,0);
  console.log('Close checks passed: detached popup, retry limit, changed question and stop.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
