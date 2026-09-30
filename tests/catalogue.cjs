const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {readCatalogueDom}=require('../catalogue.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<video class="virtual-human-video"></video><video id="vjs_container_html5_api"></video><div class="child-info"><span class="child-name">章节分组</span></div><div class="child-info hasvideo current"><span class="child-name">本节视频</span><div role="progressbar" aria-valuenow="31"></div></div><div class="child-info hasvideo"><span class="child-name">已完成视频</span><div role="progressbar" aria-valuenow="100"></div></div>');
  await page.locator('#vjs_container_html5_api').evaluate(v=>v.muted=true);
  let data=await page.evaluate(readCatalogueDom);
  assert.equal(data.rows.length,2);assert.equal(data.rows[0].done,false);assert.equal(data.rows[1].done,true);
  assert.equal(data.title,'本节视频');assert.equal(data.video.muted,true);assert.equal(data.layout,'wisdom');
  await page.setContent('<div id="lessonOrder">旧版当前课</div><li class="video current_play"><span class="catalogue_title">旧版视频</span><i class="time_icofinish"></i></li><video></video>');
  data=await page.evaluate(readCatalogueDom);
  assert.equal(data.layout,'classic');assert.equal(data.rows[0].done,true);assert.equal(data.title,'旧版当前课');
  await page.setContent('<div class="chapter-item"><div class="item-name">分组</div><div class="chapter-content-second current"><div class="item-name">子视频</div><img class="finish-icon"></div></div><div class="chapter-item"><div class="item-name">未播放</div></div><video></video>');
  data=await page.evaluate(readCatalogueDom);
  assert.equal(data.layout,'mooc');assert.equal(data.rows.length,2);assert.equal(data.rows[0].title,'子视频');assert.equal(data.rows[0].done,true);assert.equal(data.rows[1].done,false);
  console.log('Catalogue checks passed: three layouts, completion, group exclusion, primary media selection.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
