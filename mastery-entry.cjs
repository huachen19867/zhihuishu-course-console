const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function openMasteryTest(page,{index,name,guard}){
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  await guard();
  if(await page.locator('.exam .exam-item').count())return;
  const tile=page.locator('li.item-box').nth(index);
  if((await tile.locator('.item-box-name').innerText()).trim()!==name)throw Error('知识点目录已变化，停止进入');
  // Center the tile within the scrolling pane before opening its animated popover.
  await tile.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest'}));
  await tile.hover({timeout:4000});await sleep(350);
  const popup=page.locator('.mastery-box-custom-popover:visible').filter({has:page.getByText(name,{exact:true})});
  const button=popup.getByRole('button',{name:'提升掌握度',exact:true});
  try{
   await button.waitFor({state:'visible',timeout:1500});
   const box=await button.boundingBox();
   if(!box)continue;
   const x=box.x+box.width/2,y=box.y+box.height/2;
   // Avoid locator hover/click scrolling the popover and removing its hover trigger.
   await page.mouse.move(x,y);await sleep(100);await guard();
   const hit=await page.evaluate(({x,y,name})=>{
    const e=document.elementFromPoint(x,y),b=e?.closest('button'),p=b?.closest('.mastery-box-custom-popover');
    return !!p&&p.querySelector('.name')?.textContent.trim()===name&&b.textContent.trim()==='提升掌握度';
   },{x,y,name});
   if(!hit){await sleep(200);continue;}
   await page.mouse.click(x,y);
   const ready=await page.waitForFunction(()=>{
    if(document.querySelector('.exam .exam-item'))return 'exam';
    const notice=[...document.querySelectorAll('.el-message')].find(e=>e.getBoundingClientRect().height>0&&e.textContent.includes('该知识点暂无练习题目，不纳入掌握度考核'));
    return notice?'no-questions':false;
   },null,{timeout:15000});
   const outcome=await ready.jsonValue();await ready.dispose();
   await guard();return outcome;
  }catch(error){
   if(error.name!=='TimeoutError')throw error;
   await guard();
   if(await page.locator('.exam .exam-item').count())return;
   lastError=error;await sleep(300);
  }
 }
 throw lastError||Error('无法打开掌握度测试入口');
}
module.exports={openMasteryTest};
