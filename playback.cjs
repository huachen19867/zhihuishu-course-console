const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function setPlaybackPreferences(page){
  const speed=page.locator('.speedTab[rate="1.5"]').first();
  if(await speed.count()){
    const active=await speed.evaluate(e=>e.classList.contains('active'));
    // Use normal browser input on the site's own control, including its progress recorder.
    if(!active){
      const area=page.locator('.videoArea').first();
      if(await area.count())await area.hover({timeout:4000});
      const box=page.locator('.speedBox').first();
      if(await box.count())await box.hover({force:true,timeout:4000});
      await speed.click({force:true,timeout:4000});
    }
    if(!await speed.evaluate(e=>e.classList.contains('active')))throw Error('网站没有确认1.5倍速选项');
  }
  await page.evaluate(()=>{const v=document.querySelector('#vjs_container_html5_api')||document.querySelector('video:not(.virtual-human-video)');if(v){v.muted=true;v.volume=0;v.playbackRate=1.5}});
}
async function resumePlayback(page) {
  const snapshot = () => page.evaluate(() => {
    const v = document.querySelector('#vjs_container_html5_api')||document.querySelector('video:not(.virtual-human-video)');
    return v && { paused:v.paused, ended:v.ended, time:v.currentTime, ready:v.readyState };
  });
  for (let attempt=0; attempt<3; attempt++) {
    let state = await snapshot();
    if (!state) throw Error('播放器尚未加载');
    if (state.paused) {
      const box = await page.locator('#vjs_container_html5_api:visible, video:not(.virtual-human-video):visible').first().boundingBox();
      if (box) await page.mouse.move(box.x + Math.min(25,box.width/4), box.y + box.height - 24);
      await sleep(150);
      const button = page.locator('#playButton:visible, .vjs-play-control:visible, .vjs-big-play-button:visible').first();
      const buttonBox = await button.count() ? await button.boundingBox() : null;
      if (buttonBox) await page.mouse.click(buttonBox.x+buttonBox.width/2, buttonBox.y+buttonBox.height/2);
      else {
        const area = page.locator('.videoArea:visible').first();
        const areaBox = await area.count() ? await area.boundingBox() : null;
        if (areaBox) await page.mouse.click(areaBox.x+areaBox.width/2, areaBox.y+areaBox.height/2);
      }
      await sleep(700);
      state = await snapshot();
      if (state?.paused) {
        await page.evaluate(async () => {
          const v=document.querySelector('#vjs_container_html5_api')||document.querySelector('video:not(.virtual-human-video)');
          if (v && v.paused && !v.ended) await v.play();
        });
      }
    }
    const before = await snapshot();
    await sleep(1500);
    const after = await snapshot();
    if (after && !after.paused && (after.ended || after.time > before.time+0.1)) return;
    await sleep(1000);
  }
  throw Error('播放重试后仍未看到时间推进，停止并保留页面');
}
module.exports = { resumePlayback,setPlaybackPreferences };
