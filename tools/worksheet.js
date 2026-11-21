/* No network requests or analytics. A draft is stored locally only on an explicit save. */
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
  const draftStatus = document.getElementById('draft-status');
  const draftKey = 'lukagrowth.worksheet.v1.' + form.dataset.tool;
  const regularFields = [...form.querySelectorAll('[data-label]:not([data-cost])')];
  const costKeys = ['item', 'currency', 'planned', 'confirmed', 'paid', 'due-date', 'source', 'priority'];
  let isExample = false;
  const exampleButton = document.getElementById('load-example');
  if (exampleButton) exampleButton.disabled = false;
  function snapshot() {
    return { version: 1, tool: form.dataset.tool, isExample, fields: Object.fromEntries(regularFields.map(el => [el.id, el.value])), costs: budget ? rows() : [] };
  }
  function hasInput() {
    return regularFields.some(el => el.value.trim()) || (budget && [...budget.querySelectorAll('input')].some(el => el.value.trim()));
  }
  function validateDraft(data) {
    if (!data || data.version !== 1 || data.tool !== form.dataset.tool || typeof data.isExample !== 'boolean' || !data.fields || typeof data.fields !== 'object' || !Array.isArray(data.costs) || data.costs.length > 100) throw new Error('存档格式不兼容，请使用已下载的记录；当前填写未改变。');
    for (const el of regularFields) {
      const value = data.fields[el.id];
      if (typeof value !== 'string' || value.length > (el.maxLength > 0 ? el.maxLength : 4000) || (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === value))) throw new Error('存档字段不完整或格式不兼容，当前填写未改变。');
      if (el.type === 'date' && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0,10) !== value)) throw new Error('存档日期无效，当前填写未改变。');
    }
    if (!budget && data.costs.length) throw new Error('存档与当前工具不匹配。');
    for (const row of data.costs) {
      if (!row || costKeys.some(k => typeof row[k] !== 'string' || row[k].length > 1000) || !currencies.includes(row.currency)) throw new Error('预算存档格式不兼容，当前填写未改变。');
    }
    return data;
  }
  function applyDraft(data) {
    validateDraft(data); // Validate everything before replacing any input.
    regularFields.forEach(el => { el.value = data.fields[el.id]; el.setCustomValidity(''); });
    if (budget) {
      budget.replaceChildren(); serial = 0;
      data.costs.forEach(row => { const item = addCost(); item.querySelectorAll('[data-cost]').forEach(el => { el.value = row[el.dataset.cost]; }); });
    }
    isExample = data.isExample;
    document.getElementById('example-status').hidden = !isExample;
    result.hidden = true;
    status.textContent = '';
    renderBudget();
  }
  function draftMessage() {
    try {
      const raw = root.localStorage.getItem(draftKey);
      draftStatus.textContent = raw ? '此浏览器有一份本机存档，可主动恢复；当前表单不会自动填入。' : '尚无本机存档。填写后点击“保存到本机”。';
    } catch { draftStatus.textContent = '浏览器不允许本机存储，请改用下载保存；填写功能仍可使用。'; }
  }
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
    if (draftStatus) draftStatus.textContent = '当前修改尚未保存到本机，请主动保存或下载。';
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
      const lines = [title + '｜Luka', isExample ? '虚拟教学示例（含后续修改），不代表真实客户或报价。' : '此记录为使用者自行填写，未自动发送。', ''];
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
      const val = id => document.getElementById(id)?.value.trim() || '待确认';
      const common = ['Luka，你好，我想交流以下问题。', isExample ? '以下内容来自虚拟教学示例，尚非真实业务资料。' : '以下是我自行填写的简要情况。'];
      if (form.dataset.tool === 'readiness') common.push('产品与用途：' + val('product'), '当前阶段：准备开始外贸', '需要核实：' + val('unknown'), '想先推进：' + val('next'));
      if (form.dataset.tool === 'buyer') common.push('当前阶段：' + val('stage'), '买家方向与用途：' + val('buyer'), '需要核实：' + val('unknown'), '想先推进：' + val('next'));
      if (budget) common.push('产品与本轮范围：' + val('scope'), '当前阶段：整理外贸起步预算', '尚未确认：' + val('unknown'), '想先推进：' + val('next'));
      common.push('我希望先确认适合的下一步与分工。');
      document.getElementById('consultation-text').value = common.join('\n');
      document.getElementById('consultation-status').textContent = '';
      result.hidden = false;
      status.textContent = '整理结果已生成。请按需保存、下载，或编辑下方咨询摘要。';
      return true;
    } catch(e) { result.hidden = true; status.textContent = e.message; return false; }
  }
  function downloadText(text, extension, mime) {
    const blob = new Blob(['\uFEFF' + text], {type: mime + ';charset=utf-8'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = title + extension;
    document.body.append(a); a.click(); a.remove(); root.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  document.getElementById('download').addEventListener('click', () => {
    if (!generate()) return;
    downloadText(output.value, '.txt', 'text/plain');
    status.textContent = '已发起下载，请确认文件已保存后再关闭页面。';
  });
  document.getElementById('copy-result').addEventListener('click', async () => {
    if (!generate()) return;
    try { await navigator.clipboard.writeText(output.value); status.textContent = '结果已复制，请粘贴到你自己的记录中保存。'; }
    catch { output.focus(); output.select(); status.textContent = '自动复制不可用，已选中结果，请长按或使用复制快捷键。'; }
  });
  document.getElementById('print-result').addEventListener('click', () => { if (generate()) root.print(); });
  document.getElementById('copy-consultation').addEventListener('click', async () => {
    const el = document.getElementById('consultation-text');
    const note = document.getElementById('consultation-status');
    try { await navigator.clipboard.writeText(el.value); note.textContent = '咨询摘要已复制。请自行检查后通过微信发送给 Luka。'; }
    catch { el.focus(); el.select(); note.textContent = '自动复制不可用，已选中摘要，请手动复制。'; }
  });
  if (budget) document.getElementById('download-csv').addEventListener('click', () => {
    if (!generate()) return;
    const header = ['记录类型','项目 / 说明','币种','计划金额','确认报价','已付金额','可确认待付','付款条件','报价依据 / 缺口'];
    const csvRows = [header, ['范围', document.getElementById('scope').value, '', '', '', '', '', '', isExample ? '虚拟教学示例，不代表真实报价' : '使用者自行填写']];
    const sums = new Map();
    rows().forEach(row => {
      const values = ['planned','confirmed','paid'].map(k => cents(row[k]));
      const due = values[1] === null || values[2] === null ? null : values[1] - values[2];
      csvRows.push(['费用项目',row.item || '未命名',row.currency,...values.map(n => n === null ? '待确认' : money(n)),due === null ? '待确认' : money(due),row['due-date'],row.source + (row.priority ? '；' + row.priority : '')]);
      if (!sums.has(row.currency)) sums.set(row.currency, { totals:[0n,0n,0n,0n], known:[0,0,0,0], count:0 });
      const s = sums.get(row.currency); s.count++;
      [...values,due].forEach((n,i) => { if(n !== null) { s.totals[i] += n; s.known[i]++; } });
    });
    for(const [currency,s] of sums) csvRows.push(['币种汇总', '仅汇总已填金额，各状态不相加',currency,...s.totals.map((n,i) => s.known[i] ? money(n) : '待确认'),'', ['计划','报价','已付','待付'].map((label,i) => label + '待确认 ' + (s.count-s.known[i]) + ' 项').join('；')]);
    const escape = value => { let s = String(value ?? ''); if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g,'""') + '"'; };
    downloadText(csvRows.map(row => row.map(escape).join(',')).join('\r\n'), '.csv', 'text/csv');
    status.textContent = '已发起 CSV 下载，明细和币种汇总均已包含，请确认保存。';
  });
  document.getElementById('save-draft').addEventListener('click', () => {
    try {
      root.localStorage.setItem(draftKey, JSON.stringify({...snapshot(), savedAt:new Date().toISOString()}));
      dirty = false;
      draftStatus.textContent = '已保存到此浏览器；之后的修改需要再次保存。共用设备请及时删除存档。';
    } catch { draftStatus.textContent = '保存失败，浏览器存储可能被禁用或已满。当前填写仍在，请下载保存。'; }
  });
  document.getElementById('restore-draft').addEventListener('click', () => {
    try {
      const raw = root.localStorage.getItem(draftKey);
      if (!raw) { draftStatus.textContent = '没有找到此工具的本机存档。'; return; }
      const data = validateDraft(JSON.parse(raw));
      if (hasInput() && !root.confirm('恢复存档将替换当前填写。继续恢复吗？')) return;
      applyDraft(data); dirty = false;
      draftStatus.textContent = '已恢复本机存档。修改后请重新保存。';
    } catch { draftStatus.textContent = '无法读取这份存档，当前填写未改变。可使用已下载记录继续填写。'; }
  });
  document.getElementById('delete-draft').addEventListener('click', () => {
    if (!root.confirm('删除此工具在本浏览器中的存档？当前表单内容会保留。')) return;
    try { root.localStorage.removeItem(draftKey); dirty = !!hasInput(); draftStatus.textContent = '本机存档已删除，当前填写保留。关闭前可下载保存。'; }
    catch { draftStatus.textContent = '浏览器未允许删除存档，请通过浏览器设置管理此网站数据。'; }
  });
  document.getElementById('clear-form').addEventListener('click', () => {
    if (hasInput() && !root.confirm('清空当前填写？已主动保存的本机存档会保留。')) return;
    const data = { version:1, tool:form.dataset.tool, isExample:false, fields:Object.fromEntries(regularFields.map(el => [el.id,''])), costs:[] };
    applyDraft(data); if (budget) addCost(); dirty = false;
    draftStatus.textContent = '当前填写已清空。若要删除存档，请点击“删除本机存档”。';
  });
  exampleButton?.addEventListener('click', () => {
    try {
      const example = JSON.parse(document.getElementById('example-data').textContent);
      const data = validateDraft({ ...example, version:1, tool:form.dataset.tool, isExample:true });
      if (hasInput() && !root.confirm('载入虚拟示例将替换当前填写；本机存档不会改变。继续吗？')) return;
      applyDraft(data); dirty = true;
      draftStatus.textContent = '已载入虚拟示例，未写入本机存档。可生成结果查看解读。';
      form.scrollIntoView({block:'start',behavior:'auto'});
    } catch { draftStatus.textContent = '示例未能载入，当前填写未改变。'; }
  });
  root.addEventListener('storage', e => { if (e.key === draftKey) draftStatus.textContent = '另一标签页更新了本机存档；当前填写未改变，恢复前请先确认。'; });
  draftMessage();
  root.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
})(typeof globalThis !== 'undefined' ? globalThis : this);
