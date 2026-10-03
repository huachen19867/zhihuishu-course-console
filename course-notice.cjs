function readProgressNoticeDom(){
  const detector=window.__wisdomJevDetector;
  const visible=detector?.visible||function(node){
    if(!node?.isConnected)return false;
    for(let e=node;e;e=e.parentElement){
      const s=getComputedStyle(e);
      if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;
    }
    const b=node.getBoundingClientRect();return b.width>0&&b.height>0;
  };
  document.querySelectorAll('[data-course-watch="progress-notice"]').forEach(e=>e.removeAttribute('data-course-watch'));
  const forbidden=/人机验证|安全验证|验证码|滑块|单选题|多选题|判断题|练习题|请选择.{0,12}答案|AI\s*助教|小智给你出题/;
  if([...document.querySelectorAll('[role="dialog"], [class*="captcha"], iframe')].some(e=>visible(e)&&(forbidden.test(e.innerText||'')||/captcha|geetest|verify/i.test(e.getAttribute('src')||'')||/captcha/i.test(e.className||''))))return false;
  const phrases=['每日6点更新','当前时间计划学习进度','你的学习进度','所在班级平均学习进度'];
  for(const modal of document.querySelectorAll('[role="dialog"], .el-dialog, .progress-dialog')){
    if(!visible(modal))continue;
    const text=(modal.innerText||'').replace(/\s/g,'');
    if(!phrases.every(p=>text.includes(p))||forbidden.test(text))continue;
    const close=detector?.findClose(modal)||[...modal.querySelectorAll('button, [role="button"], .el-dialog__headerbtn, .close-box')].find(e=>visible(e)&&(/^(关闭|关\s*闭|Close|[×✕])$/i.test((e.innerText||'').trim())||/关闭|close/i.test(e.getAttribute('aria-label')||'')||/el-dialog__headerbtn/.test(e.className||'')));
    if(!close||!visible(close)||close.disabled||close.getAttribute('aria-disabled')==='true')continue;
    close.setAttribute('data-course-watch','progress-notice');return true;
  }
  return false;
}
function readNetworkNoticeDom(){
  const visible=window.__wisdomJevDetector?.visible||function(node){
    for(let e=node;e;e=e.parentElement){const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;}
    const b=node.getBoundingClientRect();return b.width>0&&b.height>0;
  };
  return [...document.querySelectorAll('[role="dialog"], .el-dialog')].some(modal=>{
    if(!visible(modal))return false;
    const text=(modal.innerText||'').replace(/\s/g,'');
    return text.includes('因网络连接问题，导致学习进度提交失败')&&text.includes('请回到学堂重新进入视频学习页')&&
      [...modal.querySelectorAll('button, [role="button"], .el-button')].some(e=>visible(e)&&e.innerText.trim()==='返回学堂');
  });
}
module.exports={readProgressNoticeDom,readNetworkNoticeDom};
