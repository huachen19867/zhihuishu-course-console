const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {verificationVisible,waitForVerification}=require('../verification.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<div class="captcha" style="display:none">人机验证</div><p>课程介绍提到人机验证</p>');
  assert.equal(await verificationVisible(page),false,'隐藏组件和普通课程文字不应阻断');
  await page.locator('.captcha').evaluate(e=>e.style.display='block');
  assert.equal(await verificationVisible(page),true);
  let waiting=0,cleared=0;
  await waitForVerification(page,{interval:10,onWaiting:async()=>{waiting++;await page.locator('.captcha').evaluate(e=>e.remove())},onCleared:()=>cleared++});
  assert.equal(waiting,1);assert.equal(cleared,1);
  await page.setContent('<div role="dialog">请完成人机验证</div>');
  await assert.rejects(waitForVerification(page,{interval:10,stopped:()=>true}),/停止请求/);
  assert.equal(await page.locator('[role=dialog]').count(),1,'停止时保留验证');
  console.log('Verification checks passed: visibility, manual clearance, stop preserves page.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
