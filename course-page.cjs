function isVideoCourseUrl(value){
 try{const u=new URL(value);return (u.hostname==='studyvideoh5.zhihuishu.com'&&u.pathname==='/stuStudy')||(['studywisdomh5.zhihuishu.com','wisdom-mooc.zhihuishu.com'].includes(u.hostname)&&u.pathname==='/study/index');}catch{return false;}
}
function sameCourseUrl(actual,expected){
 if(!isVideoCourseUrl(actual)||!isVideoCourseUrl(expected))return false;
 const a=new URL(actual),e=new URL(expected);
 const aid=a.searchParams.get('recruitAndCourseId'),eid=e.searchParams.get('recruitAndCourseId');
 return aid&&eid?aid===eid:a.origin+a.pathname+a.search===e.origin+e.pathname+e.search;
}
async function findCoursePage(browser,config){
 for(const p of browser.contexts().flatMap(c=>c.pages())){
  if(!isVideoCourseUrl(p.url()))continue;
  if(config.courseUrl){if(sameCourseUrl(p.url(),config.courseUrl))return p;continue;}
  try{if((await p.locator('body').innerText({timeout:2000})).includes(config.courseName))return p;}catch{}
 }
 return undefined;
}
async function findCurrentCoursePage(browser,predicate=isVideoCourseUrl){
 const pages=browser.contexts().flatMap(c=>c.pages()).filter(p=>predicate(p.url()));
 if(!pages.length)return undefined;
 const visible=pages;
 if(process.platform==='win32'){
  const {execFile}=require('node:child_process');
  const {promisify}=require('node:util');
  const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',require('node:path').join(__dirname,'edge-window-order.ps1')],{windowsHide:true});
  const rects=JSON.parse(stdout);
  const windows=[];
  for(const p of visible){const session=await p.context().newCDPSession(p);try{windows.push({page:p,title:await p.title(),...await session.send('Browser.getWindowForTarget')});}finally{await session.detach();}}
  for(const r of rects){const matches=windows.filter(w=>(r.Title===w.title||r.Title.startsWith(w.title+' '))&&Math.abs(w.bounds.left-r.Left)<=16&&Math.abs(w.bounds.top-r.Top)<=16&&Math.abs(w.bounds.width-(r.Right-r.Left))<=32&&Math.abs(w.bounds.height-(r.Bottom-r.Top))<=32);if(matches.length===1)return matches[0].page;}
 }
 throw Error('无法确定当前课程窗口，请只保留一个可见的课程窗口后重新启动');
}
module.exports={isVideoCourseUrl,sameCourseUrl,findCoursePage,findCurrentCoursePage};
