/* EIZEN extras: reveal, tilt, duel/vote, quotes, lightbox, slot upload, birthday countdown, command palette, parallax. */
(() => {
  'use strict';
  const { $, store, toast, reduced } = window.EZ, Snd = window.Snd;

  /* ---------- reveal on scroll ---------- */
  let drawn = false;
  const bars = $('duelBars');
  const stats = [['هوش و نقشه', 98, 90], ['قدرت خام', 92, 99], ['فریب و توهم', 100, 70], ['کاریزما', 95, 94], ['اراده', 90, 96]];
  if (bars) bars.innerHTML = stats.map(s => `<div class="stat"><div class="bar a"><i data-w="${s[1]}"></i></div><div class="lbl">${s[0]}</div><div class="bar m"><i data-w="${s[2]}"></i></div></div>`).join('');
  const drawBars = () => { if (drawn || !bars) return; drawn = true; setTimeout(() => bars.querySelectorAll('i').forEach(i => i.style.width = i.dataset.w + '%'), 150); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); if (e.target.querySelector('#duelBars')) drawBars(); io.unobserve(e.target); } }), { threshold: .12 });
    const watch = () => document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el)); watch(); window.EZwatch = watch;
  } else document.documentElement.classList.add('no-io');

  /* ---------- 3D tilt on cards (event-delegated, rAF throttled) ---------- */
  if (!reduced && matchMedia('(hover:hover)').matches) {
    let raf = 0, last = null;
    document.addEventListener('pointermove', e => {
      const c = e.target.closest('.interest-card,.legend,.tcard'); if (!c) return; last = [c, e.clientX, e.clientY];
      if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const [el, x, y] = last, r = el.getBoundingClientRect(), px = (x - r.left) / r.width, py = (y - r.top) / r.height; el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%'); el.style.transform = `perspective(800px) rotateY(${(px - .5) * 10}deg) rotateX(${-(py - .5) * 10}deg) translateY(-3px)`; });
    }, { passive: true });
    document.addEventListener('pointerout', e => { const c = e.target.closest('.interest-card,.legend,.tcard'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; }, { passive: true });
  }

  /* ---------- hero parallax ---------- */
  const hero = document.querySelector('.hero');
  if (hero && !reduced && matchMedia('(hover:hover)').matches) {
    const orb = hero.querySelector('.hero-orb'); let pr = 0, pe;
    hero.addEventListener('pointermove', e => { pe = e; if (pr) return; pr = requestAnimationFrame(() => { pr = 0; const r = hero.getBoundingClientRect(), x = (pe.clientX - r.left) / r.width - .5, y = (pe.clientY - r.top) / r.height - .5; if (orb) orb.style.transform = `translate3d(${x * -40}px,${y * -30}px,0)`; hero.style.setProperty('--px', x * 30 + 'px'); hero.style.setProperty('--py', y * 20 + 'px'); }); }, { passive: true });
  }

  /* ---------- duel vote ---------- */
  const votes = () => { try { return JSON.parse(store.get('eizen-votes', '{"a":0,"m":0,"mine":""}')); } catch (_) { return { a: 0, m: 0, mine: '' }; } };
  const showVotes = () => { const v = votes(), tot = v.a + v.m; $('voteFillA').style.width = tot ? v.a / tot * 100 + '%' : '50%'; $('voteFillM').style.width = tot ? v.m / tot * 100 + '%' : '50%'; $('voteA').classList.toggle('sel', v.mine === 'a'); $('voteM').classList.toggle('sel', v.mine === 'm'); $('voteText').textContent = v.mine ? `رأی تو: ${v.mine === 'a' ? 'آیزن' : 'مادارا'} — آیزن ${v.a} | مادارا ${v.m}` : 'هنوز رأی نداده‌ای.'; };
  const cast = k => { const v = votes(); if (v.mine) v[v.mine]--; v[k]++; v.mine = k; store.set('eizen-votes', JSON.stringify(v)); showVotes(); window.setTheme(k === 'a' ? 'aizen' : 'madara', true); };
  if ($('voteA')) { $('voteA').onclick = () => cast('a'); $('voteM').onclick = () => cast('m'); showVotes(); }

  /* ---------- quotes (paraphrased) ---------- */
  const quotes = [['«تحسین کردن، دورترین حالت از فهمیدن است.»', 'آیزن · برداشت آزاد', 'a'], ['«دنیا همیشه طبق نقشه پیش نمی‌رود؛ باید با واقعیت رو‌به‌رو شد.»', 'مادارا · برداشت آزاد', 'm'], ['«کسی که بالاتر از همه می‌ایستد، دیگر کسی را بالای سر خود نمی‌بیند.»', 'آیزن · برداشت آزاد', 'a'], ['«هر جا نور هست، سایه هم هست؛ و این قانون دنیاست.»', 'مادارا · برداشت آزاد', 'm'], ['«فریبی که خودت انتخابش کنی، حتی قشنگ‌تر از حقیقت به نظر می‌رسد.»', 'آیزن · برداشت آزاد', 'a'], ['«رؤیا بدون قدرت، فقط یک آرزوی ناتمام است.»', 'مادارا · برداشت آزاد', 'm']];
  const qs = document.querySelector('.quote-stage'); let qi = 0, qt;
  const showQ = i => { qi = i; qs.classList.add('fade'); setTimeout(() => { const q = quotes[i]; $('quoteText').textContent = q[0]; const w = $('quoteWho'); w.textContent = q[1]; w.style.color = q[2] === 'a' ? 'var(--aizen)' : 'var(--madara)'; [...$('quoteDots').children].forEach((d, j) => d.classList.toggle('on', j === i)); qs.classList.remove('fade'); }, 350); clearInterval(qt); qt = setInterval(() => { if (!document.hidden) showQ((qi + 1) % quotes.length); }, 7500); };
  if (qs) { $('quoteDots').innerHTML = quotes.map((_, i) => `<button type="button" aria-label="نقل‌قول ${i + 1}"></button>`).join(''); [...$('quoteDots').children].forEach((b, i) => b.onclick = () => showQ(i)); showQ(0); }

  /* ---------- lightbox ---------- */
  const lbx = $('lightbox');
  document.addEventListener('click', e => {
    const c = e.target.closest('.photo-card,.frame'); if (c) { const im = c.querySelector('img'); if (im && !im.src.endsWith('placeholder.svg')) { lbx.querySelector('img').src = im.src; lbx.hidden = false; } }
    else if (e.target === lbx || e.target.closest('#lightbox button')) lbx.hidden = true;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') lbx.hidden = true; });

  /* ---------- editor slot upload (login images / voice) ---------- */
  $('slotBtn')?.addEventListener('click', async () => {
    const f = $('slotFile').files[0], st = $('slotStatus'); if (!f) { st.textContent = 'اول یک فایل انتخاب کن.'; return; }
    const fd = new FormData(); fd.append('slot', $('slotSel').value); fd.append('file', f); st.textContent = 'در حال آپلود...';
    try { const r = await fetch('/api/upload-slot', { method: 'POST', body: fd }), d = await r.json(); if (!r.ok) throw Error(d.error || 'خطا'); st.textContent = 'ذخیره شد ✓ — صفحه را Refresh کن (Ctrl+F5).'; $('slotFile').value = ''; } catch (e) { st.textContent = e.message; }
  });

  /* ---------- birthday countdown (birthdate only comes from the server after login) ---------- */
  let bday = null, bt = null;
  const fmt = n => String(n).padStart(2, '0'), fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const tickB = () => {
    if (!bday) return; const now = new Date(); let next = new Date(now.getFullYear(), bday.m - 1, bday.d);
    const isToday = now.getMonth() === bday.m - 1 && now.getDate() === bday.d;
    if (!isToday && next < now) next = new Date(now.getFullYear() + 1, bday.m - 1, bday.d);
    const age = next.getFullYear() - bday.y;
    if (isToday) { $('bdTitle').textContent = `🎂 تولدت مبارک! ${fa(now.getFullYear() - bday.y)} ساله شدی`; ['bdD', 'bdH', 'bdM', 'bdS'].forEach(i => $(i).textContent = '🎉'); $('bdNote').textContent = 'امروز روز توست؛ دنیا یک ستاره‌ی بیشتر دارد ✨'; if (!tickB.done) { tickB.done = 1; window.blast && setTimeout(window.blast, 1500); } return; }
    const ms = next - now, s = Math.floor(ms / 1000);
    $('bdD').textContent = fa(Math.floor(s / 86400)); $('bdH').textContent = fa(fmt(Math.floor(s % 86400 / 3600))); $('bdM').textContent = fa(fmt(Math.floor(s % 3600 / 60))); $('bdS').textContent = fa(fmt(s % 60));
    $('bdTitle').textContent = `شمارش معکوس تا ${fa(age)} سالگی`; $('bdNote').textContent = 'هر ثانیه، یک قدم نزدیک‌تر به فصل تازه.';
  };
  document.addEventListener('ez-login', async () => {
    try { const r = await fetch('/api/profile'); if (!r.ok) return; const d = await r.json(), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.birthdate || ''); if (!m) return; bday = { y: +m[1], m: +m[2], d: +m[3] }; tickB(); clearInterval(bt); bt = setInterval(() => { if (!document.hidden) tickB(); }, 1000); } catch (_) {}
  });

  /* ---------- command palette (Ctrl+K) ---------- */
  const pal = $('palette'), pin = $('palIn'), plist = $('palList');
  const cmds = [
    ...[['gallery', 'گالری'], ['memories', 'خاطره‌ها'], ['worlds', 'دو افسانه'], ['duel', 'نبرد خیالی'], ['games', 'سالن بازی'], ['cards', 'گنجینه‌ی کارت‌ها'], ['lab', 'آزمایشگاه (شخصیت‌سنج، شمشیر، والپیپر…)'], ['saber', 'دوئل شمشیر نوری'], ['bro', 'برادریم یا نه؟'], ['quotes', 'پژواک کلمه‌ها'], ['media', 'موسیقی و ویدئو'], ['letter', 'نامه'], ['birthday', 'شمارش معکوس تولد']].map(([id, n]) => ({ n: 'برو به: ' + n, k: id, f: () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) })),
    ...[['aizen', 'تم آیزن 🦋'], ['madara', 'تم مادارا ☄'], ['halloween', 'تم هالووین 🎃'], ['winter', 'تم زمستان ❄'], ['gold', 'تم طلایی ✨']].map(([id, n]) => ({ n, k: 'theme ' + id, f: () => window.setTheme(id, true) })),
    { n: 'باز کردن تنظیمات', k: 'settings', f: () => window.openDrawer(true) },
    { n: 'انفجار! 💥', k: 'blast boom', f: () => { Snd.init(); Snd.boom(); window.blast(); } },
    { n: 'صدای فضاسازی', k: 'ambient music', f: () => $('ambientBtn').click() },
    { n: 'بازگشت به بالا', k: 'top', f: () => scrollTo({ top: 0, behavior: 'smooth' }) }
  ];
  let sel = 0, shown = [];
  const draw = () => { const q = pin.value.trim().toLowerCase(); shown = cmds.filter(c => !q || (c.n + c.k).toLowerCase().includes(q)).slice(0, 9); sel = Math.min(sel, Math.max(0, shown.length - 1)); plist.innerHTML = shown.map((c, i) => `<button type="button" class="${i === sel ? 'on' : ''}" data-i="${i}">${c.n}</button>`).join('') || '<p>چیزی پیدا نشد</p>'; };
  const run = i => { const c = shown[i]; if (!c) return; closeP(); setTimeout(c.f, 60); };
  const openP = () => { if ($('app').hidden) return; pal.hidden = false; pin.value = ''; sel = 0; draw(); pin.focus(); };
  const closeP = () => { pal.hidden = true; };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openP() : closeP(); return; }
    if (pal.hidden) return; if (e.key === 'Escape') closeP(); else if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); } else if (e.key === 'Enter') run(sel);
  });
  pin.addEventListener('input', () => { sel = 0; draw(); }); plist.addEventListener('click', e => { const b = e.target.closest('button'); if (b) run(+b.dataset.i); }); pal.addEventListener('click', e => { if (e.target === pal) closeP(); });
})();
