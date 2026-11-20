/* No network requests, analytics, cookies or persistent storage. */
(function (root) {
  'use strict';
  const currencies = ['CNY', 'USD', 'EUR', 'GBP', 'HKD', 'JPY'];
  function cents(value) {
    const s = String(value ?? '').trim();
    if (!s) return null;
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(s)) throw new Error('金额须为非负数字，最多 12 位整数、两位小数；不要输入逗号。');
    const [a, b = ''] = s.split('.');
    return BigInt(a) * 100n + BigInt(b.padEnd(2, '0'));
  }
  function money(n) { return `${n / 100n}.${String(n % 100n).padStart(2, '0')}`; }
  function summarize(rows) {
    const groups = new Map();
    rows.forEach((r, i) => {
      if (!currencies.includes(r.currency)) throw new Error(`项目 ${i + 1}：请选择支持的币种。`);
      const vals = ['planned', 'confirmed', 'paid'].map(k => cents(r[k]));
      if (vals[1] !== null && vals[2] !== null && vals[2] > vals[1]) throw new Error(`项目 ${i + 1}：已付超过确认报价，请核对金额或更新报价。`);
      if (!groups.has(r.currency)) groups.set(r.currency, { totals: [0n, 0n, 0n], missing: [0, 0, 0], due: 0n, unknownDue: 0, count: 0 });
      const g = groups.get(r.currency); g.count++;
      vals.forEach((v, n) => { if (v === null) g.missing[n]++; else g.totals[n] += v; });
      if (vals[1] === null || vals[2] === null) g.unknownDue++;
      else g.due += vals[1] - vals[2];
    });
    return [...groups].map(([currency, g]) => `${currency}（${g.count} 项）\n` + ['计划', '确认报价', '已付'].map((label, n) => `${label}：${g.missing[n] === g.count ? '待确认' : money(g.totals[n])}；${g.missing[n]} 项未填`).join('\n') + `\n可确认待付：${g.unknownDue === g.count ? '待确认' : money(g.due)}；${g.unknownDue} 项待补报价或已付金额`).join('\n\n');
  }
  root.LukaWorksheets = { cents, money, summarize };
  if (typeof document === 'undefined') return;
  const form = document.getElementById('worksheet');
  if (!form) return;
  form.querySelectorAll('[disabled]').forEach(el => { el.disabled = false; });
  let serial = 0, dirty = false;
  const status = document.getElementById('tool-status');
  const result = document.getElementById('result');
  const output = document.getElementById('result-text');
  const budget = document.getElementById('budget-rows');
  const title = form.dataset.title;
  function rows() {
    return [...document.querySelectorAll('.cost-item')].map(item => Object.fromEntries([...item.querySelectorAll('[data-cost]')].map(el => [el.dataset.cost, el.value.trim()])));
  }
  function renderBudget() {
    if (!budget) return;
    const box = document.getElementById('budget-summary'); box.replaceChildren();
    try {
      const p = document.createElement('p'); p.style.whiteSpace = 'pre-line';
      p.textContent = summarize(rows()) || '尚未添加费用项目。'; box.append(p);
    } catch (e) { const p = document.createElement('p'); p.textContent = e.message; box.append(p); }
  }
  function changed() {
    dirty = true;
    if (!result.hidden) { result.hidden = true; status.textContent = '表单已修改，请重新生成或下载最新结果。'; }
    renderBudget();
  }
  function addCost() {
    serial++;
    const item = document.createElement('div'); item.className = 'cost-item';
    const heading = document.createElement('h3'); heading.textContent = `费用项目 ${serial}`; item.append(heading);
    const grid = document.createElement('div'); grid.className = 'form-grid'; item.append(grid);
    const fields = [['item', '项目与交付内容'], ['currency', '币种'], ['planned', '计划金额'], ['confirmed', '确认报价'], ['paid', '已付金额（未支付填 0）'], ['due-date', '付款日期或触发条件'], ['source', '报价来源、日期、有效期与包含范围'], ['priority', '优先级、费用类型、数量与单价说明']];
    fields.forEach(([key, label]) => {
      const wrap = document.createElement('div'); wrap.className = 'field';
      const lab = document.createElement('label'); const id = `cost-${serial}-${key}`;
      lab.htmlFor = id; lab.textContent = label;
      const input = document.createElement(key === 'currency' ? 'select' : 'input'); input.id = id; input.dataset.cost = key; input.dataset.label = label;
      if (key === 'currency') currencies.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; input.append(o); });
      else { input.type = 'text'; input.maxLength = 1000; }
      if (['planned', 'confirmed', 'paid'].includes(key)) {
        input.inputMode = 'decimal'; input.maxLength = 15;
        input.addEventListener('input', () => { input.setCustomValidity(''); input.removeAttribute('aria-invalid'); });
      }
      wrap.append(lab, input); grid.append(wrap);
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'copy'; remove.textContent = '删除这个项目';
    remove.setAttribute('aria-label', `删除费用项目 ${serial}`);
    remove.addEventListener('click', () => {
      const hasData = [...item.querySelectorAll('input')].some(x => x.value.trim());
      if (hasData && !root.confirm('删除这个费用项目？未保存的填写内容将丢失。')) return;
      item.remove(); changed(); document.getElementById('add-cost').focus();
    });
    item.append(remove); budget.append(item); renderBudget();
    return item;
  }
  if (budget) {
    addCost();
    document.getElementById('add-cost').addEventListener('click', () => { const item = addCost(); changed(); item.querySelector('input').focus(); });
  }
  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  form.addEventListener('submit', e => { e.preventDefault(); if (generate()) result.scrollIntoView({block: 'start', behavior: 'auto'}); });
  function generate() {
    status.textContent = '';
    try {
      if (budget) {
        for (const el of budget.querySelectorAll('input[data-cost]')) {
          if (!['planned','confirmed','paid'].includes(el.dataset.cost)) continue;
          try { cents(el.value); el.setCustomValidity(''); el.removeAttribute('aria-invalid'); }
          catch (e) { el.setCustomValidity(e.message); el.setAttribute('aria-invalid', 'true'); el.reportValidity(); el.focus(); throw e; }
        }
      }
      if (!form.reportValidity()) return false;
      const lines = [title + '｜Luka', '此记录为使用者自行填写，未自动发送。', ''];
      const missing = [];
      for (const fieldset of form.querySelectorAll('fieldset')) {
        lines.push(fieldset.querySelector('legend').textContent);
        for (const el of fieldset.querySelectorAll('[data-label]:not([data-cost])')) {
          lines.push(`${el.dataset.label}：${el.value.trim() || '待填写 / 待确认'}`);
          if (!el.value.trim()) missing.push(el.dataset.label);
        }
        if (fieldset.contains(budget) && budget) {
          document.querySelectorAll('.cost-item').forEach((item, n) => {
            lines.push(`费用项目 ${n + 1}`);
            item.querySelectorAll('[data-cost]').forEach(el => lines.push(`${el.dataset.label}：${el.value.trim() || '待填写 / 待确认'}`));
          });
          lines.push('', '按币种汇总（仅含已填金额；不同状态不相加）', summarize(rows()) || '尚未添加费用项目。');
        }
        lines.push('');
      }
      if (missing.length) lines.push('尚待补充：' + missing.join('、'));
      if (form.dataset.tool === 'buyer' && document.getElementById('stage').value === '对方拒绝，停止跟进') lines.push('提醒：对方已拒绝，请停止主动跟进。');
      lines.push('', '请核对后自行保存，分享前删除非公开信息。', '工具：' + root.location.origin + root.location.pathname);
      output.value = lines.join('\n');
      let print = document.getElementById('print-text');
      if (!print) { print = document.createElement('pre'); print.id = 'print-text'; print.style.display = 'none'; result.append(print); }
      print.textContent = output.value;
      result.hidden = false;
      status.textContent = '整理结果已生成，尚未自动保存。';
      return true;
    } catch(e) { result.hidden = true; status.textContent = e.message; return false; }
  }
  document.getElementById('download').addEventListener('click', () => {
    if (!generate()) return;
    const blob = new Blob(['\uFEFF' + output.value], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = title + '.txt';
    document.body.append(a); a.click(); a.remove(); root.setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent = '已发起下载，请确认文件已保存后再关闭页面。';
  });
  document.getElementById('copy-result').addEventListener('click', async () => {
    if (!generate()) return;
    try { await navigator.clipboard.writeText(output.value); status.textContent = '结果已复制，请粘贴到你自己的记录中保存。'; }
    catch { output.focus(); output.select(); status.textContent = '自动复制不可用，已选中结果，请长按或使用复制快捷键。'; }
  });
  document.getElementById('print-result').addEventListener('click', () => { if (generate()) root.print(); });
  root.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
})(typeof globalThis !== 'undefined' ? globalThis : this);
