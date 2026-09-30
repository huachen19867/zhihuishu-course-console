const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { resumePlayback,setPlaybackPreferences } = require('../playback.cjs');
async function fixture(page, mode) {
  await page.setContent('<style>.area{position:relative;width:400px;height:240px}video,.videoArea{position:absolute;width:400px;height:240px}#playButton{position:absolute;bottom:0;width:40px;height:30px;transition:opacity .1s}</style><div class="area"><video></video><div class="videoArea"></div><div id="playButton">Play</div></div>');
  await page.evaluate(mode => {
    const v = document.querySelector('video');
    let paused = true, started = 0;
    const begin = () => { if (paused) { paused=false; started=Date.now(); } };
    Object.defineProperties(v, {
      paused:{get:()=>paused}, ended:{get:()=>false}, readyState:{get:()=>4},
      currentTime:{get:()=>paused?0:(Date.now()-started)/1000},
      play:{value:async()=>{ if (mode !== 'blocked') begin(); }},
    });
    window.trustedClicks=0;
    document.querySelector('#playButton').style.display='none';
    if (mode==='hidden-control') document.querySelector('.videoArea').onclick=event=>{ if(event.isTrusted){window.trustedClicks++;begin();} };
  }, mode);
}
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage();
    await page.setContent('<video></video><button class="speedTab active" rate="1.0">1</button><button class="speedTab" rate="1.5">1.5</button>');
    await page.evaluate(()=>{window.siteRate=1;document.querySelector('[rate="1.5"]').onclick=e=>{if(!e.isTrusted)return;document.querySelectorAll('.speedTab').forEach(x=>x.classList.remove('active'));e.currentTarget.classList.add('active');window.siteRate=1.5;};});
    await setPlaybackPreferences(page);
    assert.deepEqual(await page.evaluate(()=>{const v=document.querySelector('video');return [window.siteRate,v.playbackRate,v.muted,v.volume]}),[1.5,1.5,true,0]);
    await fixture(page,'hidden-control');
    await resumePlayback(page);
    assert.equal(await page.evaluate(()=>window.trustedClicks),1);
    assert.equal(await page.evaluate(()=>document.querySelector('video').paused),false);
    await fixture(page,'media-fallback');
    await resumePlayback(page);
    assert.ok(await page.evaluate(()=>document.querySelector('video').currentTime)>0);
    await fixture(page,'blocked');
    await assert.rejects(resumePlayback(page),/播放重试后仍未看到时间推进/);
    console.log('Playback checks passed: hidden controls, media fallback, stalled playback rejection.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1});
