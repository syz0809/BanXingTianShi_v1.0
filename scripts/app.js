/* 伴行天使 · 前端交互脚本 (无后端依赖)
   - 语言切换、主题切换、本地持久化
   - 主页模拟监护面板：播放/暂停/步进
   - 功能页：选项卡
   - 安全页：风险筛选
   - FAQ：手风琴
   - 联系页：表单校验 + 本地提交模拟
   所有交互均在前端完成；无任何网络请求（除读取本地 data.json）。 */

(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const store = {
    get(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def }catch(e){ return def; } },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  };

  // ---- Theme ----
  const THEME_KEY = "bxangel:theme";
  function applyTheme(theme){
    document.documentElement.dataset.theme = theme;
    store.set(THEME_KEY, theme);
    const btn = $('[data-action="toggle-theme"]');
    if(btn){
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.textContent = theme === 'dark' ? '🌙 暗色' : '☀️ 明亮';
    }
  }
  function initTheme(){
    const saved = store.get(THEME_KEY, 'light');
    applyTheme(saved);
    const btn = $('[data-action="toggle-theme"]');
    if(btn){
      btn.addEventListener('click', () => {
        const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(cur);
      });
    }
  }

  // ---- I18N ----
  const LANG_KEY = "bxangel:lang";
  let dict = null;
  function t(path, lang){
    const parts = path.split('.');
    let cur = dict[lang];
    for(const p of parts){
      if(cur && p in cur){ cur = cur[p]; } else { return path; }
    }
    return cur;
  }
  async function initI18n(){
    const res = await fetch('assets/data.json');
    const data = await res.json();
    dict = data.dictionary;
    const lang = store.get(LANG_KEY, 'zh');
    applyLang(lang);
    const btn = $('[data-action="toggle-lang"]');
    if(btn){
      btn.addEventListener('click', () => {
        const now = document.documentElement.lang || 'zh';
        applyLang(now === 'zh' ? 'en' : 'zh');
      });
    }
    // translate nav (progressive)
    const navMap = t('nav', lang);
    if(navMap && $('.nav-links')){
      $$('.nav-links a').forEach(a => {
        const name = a.textContent.trim();
        const zhToKey = {"首页":"Home","功能介绍":"Features","硬件与安装":"Device","安全与告警":"Safety","隐私与合规":"Privacy","使用文档":"Docs","常见问题":"FAQ","联系我们":"Contact"};
        const key = zhToKey[name] || name;
        a.textContent = navMap[key] || name;
      });
    }
  }
  function applyLang(lang){
    document.documentElement.lang = lang;
    store.set(LANG_KEY, lang);
    const btn = $('[data-action="toggle-lang"]');
    if(btn){ btn.textContent = lang === 'zh' ? '中文' : 'EN'; }
    // swap text tokens (elements with [data-i18n="path"])
    if(dict){
      $$('[data-i18n]').forEach(el => {
        const path = el.getAttribute('data-i18n');
        el.textContent = t(path, lang);
      });
    }
  }

  // ---- Home Simulator ----
  let timer = null;
  let frame = 0;
  let scenes = [];
  async function initSimulator(){
    const panel = $('#sim-panel');
    if(!panel) return;
    const res = await fetch('assets/data.json');
    const data = await res.json();
    scenes = data.scenes;

    const $posture = panel.querySelector('[data-field="posture"]');
    const $belt = panel.querySelector('[data-field="belt"]');
    const $temp = panel.querySelector('[data-field="temp"]');
    const $risk = panel.querySelector('[data-field="risk"]');
    const $note = panel.querySelector('[data-field="note"]');
    const $progress = panel.querySelector('[data-field="progress"]');

    function render(i){
      const s = scenes[i % scenes.length];
      $posture.textContent = s.posture;
      $belt.textContent = s.belt ? '已系好' : '未系好';
      $belt.className = s.belt ? 'badge' : 'badge bg-red-100 text-red-700';
      $temp.textContent = s.temp + '℃';
      $risk.textContent = s.risk;
      $risk.className = 'badge ' + (s.risk === '危险' ? 'bg-red-100 text-red-700' : s.risk === '警告' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700');
      $note.textContent = s.note;
      $progress.value = i;
      panel.setAttribute('aria-busy', 'false');
    }
    render(frame);

    panel.querySelector('[data-action="play"]').addEventListener('click', () => {
      if(timer) return;
      panel.setAttribute('aria-busy', 'true');
      timer = setInterval(() => { frame = (frame + 1) % scenes.length; render(frame); }, 1200);
    });
    panel.querySelector('[data-action="pause"]').addEventListener('click', () => {
      clearInterval(timer); timer = null; panel.setAttribute('aria-busy', 'false');
    });
    panel.querySelector('[data-action="next"]').addEventListener('click', () => {
      frame = (frame + 1) % scenes.length; render(frame);
    });
    panel.querySelector('[data-action="prev"]').addEventListener('click', () => {
      frame = (frame - 1 + scenes.length) % scenes.length; render(frame);
    });
    panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
      frame = 0; render(frame);
    });
    panel.querySelector('[data-field="progress"]').setAttribute('max', scenes.length - 1);
    panel.querySelector('[data-field="progress"]').addEventListener('input', (e) => {
      frame = parseInt(e.target.value || '0', 10); render(frame);
    });
  }

  // ---- Features: tabs ----
  function initTabs(){
    $$('.tabs').forEach(tabs => {
      const triggers = $$('.tab-trigger', tabs);
      const panes = $$('.tab-pane', tabs);
      function act(i){
        triggers.forEach((b,idx)=>{
          b.classList.toggle('active', idx===i);
          b.setAttribute('aria-selected', idx===i ? 'true':'false');
        });
        panes.forEach((p,idx)=>{
          p.hidden = idx!==i;
        });
      }
      triggers.forEach((b,idx)=> b.addEventListener('click', ()=>act(idx)));
      act(0);
    });
  }

  // ---- Safety: filter by risk ----
  function initFilters(){
    const box = $('#safety-filter');
    if(!box) return;
    const chips = $$('.chip', box);
    const cards = $$('.risk-card');
    let level = '全部';
    function apply(){
      cards.forEach(c=>{
        const v = c.dataset.level;
        c.style.display = (level==='全部' || v===level) ? '' : 'none';
      });
    }
    chips.forEach(ch=>{
      ch.addEventListener('click', ()=>{
        chips.forEach(x=>x.classList.remove('active'));
        ch.classList.add('active');
        level = ch.dataset.level;
        apply();
      });
    });
    apply();
  }

  // ---- FAQ accordion ----
  function initAccordion(){
    $$('.faq-item').forEach(item => {
      const header = $('.faq-q', item);
      const body = $('.faq-a', item);
      body.hidden = true;
      header.addEventListener('click', () => {
        const expanded = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        body.hidden = expanded;
      });
    });
  }

  // ---- Contact form ----
  function initForm(){
    const form = $('#contact-form');
    if(!form) return;
    const status = $('#form-status');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      // simple validation
      const errs = [];
      if(!data.name || data.name.trim().length < 2) errs.push('姓名至少 2 个字符');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email||'')) errs.push('邮箱格式不正确');
      if(!data.message || data.message.trim().length < 5) errs.push('留言至少 5 个字符');
      if(errs.length){
        status.textContent = '❌ ' + errs.join('；');
        status.className = 'text-red-700';
        return;
      }
      // simulate submission -> localStorage
      const list = store.get('bxangel:msgs', []);
      list.push({ ...data, at: new Date().toISOString() });
      store.set('bxangel:msgs', list);
      status.textContent = '✅ 已提交（本地保存，仅演示）';
      status.className = 'text-green-700';
      form.reset();
    });
    const ta = form.querySelector('textarea[name="message"]');
    const counter = $('#msg-count');
    if(ta && counter){
      ta.addEventListener('input', ()=>{
        counter.textContent = String(ta.value.length);
      });
    }
  }

  // ---- Progressive enhancement init ----
  function init(){
    initTheme();
    initI18n();
    initSimulator();
    initTabs();
    initFilters();
    initAccordion();
    initForm();
    document.documentElement.classList.add('js-ready');
    const noscriptHints = $$('.nojs-hint'); noscriptHints.forEach(e=> e.remove());
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();