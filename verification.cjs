const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function elementVisible(e){
  for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity)===0)return false;}
  const r=e.getBoundingClientRect();
  return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
}
async function verificationVisible(page){
  for(const frame of page.frames()){
    try{
      let ancestor=frame,shown=true;
      while(ancestor.parentFrame()){
        const el=await ancestor.frameElement();
        try{if(!await el.evaluate(elementVisible)){shown=false;break;}}finally{await el.dispose();}
        ancestor=ancestor.parentFrame();
      }
      if(!shown)continue;
      if(await frame.evaluate(()=>{
        const visible=e=>{
          for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity)===0)return false;}
          const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
        };
        const containers=document.querySelectorAll('[role="dialog"], [class*="captcha"], [id*="captcha"], [class*="geetest"], [id*="geetest"], [class*="yidun"], [class*="verify"]');
        const challenge=/人机验证|请完成.{0,6}验证|拖动.{0,12}(滑块|拼图)|按顺序.{0,8}点击|安全验证|点击.{0,8}完成验证/;
        return [...containers].some(e=>visible(e)&&challenge.test(e.innerText||'')) ||
          [...document.querySelectorAll('iframe')].some(e=>visible(e)&&/captcha|geetest|yidun/i.test(e.src+' '+e.title));
      }))return true;
    }catch(e){if(page.isClosed())throw e;}
  }
  return false;
}
async function waitForVerification(page,{stopped=()=>false,onWaiting=()=>{},onCleared=()=>{},interval=5000}={}){
  if(!await verificationVisible(page))return false;
  await onWaiting();
  let cleared=0;
  while(!stopped()){
    await sleep(interval);
    if(page.isClosed())throw Error('等待验证时页面已关闭');
    cleared=await verificationVisible(page)?0:cleared+1;
    if(cleared>=2){await onCleared();return true;}
  }
  throw Error('已收到停止请求，保留验证页面');
}
module.exports={verificationVisible,waitForVerification};
