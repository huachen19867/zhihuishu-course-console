function readCatalogueDom(){
 const modern=!document.querySelector('li.video')&&!!document.querySelector('.child-info.hasvideo');
 const mooc=!!document.querySelector('.chapter-item');
 const catalogueSelector=mooc?'.chapter-item:not(:has(.chapter-content-second)), .chapter-content-second':modern?'.child-info.hasvideo':'li.video';
 const titleSelector=mooc?'.item-name':modern?'.child-name':'.catalogue_title';
 const rows=[...document.querySelectorAll(catalogueSelector)].map((e,index)=>({
  index,title:e.querySelector(titleSelector)?.textContent?.trim(),
  current:e.classList.contains(modern||mooc?'current':'current_play'),
  done:!!e.querySelector('.time_icofinish, .finish-icon')||e.querySelector('[aria-valuenow="100"]')!==null,
  progress:e.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')||e.querySelector('.progress-num')?.textContent?.trim()||null,
 }));
 const v=document.querySelector('#vjs_container_html5_api')||document.querySelector('video:not(.virtual-human-video)');
 const current=rows.find(r=>r.current);
 return {catalogueSelector,titleSelector,layout:mooc?'mooc':modern?'wisdom':'classic',rows,
  title:document.querySelector('#lessonOrder')?.textContent?.trim()||current?.title||null,
  video:v?{time:v.currentTime,duration:v.duration,source:v.currentSrc||v.src,paused:v.paused,ended:v.ended,rate:v.playbackRate,muted:v.muted,volume:v.volume}:null,
 };
}
module.exports={readCatalogueDom};
