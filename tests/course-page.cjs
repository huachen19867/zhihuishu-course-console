const assert=require('node:assert/strict');
const {findCoursePage,sameCourseUrl,isVideoCourseUrl}=require('../course-page.cjs');
(async()=>{
 const first='https://studyvideoh5.zhihuishu.com/stuStudy?recruitAndCourseId=test-course';
 const second='https://studywisdomh5.zhihuishu.com/study/index?recruitAndCourseId=test-course';
 assert.equal(sameCourseUrl(first,second),true);
 assert.equal(sameCourseUrl(first,second.replace('studywisdomh5','wisdom-mooc')),true);
 assert.equal(sameCourseUrl(first+'#video2',first),true);
 assert.equal(sameCourseUrl(second.replace('test-course','other-course'),first),false);
 assert.equal(isVideoCourseUrl('https://login.zhihuishu.com/'),false);
 const page=(url,text)=>({url:()=>url,locator:()=>({innerText:async()=>text})});
 const target=page(second,'目标课程'),other=page(first.replace('test-course','other-course'),'其他课程');
 const browser={contexts:()=>[{pages:()=>[other,target]}]};
 assert.equal(await findCoursePage(browser,{courseName:'目标课程',courseUrl:''}),target);
 assert.equal(await findCoursePage(browser,{courseName:'目标课程',courseUrl:first}),target);
 assert.equal(await findCoursePage(browser,{courseName:'不存在的课程',courseUrl:''}),undefined);
 console.log('Course discovery checks passed: missing URL, course isolation, route redirects, login excluded.');
})().catch(e=>{console.error(e);process.exitCode=1});
