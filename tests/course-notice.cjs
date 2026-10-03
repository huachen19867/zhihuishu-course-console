const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { readProgressNoticeDom, readNetworkNoticeDom } = require('../course-notice.cjs');

const progressText = `
  <p>每日6点更新</p>
  <p>当前时间计划学习进度</p>
  <p>你的学习进度</p>
  <p>所在班级平均学习进度</p>
`;
const networkText = '因网络连接问题，导致学习进度提交失败，为保证您不丢失学习进度，请回到学堂重新进入视频学习页。';

function popup(text, id = 'close') {
  return `<section id="notice" role="dialog" aria-modal="true">
    ${text}
    <button id="${id}" type="button" aria-label="关闭">×</button>
  </section>`;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    // All fixtures use setContent; block any accidental outbound request.
    await page.route('**/*', route => route.abort());

    await page.setContent(`<button id="unrelated" type="button">关闭</button>
      ${popup(progressText, 'progress-close')}`);
    assert.equal(await page.evaluate(readProgressNoticeDom), true);
    assert.equal(await page.locator('#progress-close').getAttribute('data-course-watch'), 'progress-notice');
    assert.equal(await page.locator('#unrelated').getAttribute('data-course-watch'), null);

    await page.setContent(popup('<p>普通活动通知</p>', 'unknown-close'));
    assert.equal(await page.evaluate(readProgressNoticeDom), false);
    assert.equal(await page.locator('#unknown-close').getAttribute('data-course-watch'), null);

    await page.setContent(`<style>#notice{display:none}</style>${popup(progressText, 'hidden-close')}`);
    assert.equal(await page.evaluate(readProgressNoticeDom), false);
    assert.equal(await page.locator('#hidden-close').getAttribute('data-course-watch'), null);

    await page.setContent(`<section id="notice" role="dialog" aria-modal="true">
      ${progressText}<button id="invisible-close" type="button" style="display:none">关闭</button>
    </section>`);
    assert.equal(await page.evaluate(readProgressNoticeDom), false);
    assert.equal(await page.locator('#invisible-close').getAttribute('data-course-watch'), null);

    await page.setContent(`<section id="notice" role="dialog" aria-modal="true">
      ${progressText}<button id="disabled-close" type="button" disabled>关闭</button>
    </section>`);
    assert.equal(await page.evaluate(readProgressNoticeDom), false);
    assert.equal(await page.locator('#disabled-close').getAttribute('data-course-watch'), null);

    await page.setContent(`${popup(progressText, 'progress-close')}
      <section id="captcha" role="dialog" aria-modal="true" style="position:fixed;inset:0;z-index:20;background:white">
        <p>请先完成验证码</p><button id="captcha-close" type="button">关闭</button>
      </section>`);
    assert.equal(await page.evaluate(readProgressNoticeDom), false);
    assert.equal(await page.locator('[data-course-watch="progress-notice"]').count(), 0);

    await page.setContent(popup(`${progressText}<p>练习题：请选择正确答案</p>`, 'exercise-close'));
    assert.equal(await page.evaluate(readProgressNoticeDom), false);
    assert.equal(await page.locator('#exercise-close').getAttribute('data-course-watch'), null);

    await page.setContent(popup(`${progressText}
      <p>练习题</p><p>单选题：以下哪项是正确答案？</p>
      <label><input type="radio" name="answer">A. 选项甲</label>
      <label><input type="radio" name="answer">B. 选项乙</label>`, 'exercise-close'));
    assert.equal(await page.evaluate(readProgressNoticeDom), false);
    assert.equal(await page.locator('#exercise-close').getAttribute('data-course-watch'), null);

    await page.setContent(`<section role="dialog" aria-modal="true">
      <p>${networkText}</p><button id="return-to-class" type="button">返回学堂</button>
    </section>`);
    await page.evaluate(() => {
      window.returnClicks = 0;
      document.querySelector('#return-to-class').addEventListener('click', () => window.returnClicks++);
    });
    assert.equal(await page.evaluate(readNetworkNoticeDom), true);
    assert.equal(await page.evaluate(() => window.returnClicks), 0);

    await page.setContent(`<section role="dialog" aria-modal="true" style="display:none">
      <p>${networkText}</p><button id="hidden-return" type="button">返回学堂</button>
    </section>`);
    assert.equal(await page.evaluate(readNetworkNoticeDom), false);

    await page.setContent(`<section role="dialog" aria-modal="true">
      <p>因网络繁忙，学习进度提交失败，请稍后重试。</p>
      <button id="different-return" type="button">返回学堂</button>
    </section>`);
    assert.equal(await page.evaluate(readNetworkNoticeDom), false);

    await page.setContent(`<div>${networkText}</div><button id="outside-return" type="button">返回学堂</button>`);
    assert.equal(await page.evaluate(readNetworkNoticeDom), false);

    await page.setContent(`<section role="dialog" aria-modal="true">
      <p>${networkText}</p><button id="hidden-return" type="button" style="display:none">返回学堂</button>
    </section>`);
    assert.equal(await page.evaluate(readNetworkNoticeDom), false);

    console.log('Course notice checks passed: recognized visible notice only; unknown, hidden, CAPTCHA, and exercise popups remain untouched.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
