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
module.exports={isVideoCourseUrl,sameCourseUrl,findCoursePage};
