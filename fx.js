/* EIZEN fx: realistic glowing butterflies (pre-rendered sprites), particle scenes per theme,
   theme-change cinematics, login blast, theme drawer + performance settings. */
(() => {
  'use strict';
  const { $, store, toast, reduced } = window.EZ, Snd = window.Snd, Prog = window.Prog;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ================= SPRITES ================= */
  // Original morpho-style butterfly, drawn once per flap frame into offscreen canvases (cheap at runtime).
  function butterflyFrames(pal, frames = 12, S = 120) {
    const out = [], cx = S / 2, cy = S / 2 + 4;
    for (let i = 0; i < frames; i++) {
      const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
      const k = .16 + .84 * Math.abs(Math.cos(Math.PI * i / frames));
      const glow = g.createRadialGradient(cx, cy, 2, cx, cy, S * .48); glow.addColorStop(0, pal.glow + '99'); glow.addColorStop(.45, pal.glow + '30'); glow.addColorStop(1, pal.glow + '00'); g.fillStyle = glow; g.fillRect(0, 0, S, S);
      for (const side of [1, -1]) {
        g.save(); g.translate(cx, cy); g.scale(side * k * 1.12, 1.12);
        const fore = new Path2D('M2,-3 C5,-30 34,-48 47,-36 C54,-27 38,-9 5,3 Z');
        const hind = new Path2D('M3,2 C27,-1 44,9 38,25 C32,37 12,33 4,12 Z');
        const gr = g.createLinearGradient(0, 0, 48, -34); gr.addColorStop(0, pal.a); gr.addColorStop(.5, pal.b); gr.addColorStop(1, pal.c);
        const gr2 = g.createLinearGradient(0, 4, 36, 30); gr2.addColorStop(0, pal.a); gr2.addColorStop(.6, pal.b); gr2.addColorStop(1, pal.c);
        g.fillStyle = gr2; g.fill(hind); g.fillStyle = gr; g.fill(fore);
        g.lineJoin = 'round'; g.strokeStyle = 'rgba(6,2,26,.92)'; g.lineWidth = 2.4; g.stroke(fore); g.stroke(hind);
        g.strokeStyle = pal.vein; g.lineWidth = .7; g.beginPath();
        [[44, -36], [49, -28], [44, -15], [32, -6], [38, 12], [30, 28], [20, 26]].forEach(p => { g.moveTo(4, 0); g.quadraticCurveTo(p[0] * .5, p[1] * .6, p[0] * .96, p[1] * .96); }); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.85)'; [[41, -38], [47, -33], [50, -26], [46, -17], [36, 31], [30, 33], [22, 30]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 1.25, 0, 6.28); g.fill(); });
        const sh = g.createLinearGradient(0, -40, 30, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.5, 'rgba(255,255,255,.22)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fill(fore);
        g.restore();
      }
      g.save(); g.translate(cx, cy); const bg = g.createLinearGradient(-3, 0, 3, 0); bg.addColorStop(0, '#05030f'); bg.addColorStop(.5, '#3b3358'); bg.addColorStop(1, '#05030f'); g.fillStyle = bg; g.beginPath(); g.ellipse(0, 2, 2.6, 15, 0, 0, 6.28); g.fill(); g.beginPath(); g.arc(0, -15, 3, 0, 6.28); g.fill();
      g.strokeStyle = '#0a0618'; g.lineWidth = 1; g.beginPath(); g.moveTo(-1, -17); g.quadraticCurveTo(-8, -30, -14, -32); g.moveTo(1, -17); g.quadraticCurveTo(8, -30, 14, -32); g.stroke(); g.fillStyle = pal.c; g.beginPath(); g.arc(-14, -32, 1.4, 0, 6.28); g.arc(14, -32, 1.4, 0, 6.28); g.fill(); g.restore();
      out.push(cv);
    }
    return out;
  }
  const PAL = {
    aizen: { a: '#2a1fc9', b: '#8d5cff', c: '#7fe9ff', glow: '#8d6bff', vein: 'rgba(210,230,255,.45)' },
    ghost: { a: '#a86bff', b: '#d9b8ff', c: '#ffffff', glow: '#c7a0ff', vein: 'rgba(255,255,255,.5)' },
    gold: { a: '#b8862b', b: '#ffd86b', c: '#fff4c4', glow: '#ffd070', vein: 'rgba(255,245,210,.5)' }
  };
  const FR = {}; const frames = n => FR[n] || (FR[n] = butterflyFrames(PAL[n]));

  /* ================= SETTINGS / QUALITY ================= */
  const QN = { high: 22, mid: 11, low: 5, off: 0 };
  let quality = store.get('eizen-q', matchMedia('(max-width:800px)').matches ? 'mid' : 'high'); if (!(quality in QN)) quality = 'high';
  let shakeOn = store.get('eizen-shake', '1') === '1', glowOn = store.get('eizen-glow', '1') === '1';
  const count = () => QN[quality];

  /* ================= BACKGROUND PARTICLES ================= */
  const bg = (() => {
    const cv = $('fxCanvas'), ctx = cv.getContext('2d'); let w = 0, h = 0, P = [], mode = 'dual', meteors = [], lastT = 0, slow = 0, frameN = 0;
    const size = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; };
    size(); addEventListener('resize', size, { passive: true });
    const spawn = (p, init) => {
      p.x = rnd(0, w); p.y = init ? rnd(0, h) : h + 40; p.s = rnd(.5, 1.15); p.v = rnd(.3, .9); p.ph = rnd(0, 6.28); p.dx = rnd(-.4, .4); p.fr = (Math.random() * 12) | 0; p.sp = rnd(.12, .3);
      p.kind = mode === 'dual' ? (Math.random() < .5 ? 'b' : 'e') : mode === 'aizen' ? 'b' : mode === 'madara' ? 'e' : mode === 'halloween' ? (Math.random() < .55 ? 'bat' : 'f') : 'd';
      if (mode === 'dual') p.x = p.kind === 'b' ? rnd(0, w / 2) : rnd(w / 2, w);
      if (p.kind === 'bat') { p.x = rnd(0, w); p.y = rnd(0, h * .6); p.vx = rnd(.6, 1.6) * (Math.random() < .5 ? -1 : 1); }
    };
    const rebuild = () => { P = []; if (mode === 'winter') return; for (let i = 0; i < count(); i++) { const p = {}; spawn(p, true); P.push(p); } };
    const bat = (x, y, s, f, vx) => { // flapping silhouette
      ctx.save(); ctx.translate(x, y); ctx.scale(s * (vx < 0 ? -1 : 1), s); const fl = Math.sin(f) * 9;
      ctx.fillStyle = '#1a0d28'; ctx.strokeStyle = 'rgba(255,140,40,.55)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(10, -14 - fl, 26, -8 - fl); ctx.quadraticCurveTo(21, -3 - fl * .3, 18, 1); ctx.quadraticCurveTo(14, -1, 10, 4); ctx.quadraticCurveTo(5, 0, 0, 6);
      ctx.quadraticCurveTo(-5, 0, -10, 4); ctx.quadraticCurveTo(-14, -1, -18, 1); ctx.quadraticCurveTo(-21, -3 - fl * .3, -26, -8 - fl); ctx.quadraticCurveTo(-10, -14 - fl, 0, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.28); ctx.fill(); ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-3, -8); ctx.lineTo(0, -4); ctx.lineTo(3, -8); ctx.lineTo(3, -3); ctx.fill();
      ctx.fillStyle = '#ffb35a'; ctx.fillRect(-2.2, -1.6, 1.4, 1.4); ctx.fillRect(.8, -1.6, 1.4, 1.4); ctx.restore();
    };
    const frame = t => {
      requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(50, t - lastT || 16); lastT = t; frameN++;
      if (frameN > 60 && frameN < 240) { if (dt > 30) slow++; if (frameN === 239 && slow > 90 && quality !== 'low' && quality !== 'off') { quality = quality === 'high' ? 'mid' : 'low'; store.set('eizen-q', quality); const q = $('qSel'); if (q) q.value = quality; rebuild(); toast('کیفیت جلوه‌ها برای روانی بیشتر خودکار کم شد ⚙️'); } }
      ctx.clearRect(0, 0, w, h); if (!P.length) return;
      const f = dt / 16.7, fb = mode === 'dual' || mode === 'aizen' ? frames('aizen') : null;
      for (const p of P) {
        p.ph += .03 * f;
        if (p.kind === 'b') { p.fr += p.sp * f; p.y -= p.v * f; p.x += (Math.sin(p.ph) * .9 + p.dx) * f; if (p.y < -60) spawn(p, false); if (mode === 'dual') p.x = Math.max(0, Math.min(w / 2, p.x)); const img = fb[(p.fr | 0) % 12], sz = 120 * p.s * .75; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .85; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.ph) * .35); ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz); ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        else if (p.kind === 'e') { p.y -= p.v * 1.1 * f; p.x += Math.sin(p.ph * 1.7) * .5 * f; if (p.y < -20) spawn(p, false); if (mode === 'dual') p.x = Math.max(w / 2, Math.min(w, p.x)); const a = .35 + .35 * Math.sin(p.ph * 3), r = 1.2 + p.s * 1.8; ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5); g.addColorStop(0, `rgba(255,${110 + p.s * 70 | 0},60,${a})`); g.addColorStop(1, 'rgba(255,60,30,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - r * 5, p.y - r * 5, r * 10, r * 10); ctx.globalCompositeOperation = 'source-over'; }
        else if (p.kind === 'bat') { p.x += p.vx * f; p.y += Math.sin(p.ph * 2) * .6 * f; p.fr += .28 * f; if (p.x < -50 || p.x > w + 50) { p.x = p.vx > 0 ? -40 : w + 40; p.y = rnd(30, h * .6); } bat(p.x, p.y, .55 + p.s * .5, p.fr, p.vx); }
        else if (p.kind === 'f') { p.y += Math.sin(p.ph) * .5 * f; p.x += Math.cos(p.ph * .8) * .6 * f; if (p.y < -20 || p.y > h + 20) spawn(p, true); ctx.globalCompositeOperation = 'lighter'; const a = .4 + .5 * Math.abs(Math.sin(p.ph * 2)), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14); g.addColorStop(0, `rgba(255,170,60,${a})`); g.addColorStop(1, 'rgba(255,120,20,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 14, p.y - 14, 28, 28); ctx.globalCompositeOperation = 'source-over'; }
        else { p.y -= p.v * .6 * f; p.x += Math.sin(p.ph) * .4 * f; if (p.y < -10) spawn(p, false); ctx.fillStyle = `rgba(255,220,140,${.25 + .3 * Math.sin(p.ph * 3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1 + p.s, 0, 6.28); ctx.fill(); }
      }
      if (mode === 'madara' && quality !== 'low' && Math.random() < .004) meteors.push({ x: rnd(w * .3, w), y: -20, vx: -rnd(7, 11), vy: rnd(5, 8), l: 1 });
      for (let i = meteors.length - 1; i >= 0; i--) { const m = meteors[i]; m.x += m.vx * f; m.y += m.vy * f; m.l -= .006 * f; if (m.l <= 0) { meteors.splice(i, 1); continue; } const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 9, m.y - m.vy * 9); g.addColorStop(0, `rgba(255,190,120,${m.l})`); g.addColorStop(1, 'rgba(255,60,30,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 9, m.y - m.vy * 9); ctx.stroke(); }
    };
    rebuild(); requestAnimationFrame(frame);
    return { set(m) { mode = m; rebuild(); }, rebuild };
  })();

  /* ================= THEME-CHANGE CINEMATICS ================= */
  const burst = (() => {
    const cv = $('themeFx'), ctx = cv.getContext('2d'); let list = [], run = false, kind = '', t0 = 0, w, h;
    const loop = t => {
      const f = 1; ctx.clearRect(0, 0, w, h);
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]; p.l -= p.d; if (p.l <= 0) { list.splice(i, 1); continue; }
        if (p.t === 'b') { p.fr += .35; p.x += p.vx; p.y += p.vy; p.vx *= .985; p.vy = p.vy * .985 - .02; const img = frames(p.pal)[(p.fr | 0) % 12], sz = 120 * p.s; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, p.l * 2); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2); ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz); ctx.restore(); }
        else if (p.t === 'm') { p.x += p.vx; p.y += p.vy; ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 12, p.y - p.vy * 12); g.addColorStop(0, 'rgba(255,230,170,' + p.l + ')'); g.addColorStop(.3, 'rgba(255,90,40,' + p.l * .8 + ')'); g.addColorStop(1, 'rgba(120,0,0,0)'); ctx.strokeStyle = g; ctx.lineWidth = p.s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 12, p.y - p.vy * 12); ctx.stroke(); ctx.fillStyle = '#fff2cf'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * .9, 0, 6.28); ctx.fill(); }
        else if (p.t === 'k') { p.x += p.vx; p.y += p.vy + Math.sin(p.ph += .2) * 1.2; p.fr += .3; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, p.l * 3); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.vx < 0 ? 1 : -1, 1); const fl = Math.sin(p.fr) * 10, s = p.s; ctx.scale(s, s); ctx.fillStyle = '#0d0614'; ctx.strokeStyle = 'rgba(255,120,30,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(10, -16 - fl, 28, -9 - fl); ctx.quadraticCurveTo(22, -3, 18, 1); ctx.quadraticCurveTo(14, -1, 10, 4); ctx.quadraticCurveTo(5, 0, 0, 7); ctx.quadraticCurveTo(-5, 0, -10, 4); ctx.quadraticCurveTo(-14, -1, -18, 1); ctx.quadraticCurveTo(-22, -3, -28, -9 - fl); ctx.quadraticCurveTo(-10, -16 - fl, 0, -2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 6.28); ctx.fill(); ctx.fillStyle = '#ffc060'; ctx.fillRect(-2.4, -1.6, 1.6, 1.6); ctx.fillRect(.8, -1.6, 1.6, 1.6); ctx.restore(); }
        else { p.x += p.vx; p.y += p.vy; p.vy += .05; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = p.l; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      if (list.length) requestAnimationFrame(loop); else { run = false; ctx.clearRect(0, 0, w, h); cv.style.display = 'none'; }
    };
    return {
      play(name, ox, oy) {
        if (quality === 'off') return; w = cv.width = innerWidth; h = cv.height = innerHeight; cv.style.display = 'block'; list = []; const lite = quality === 'low' ? .35 : quality === 'mid' ? .65 : 1;
        if (name === 'aizen') { for (let i = 0; i < 34 * lite; i++) { const a = rnd(0, 6.28), s = rnd(2, 8); list.push({ t: 'b', pal: Math.random() < .25 ? 'ghost' : 'aizen', x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, fr: Math.random() * 12, s: rnd(.45, 1), l: 1.6, d: .0075 }); } }
        else if (name === 'madara') { for (let i = 0; i < 22 * lite; i++) list.push({ t: 'm', x: rnd(w * .2, w * 1.2), y: rnd(-300, -20), vx: -rnd(9, 15), vy: rnd(7, 12), s: rnd(2, 5), l: 1.4, d: .007 }); }
        else if (name === 'halloween') { for (let i = 0; i < 26 * lite; i++) list.push({ t: 'k', x: w + rnd(0, 400), y: rnd(40, h * .8), vx: -rnd(5, 11), vy: rnd(-1.5, .5), ph: rnd(0, 6), fr: rnd(0, 6), s: rnd(.8, 1.7), l: 1.6, d: .0045 }); for (let i = 0; i < 40 * lite; i++) list.push({ t: 's', x: ox, y: oy, vx: rnd(-6, 6), vy: rnd(-9, -2), s: rnd(1.5, 4), c: Math.random() < .5 ? '#ff8a1f' : '#b45cff', l: 1.2, d: .012 }); }
        else { for (let i = 0; i < 90 * lite; i++) list.push({ t: 's', x: rnd(0, w), y: rnd(-100, h * .3), vx: rnd(-1, 1), vy: rnd(1, 4), s: rnd(1.5, 3.5), c: Math.random() < .5 ? '#ffd86b' : '#fff4c4', l: 1.4, d: .008 }); }
        if (!run) { run = true; requestAnimationFrame(loop); }
      }
    };
  })();

  /* ================= LOGIN BLAST ================= */
  const blast = () => {
    const box = $('blast'), cv = $('blastCanvas'); if (!box || !cv) return;
    box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');
    const app = $('app'); if (app && !reduced && shakeOn) { app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake'); setTimeout(() => app.classList.remove('shake'), 800); }
    const w = cv.width = innerWidth, h = cv.height = innerHeight, ctx = cv.getContext('2d'), cx = w / 2, cy = h / 2, N = reduced || quality === 'off' ? 0 : quality === 'low' ? 40 : 90, P = [];
    for (let i = 0; i < N; i++) { const a = Math.random() * 6.283, s = 3 + Math.random() * 15; P.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1.5 + Math.random() * 3.5, hue: Math.random() < .5 ? 265 : 355, life: 1 }); }
    let last = performance.now(); const end = last + 1700;
    const loop = now => { const dt = Math.min(32, now - last) / 16.7; last = now; ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter'; for (const p of P) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .965; p.vy = p.vy * .965 + .12 * dt; p.life -= .016 * dt; if (p.life <= 0) continue; ctx.fillStyle = `hsla(${p.hue},95%,${60 + p.life * 20}%,${p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.5 + p.life), 0, 6.283); ctx.fill(); } if (now < end) requestAnimationFrame(loop); else { ctx.clearRect(0, 0, w, h); box.classList.remove('on'); } };
    requestAnimationFrame(loop);
  };
  window.blast = blast;

  const lb = $('loginBtn'); if (lb) ['pointerdown', 'keydown'].forEach(ev => lb.addEventListener(ev, () => Snd.init(), { passive: true }));
  window.postLogin = () => {
    Snd.init(); window.Music && Music.stop(.5);
    const voice = Snd.voice(); const go = () => { const r = Snd.sting() || 1.5; setTimeout(blast, r * 1000 - 30); };
    voice ? setTimeout(go, 1100) : go();
    if (!voice) setTimeout(() => toast('برای صدای واقعی آیزن، فایل را در پنل ویرایش بگذار 🎧'), 5200);
    document.dispatchEvent(new Event('ez-login'));
  };
  const replay = () => { Snd.init(); const r = Snd.sting() || 1.5; setTimeout(blast, r * 1000 - 30); };
  document.addEventListener('click', e => { if (e.target.closest('.legend-kanji')) replay(); });
  document.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'b' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) { Snd.init(); Snd.boom(); blast(); } });

  /* ================= THEMES ================= */
  const THEMES = [
    { id: 'aizen', name: 'آیزن', sub: 'بنفش · پروانه‌های درخشان', ic: '🦋', sw: 'linear-gradient(135deg,#3b1fc9,#a98bff 60%,#7fe9ff)', say: 'پروانه‌های توهم بیدار شدند 🦋' },
    { id: 'madara', name: 'مادارا', sub: 'قرمز · خسوف و شهاب‌سنگ', ic: '☄', sw: 'linear-gradient(135deg,#5a0610,#ff4655 60%,#ffb07a)', say: 'ماه سرخ طلوع کرد ☄' },
    { id: 'halloween', name: 'هالووین', sub: 'نارنجی · شب جادویی', ic: '🎃', sw: 'linear-gradient(135deg,#2a0e45,#ff7a1a 60%,#ffd08a)', say: 'شبِ هالووین شروع شد 🎃' },
    { id: 'winter', name: 'زمستان', sub: 'یخی · برف، بولدوزر و کریسمس', ic: '❄', sw: 'linear-gradient(135deg,#0b1f45,#7fd4ff 60%,#ffffff)', say: 'برف شروع شد ❄ کریسمس مبارک 🎄' },
    { id: 'gold', name: 'طلایی', sub: 'کلاسیک · غبار طلا', ic: '✨', sw: 'linear-gradient(135deg,#6b5530,#cdb58b 60%,#fff4c4)', say: 'طلا می‌درخشد ✨' }
  ];
  let theme = store.get('eizen-theme', 'aizen'); if (!THEMES.some(t => t.id === theme)) theme = 'aizen';
  const wash = $('themeWash');
  const setTheme = (id, fx = true, ox, oy) => {
    theme = id; THEMES.forEach(t => document.body.classList.toggle('theme-' + t.id, t.id === id)); store.set('eizen-theme', id);
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = id === 'madara' ? '#10050a' : id === 'halloween' ? '#0d0714' : id === 'winter' ? '#050b18' : '#08080d';
    bg.set(id); document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('on', c.dataset.id === id));
    ox = ox ?? innerWidth / 2; oy = oy ?? innerHeight / 2;
    document.dispatchEvent(new CustomEvent('ez-theme', { detail: { id, fx, ox, oy } }));
    if (!fx) return; Prog.theme(id); toast(THEMES.find(t => t.id === id).say);
    ox = ox ?? innerWidth / 2; oy = oy ?? innerHeight / 2; Snd.init();
    wash.className = ''; void wash.offsetWidth; wash.style.setProperty('--ox', ox + 'px'); wash.style.setProperty('--oy', oy + 'px'); wash.className = 'wash-' + id;
    setTimeout(() => { wash.className = ''; }, 2400);
    if (id === 'aizen') Snd.glass(); else if (id === 'madara') Snd.madara(); else if (id === 'halloween') { Snd.thunder(); } else if (id !== 'winter') Snd.gold();
    if (id !== 'winter') burst.play(id, ox, oy);
  };
  window.setTheme = setTheme;
  const tl = $('themeList'); if (tl) tl.innerHTML = THEMES.map(t => `<button type="button" class="theme-card" data-id="${t.id}"><i style="background:${t.sw}">${t.ic}</i><span><b>${t.name}</b><small>${t.sub}</small></span></button>`).join('');
  document.addEventListener('click', e => { const b = e.target.closest('[data-theme]'); if (b) { const r = b.getBoundingClientRect(); setTheme(b.dataset.theme, true, r.left + r.width / 2, r.top + r.height / 2); } });

  /* ================= DRAWER ================= */
  const dr = $('themeDrawer'), shade = $('drawerShade');
  const openDr = o => { dr.classList.toggle('open', o); dr.setAttribute('aria-hidden', String(!o)); shade.hidden = !o; };
  window.openDrawer = openDr;
  $('themeBtn').addEventListener('click', () => openDr(!dr.classList.contains('open')));
  $('drClose').addEventListener('click', () => openDr(false)); shade.addEventListener('click', () => openDr(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') openDr(false); });
  tl && tl.addEventListener('click', e => { const c = e.target.closest('.theme-card'); if (!c) return; const r = c.getBoundingClientRect(); setTheme(c.dataset.id, true, r.left + r.width / 2, r.top + r.height / 2); setTimeout(() => openDr(false), 450); });
  $('qSel').value = quality; $('qSel').addEventListener('change', e => { quality = e.target.value; store.set('eizen-q', quality); bg.rebuild(); });
  $('volRng').value = Math.round(Snd.vol * 100); $('volRng').addEventListener('input', e => Snd.setVol(e.target.value / 100));
  const gc = $('glowChk'), sc = $('shakeChk'); gc.checked = glowOn; sc.checked = shakeOn;
  gc.addEventListener('change', () => { glowOn = gc.checked; store.set('eizen-glow', glowOn ? '1' : '0'); document.body.classList.toggle('noglow', !glowOn); });
  sc.addEventListener('change', () => { shakeOn = sc.checked; store.set('eizen-shake', shakeOn ? '1' : '0'); });
  document.body.classList.toggle('noglow', !glowOn);
  $('ambientBtn').addEventListener('click', e => { const on = Snd.toggleAmbient(); e.currentTarget.classList.toggle('on', on); toast(on ? 'صدای فضاسازی روشن شد 🎧' : 'صدای فضاسازی خاموش شد'); });
  setTheme(theme, false);

  /* ================= CURSOR LIGHT (one transform per frame) ================= */
  const cg = $('cursorGlow'); let mx = -200, my = -200, cq = false;
  if (matchMedia('(hover:hover)').matches) addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (!cq) { cq = true; requestAnimationFrame(() => { cq = false; cg.style.transform = `translate3d(${mx - 200}px,${my - 200}px,0)`; }); } }, { passive: true });
  window.EZfx = { frames, burst, blast, quality: () => quality, theme: () => theme };
})();
