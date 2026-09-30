const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();
    for(const type of ['单选题','判断题','多选题']){
      await page.setContent(`<div class="dialog"><h2>AI助教小智给你出题啦！</h2><p><span>【${type}】</span><span>选出正确的艺术手法。</span></p><ul><li class="topic-item"><span class="topic-option-item">A.</span><div class="item-topic">用典</div></li><li class="topic-item"><span class="topic-option-item">B.</span><div class="item-topic">比喻</div></li><li class="topic-item"><span class="topic-option-item">C.</span><div class="item-topic">夸张</div></li></ul><button>关闭</button></div>`);
      await page.evaluate(fs.readFileSync(path.join(__dirname,'../detector.js'),'utf8'));
      const q=await page.evaluate(()=>{const d=window.__wisdomJevDetector,q=d.read();return{question:q.question,multiple:q.multiple,options:q.options.map(o=>o.letter),selected:q.options.filter(d.isSelected).map(o=>o.letter)}});
      assert.equal(q.question,'选出正确的艺术手法。');
      assert.equal(q.multiple,type==='多选题');
      assert.deepEqual(q.options,['A','B','C']);
      assert.deepEqual(q.selected,[]);
      await page.evaluate(()=>document.querySelectorAll('.topic-item').forEach(e=>e.onclick=event=>{if(event.isTrusted)e.querySelector('.topic-option-item').classList.toggle('active')}));
      await page.locator('.topic-item').nth(0).click();
      await page.locator('.topic-item').nth(2).click();
      assert.deepEqual(await page.evaluate(()=>{const d=window.__wisdomJevDetector;return d.read().options.filter(d.isSelected).map(o=>o.letter)}),['A','C']);
    }
    await page.setContent('<div class="ai-test-question-wrapper"><div class="close-box">×</div><div class="ques-card-box"><span class="type">1、[判断题]</span><span class="question">新题内容</span><div class="option"><span class="class-question-select">A</span><span class="answer">对</span></div><div class="option"><span class="class-question-select isSelect">B</span><span class="answer">错</span></div></div><div class="submit-btn">提交作答</div></div>');
    await page.evaluate(fs.readFileSync(path.join(__dirname,'../detector.js'),'utf8'));
    const modern=await page.evaluate(()=>{const d=window.__wisdomJevDetector,q=d.read();return{question:q.question,submit:!!q.submit,close:!!d.findClose(q.modal),selected:q.options.filter(d.isSelected).map(o=>o.letter)}});
    assert.deepEqual(modern,{question:'新题内容',submit:true,close:true,selected:['B']});
    await page.evaluate(()=>{document.querySelector('.ai-test-question-wrapper').className='ai-class-exercise-dialog';const card=document.querySelector('.ques-card-box');card.className='item';const list=document.createElement('div');list.className='ques-list';card.replaceWith(list);list.appendChild(card);card.querySelector('.question').className='question-info';document.querySelector('.close-box').outerHTML='<div class="ai-class-exercise-dialog-header"><img class="header-icon" style="width:24px;height:24px"></div>';document.querySelector('.submit-btn').outerHTML='<div class="dialog-footer"><button>提交</button></div>';});
    const mooc=await page.evaluate(()=>{const d=window.__wisdomJevDetector,q=d.read();return {question:q.question,submit:!!q.submit,close:!!d.findClose(q.modal)};});
    assert.deepEqual(mooc,{question:'新题内容',submit:true,close:true});
    console.log('Question checks passed: classic and modern quizzes, selection markers and explicit submit.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
