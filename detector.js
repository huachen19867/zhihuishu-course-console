(() => {
  const titleRE = /AI\s*助教|小智给你出题|学习过程中有问题/iu;
  const questionRE = /[【\[]\s*(?:单选题|判断题|多选题)\s*[】\]]|单选题|判断题|多选题/iu;
  const optionRE = /^\s*([A-H])\s*[.．、:：]\s*(.+?)\s*$/u;
  const visible = node => {
    if (!node || !node.isConnected) return false;
    const style = getComputedStyle(node), box = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && box.width > 0 && box.height > 0;
  };
  function leaves(root) {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const out = [];
    for (let node; (node = walk.nextNode());) {
      const value = node.textContent.trim();
      if (value && node.parentElement && visible(node.parentElement)) out.push({ node, value, el: node.parentElement });
    }
    return out;
  }
  function findModal() {
    if (!document.body) return null;
    const titles = leaves(document.body).filter(x => titleRE.test(x.value) && x.value.length < 180);
    for (const title of titles) {
      let candidate = title.el;
      for (let depth = 0; depth < 15 && candidate && candidate !== document.body; depth++, candidate = candidate.parentElement) {
        if (!visible(candidate)) continue;
        const txt = candidate.innerText || '';
        if (txt.length > 5000 || !questionRE.test(txt)) continue;
        const opts = findOptions(candidate);
        if (opts.length >= 2 && opts.length <= 8 && findClose(candidate)) return candidate;
      }
    }
    return null;
  }
  function findOptions(modal) {
    const byLetter = new Map();
    for (const item of leaves(modal)) {
      // Some Vue/React components split "A." and its text into separate spans.
      let match = item.value.match(optionRE), target = item.el;
      if (!match && /^\s*[A-H]\s*[.．、:：]\s*$/u.test(item.value)) {
        for (let depth = 0; depth < 4 && target && target !== modal; depth++, target = target.parentElement) {
          const combined = (target.innerText || '').trim();
          match = combined.match(optionRE);
          if (match && combined.length <= 300) break;
          match = null;
        }
      }
      if (!match || match[2].length > 300 || byLetter.has(match[1])) continue;
      let row = target, radio = null;
      for (let depth = 0; depth < 7 && row && row !== modal; depth++, row = row.parentElement) {
        const radios = row.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        if (radios.length === 1 && (row.innerText || '').includes(match[2])) { radio = radios[0]; target = row; break; }
      }
      if (!radio) {
        target = target.closest('label, [role="radio"], [role="checkbox"], .el-radio, .el-checkbox, .ant-radio-wrapper, li') || target;
        if (target === modal) continue;
      }
      byLetter.set(match[1], { letter: match[1], text: match[2].trim(), target, radio });
    }
    // A valid single-choice question has distinct labeled options, even when the page uses custom radio widgets.
    return [...byLetter.values()].sort((a, b) => a.letter.localeCompare(b.letter));
  }
  function findClose(modal) {
    const buttons = [...modal.querySelectorAll('button, [role="button"], a, input[type="button"]')].filter(visible);
    const textControls = leaves(modal).map(x => x.el).filter(el => {
      const text = (el.innerText || '').trim(), box = el.getBoundingClientRect();
      return /^(关闭|关\s*闭)$/u.test(text) && box.width <= 250 && box.height <= 100;
    });
    return buttons.find(b => /^(关闭|关\s*闭|Close)$/iu.test((b.innerText || b.value || '').trim())) ||
      textControls[0] ||
      buttons.find(b => /^(关闭|close)$/iu.test(b.getAttribute('aria-label') || '') || /(?:^|\s)(close|el-dialog__close|ant-modal-close)(?:$|\s)/iu.test(b.className?.toString() || '')) ||
      buttons.find(b => /^[×✕]$/u.test((b.innerText || '').trim())) ||
      leaves(modal).map(x => x.el).find(el => {
        const text = (el.innerText || '').trim(), box = el.getBoundingClientRect();
        return /^(关闭|关\s*闭|[×✕])$/u.test(text) && box.width <= 250 && box.height <= 100;
      }) || null;
  }
  function answerFeedback(modal) {
    return visible(modal) && /正确答案\s*[:：]\s*[A-H](?=\s|$|[^A-Za-z])/u.test(modal.innerText || '');
  }
  function unansweredPrompt() {
    if (!document.body) return null;
    const warning = leaves(document.body).find(x => x.value.includes('未做答的弹题不能关闭'));
    if (!warning) return null;
    let container = warning.el;
    for (let depth = 0; depth < 9 && container && container !== document.body; depth++, container = container.parentElement) {
      const text = (container.innerText || '').trim();
      if (text.length < 300 && text.includes('提示') && text.includes('未做答的弹题不能关闭')) {
        const close = findClose(container);
        if (close) return { container, close };
      }
    }
    return { container: warning.el, close: null };
  }
  function isSelected(option) {
    if (option.radio?.checked) return true;
    const target = option.target;
    if (!target?.isConnected) return false;
    if (target.getAttribute('aria-checked') === 'true') return true;
    if (target.querySelector('[aria-checked="true"], input[type="radio"]:checked, input[type="checkbox"]:checked')) return true;
    if (target.querySelector('.topic-option-item.active, .item-topic.active')) return true;
    return /(?:^|[\s_-])(checked|selected|active|chosen)(?:$|[\s_-])/iu.test(target.className?.toString() || '');
  }
  function clickPoint(option) {
    const radio = option.radio;
    if (radio && visible(radio)) {
      const box = radio.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    }
    const candidates = [...option.target.querySelectorAll('[role="radio"], [class*="radio"], [class*="check"]')]
      .filter(el => visible(el) && el.getBoundingClientRect().width <= 48 && el.getBoundingClientRect().height <= 48);
    const el = candidates[0] || option.target, box = el.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }
  function read() {
    const modal = findModal();
    if (!modal) return null;
    const opts = findOptions(modal);
    const all = leaves(modal);
    const questions = all.filter(item => questionRE.test(item.value) && item.value.length < 1000);
    const anchor = questions.at(-1)?.el;
    let raw = questions.at(-1)?.value || '';
    if (anchor && !raw.replace(/^.*?[【\[]\s*(?:单选题|判断题|多选题)\s*[】\]]\s*/u, '').trim()) {
      let parent = anchor.parentElement;
      for (let depth = 0; depth < 3 && parent && parent !== modal; depth++, parent = parent.parentElement) {
        const text = (parent.innerText || '').trim();
        if (text.length < 1000 && questionRE.test(text) && !opts.some(o => text.includes(`${o.letter}. ${o.text}`))) { raw = text; break; }
      }
    }
    const question = raw.replace(/^.*?[【\[]\s*(?:单选题|判断题|多选题)\s*[】\]]\s*/u, '').trim();
    if (!question || question.length > 800 || opts.length < 2 || opts.length > 8) return null;
    return { modal, question, multiple:/多选题/u.test(raw), options: opts, fingerprint: JSON.stringify([question, ...opts.map(o => [o.letter, o.text])]) };
  }
  function diagnose() {
    if (!document.body) return '页面尚未加载完成';
    const titles = leaves(document.body).filter(x => titleRE.test(x.value) && x.value.length < 180);
    if (!titles.length) return '没有检测到可见的 AI 助教弹窗标题';
    let questionFound = false, optionCount = 0, closeFound = false;
    for (const title of titles) {
      let candidate = title.el;
      for (let depth = 0; depth < 15 && candidate && candidate !== document.body; depth++, candidate = candidate.parentElement) {
        if (!visible(candidate) || (candidate.innerText || '').length > 5000) continue;
        questionFound ||= questionRE.test(candidate.innerText || '');
        optionCount = Math.max(optionCount, findOptions(candidate).length);
        closeFound ||= Boolean(findClose(candidate));
      }
    }
    if (!questionFound) return '找到助教标题，但未识别到单选题';
    if (optionCount < 2) return '找到单选题，但未识别到至少两个 A–H 选项';
    if (!closeFound) return '找到题目和选项，但未识别到关闭按钮';
    return '找到弹窗结构，但题干提取失败';
  }
  window.__wisdomJevDetector = { read, diagnose, visible, findClose, isSelected, clickPoint, answerFeedback, unansweredPrompt };
})();
