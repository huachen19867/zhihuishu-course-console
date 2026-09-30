const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function resumePlayback(page) {
  const snapshot = () => page.evaluate(() => {
    const v = document.querySelector('video');
    return v && { paused:v.paused, ended:v.ended, time:v.currentTime, ready:v.readyState };
  });
  for (let attempt=0; attempt<3; attempt++) {
    let state = await snapshot();
    if (!state) throw Error('播放器尚未加载');
    if (state.ended) return;
    if (state.paused) {
      const box = await page.locator('video').boundingBox();
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
          const v=document.querySelector('video');
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
module.exports = { resumePlayback };
