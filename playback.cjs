const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const { verificationVisible } = require('./verification.cjs');
// Returning false hands a newly opened dialog back to the course loop.
async function interrupted(page,{shouldYield,stopped=()=>false,guard=async()=>{}}={}) {
  if(stopped())return true;
  await guard();
  if(stopped()||(shouldYield&&await shouldYield()))return true;
  if(await verificationVisible(page))return true;
  return page.evaluate(()=>{
    const detector=window.__wisdomJevDetector;
    if(detector&&(detector.read()||detector.playbackNotice?.()||detector.concurrentPlaybackNotice?.()))return true;
    const visible=e=>{
      for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity)===0)return false;}
      const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
    };
    return [...document.querySelectorAll('.ai-test-question-wrapper, .ai-class-exercise-dialog, [data-course-watch="question"]')].some(visible);
  });
}
async function visiblePoint(locator) {
  if(!await locator.count())return null;
  return locator.evaluate(e=>{
    for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity)===0)return null;}
    const r=e.getBoundingClientRect();
    const left=Math.max(0,r.left),right=Math.min(innerWidth,r.right),top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);
    if(right<=left||bottom<=top)return null;
    const x=(left+right)/2,y=(top+bottom)/2,hit=document.elementFromPoint(x,y);
    return hit&&(hit===e||e.contains(hit))?{x,y}:null;
  },undefined,{timeout:700});
}
const transientInputError = error => error.name==='TimeoutError'||/not visible|not attached|detached from the DOM/i.test(error.message);
async function setPlaybackPreferences(page,options={}){
  if(await interrupted(page,options))return false;
  const speed=page.locator('.speedTab[rate="1.5"]').first();
  if(await speed.count()){
    const confirmed=()=>speed.evaluateAll(es=>es.some(e=>e.classList.contains('active')||/^X\s*1\.5$/.test(e.closest('.speedBox')?.querySelector('span')?.textContent?.trim()||'')));
    for(let attempt=0;attempt<3&&!await confirmed();attempt++){
      if(await interrupted(page,options))return false;
      try {
        // Reveal the native toolbar, then its menu; never force a hidden target.
        const area=page.locator('.videoArea:visible, #vjs_container_html5_api:visible, video:not(.virtual-human-video):visible').first();
        const areaBox=await area.count()?await area.boundingBox({timeout:700}):null;
        if(areaBox)await page.mouse.move(areaBox.x+areaBox.width/2,areaBox.y+Math.max(1,areaBox.height-24));
        await sleep(150);
        if(await interrupted(page,options))return false;
        const label=page.locator('.speedBox:visible > span:visible').first();
        const box=await label.count()?label:page.locator('.speedBox:visible').first();
        const boxPoint=await visiblePoint(box);
        if(boxPoint)await page.mouse.move(boxPoint.x,boxPoint.y);
        await sleep(200);
        if(await interrupted(page,options))return false;
        const point=await visiblePoint(page.locator('.speedTab[rate="1.5"]:visible').first());
        if(point){
          await page.mouse.click(point.x,point.y);
          await sleep(200);
        }
      }catch(error){if(!transientInputError(error))throw error;}
      if(await interrupted(page,options))return false;
      if(!await confirmed())await sleep(250);
    }
    if(!await confirmed())throw Error('原生倍速控件三次操作后仍未确认1.5倍速，停止并保留页面');
  }
  if(await interrupted(page,options))return false;
  await page.evaluate(()=>{const v=document.querySelector('#vjs_container_html5_api')||document.querySelector('video:not(.virtual-human-video)');if(v){v.muted=true;v.volume=0;v.playbackRate=1.5}});
  return true;
}
async function resumePlayback(page,options={}) {
  const snapshot = () => page.evaluate(() => {
    const v = document.querySelector('#vjs_container_html5_api')||document.querySelector('video:not(.virtual-human-video)');
    return v && { paused:v.paused, ended:v.ended, time:v.currentTime, ready:v.readyState };
  });
  for (let attempt=0; attempt<3; attempt++) {
    if(await interrupted(page,options))return false;
    try {
    let state = await snapshot();
    if (!state) throw Error('播放器尚未加载');
    if (state.paused || state.ended) {
      const video = page.locator('#vjs_container_html5_api:visible, video:not(.virtual-human-video):visible').first();
      const box = await video.count() ? await video.boundingBox({timeout:700}) : null;
      if (box) await page.mouse.move(box.x + Math.min(25,box.width/4), box.y + box.height - 24);
      await sleep(150);
      if(await interrupted(page,options))return false;
      const button = page.locator('#replayButton:visible, .vjs-replay-control:visible, #playButton:visible, .vjs-play-control:visible, .vjs-big-play-button:visible').first();
      const buttonPoint = await visiblePoint(button);
      if (buttonPoint) await page.mouse.click(buttonPoint.x,buttonPoint.y);
      else {
        const area = page.locator('.videoArea:visible').first();
        const areaPoint = await visiblePoint(area);
        if (areaPoint) await page.mouse.click(areaPoint.x,areaPoint.y);
      }
      await sleep(700);
      if(await interrupted(page,options))return false;
      state = await snapshot();
      if (state && (state.paused || state.ended)) {
        await page.evaluate(async () => {
          const v=document.querySelector('#vjs_container_html5_api')||document.querySelector('video:not(.virtual-human-video)');
          // Native play() restarts an ended video without changing its progress directly.
          if (v && (v.paused || v.ended)) await v.play();
        });
      }
    }
    const before = await snapshot();
    await sleep(1500);
    if(await interrupted(page,options))return false;
    const after = await snapshot();
    if (after && !after.paused && (after.ended || after.time > (before?.time??after.time)+0.1)) return true;
    }catch(error){
      if(await interrupted(page,options))return false;
      if(!transientInputError(error))throw error;
    }
    await sleep(1000);
  }
  if(await interrupted(page,options))return false;
  throw Error('播放重试后仍未看到时间推进，停止并保留页面');
}
module.exports = { resumePlayback,setPlaybackPreferences };
