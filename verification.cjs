const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function verificationVisible(page){
  for(const frame of page.frames()){
    try{
      if(await frame.evaluate(()=>{
        const visible=e=>!!(e.getClientRects().length)&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
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
