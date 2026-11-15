/* EIZEN arcade part 2: Spirit Hunter (shooter), Reiatsu Rhythm, Connect-4 duel, Illusion Sequence. */
(() => {
  'use strict';
  const G = window.GH; if (!G) return;
  const { stage, best, getBest, rnd, shuffle, blip, stat, $s } = G;
  const Snd = window.Snd;
  const tone = (f, d = .1, type = 'sine', vol = .12) => blip(f, d, type, vol);

  /* ================= 6) SPIRIT HUNTER — wave shooter ================= */
  function hunter() {
    stage.innerHTML = `<div class="g-head"><div><h3>🔮 شکارچی ارواح</h3><p>با ماوس/لمس/کلیدهای جهت حرکت کن؛ شلیک خودکار است. گوی‌های رنگی توان‌افزا هستند: 🔵 سه‌تیر · 🟡 شلیک سریع · 🟢 سپر. هر ۵ موج یک باس!</p></div><div class="g-stats">${stat('hScore', 'SCORE', 0)}${stat('hWave', 'WAVE', 1)}${stat('hLife', 'LIVES', 3)}${stat('hBest', 'BEST', getBest('hunt') || '—')}</div></div><canvas class="cv" id="hcv" width="640" height="480" style="cursor:none;border-color:#a98bff55;background:#07040f"></canvas><p class="g-msg" id="hMsg">کلیک کن تا شروع شود.</p><p style="text-align:center"><button class="g-btn" id="hStart">شروع</button></p>`;
    const cv = $s('hcv'), ctx = cv.getContext('2d'), W = 640, H = 480; let raf, alive = false, last, keys = {}, tgt = null;
    let p, bl, en, eb, pu, parts, score, wave, lives, fireT, spawnQ, boss, inv, power, stars = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.6 + .3 }));
    const reset = () => { p = { x: W / 2, y: H - 60, r: 12 }; bl = []; en = []; eb = []; pu = []; parts = []; score = 0; wave = 1; lives = 3; fireT = 0; spawnQ = 0; boss = null; inv = 0; power = { spread: 0, rapid: 0, shield: 0 }; };
    reset();
    const kd = e => { if (e.key.startsWith('Arrow')) { keys[e.key] = 1; if (alive) e.preventDefault(); } }, ku = e => { if (e.key.startsWith('Arrow')) keys[e.key] = 0; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    const pos = e => { const r = cv.getBoundingClientRect(); tgt = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    cv.addEventListener('pointermove', pos); cv.addEventListener('pointerdown', e => { pos(e); cv.setPointerCapture?.(e.pointerId); if (!alive) $s('hStart').click(); });
    const burst = (x, y, col, n = 10) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = rnd(1, 5); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 1, c: col }); } };
    const startWave = () => { spawnQ = 0; if (wave % 5 === 0) { boss = { x: W / 2, y: -60, r: 42, hp: 40 + wave * 6, max: 40 + wave * 6, t: 0, dir: 1 }; $s('hMsg').textContent = '⚠ باس!'; } else { $s('hMsg').textContent = ''; const n = 6 + wave * 2; for (let i = 0; i < n; i++) en.push({ x: rnd(30, W - 30), y: -rnd(20, 60 + n * 22), r: 14, hp: 1 + (wave > 3 ? 1 : 0) + (wave > 8 ? 1 : 0), vx: rnd(-.8, .8), vy: rnd(.7, 1.2 + wave * .08), ph: rnd(0, 6), sh: Math.random() < Math.min(.4, wave * .04), st: rnd(60, 200) }); } };
    const fire = () => { const sp = power.spread > 0 ? [-.22, 0, .22] : [0]; sp.forEach(a => bl.push({ x: p.x, y: p.y - 10, vx: Math.sin(a) * 9, vy: -Math.cos(a) * 9 })); tone(power.rapid > 0 ? 880 : 700, .04, 'square', .03); };
    const hurt = () => { if (inv > 0) return; if (power.shield > 0) { power.shield = 0; inv = 40; burst(p.x, p.y, '#6ff', 14); tone(300, .15, 'square'); return; } lives--; inv = 90; $s('hLife').textContent = lives; burst(p.x, p.y, '#ff4655', 22); tone(110, .4, 'sawtooth', .2); if (lives <= 0) end(); };
    const end = () => { alive = false; const s = Math.floor(score); const nb = best('hunt', s); $s('hBest').textContent = getBest('hunt'); $s('hMsg').innerHTML = `پایان! امتیاز ${s} · موج ${wave}${nb ? ' — رکورد جدید 🏆' : ''} <span id="gReward" style="color:#ffd86b"></span>`; };
    const glow = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    const draw = () => {
      ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; for (const s of stars) { s.y += s.s * .4; if (s.y > H) s.y = 0; ctx.globalAlpha = .3 + s.s * .25; ctx.fillRect(s.x, s.y, s.s, s.s); } ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      for (const b of bl) { glow(b.x, b.y, 10, 'rgba(160,220,255,.9)'); }
      for (const b of eb) { glow(b.x, b.y, 12, 'rgba(255,80,110,.95)'); }
      for (const e of en) { glow(e.x, e.y, 28, e.sh ? 'rgba(255,100,160,.5)' : 'rgba(169,139,255,.5)'); }
      for (const q of pu) glow(q.x, q.y, 18, q.c);
      for (const q of parts) { ctx.globalAlpha = q.l; glow(q.x, q.y, 6, q.c); } ctx.globalAlpha = 1;
      if (boss) glow(boss.x, boss.y, 90, 'rgba(255,70,90,.45)');
      glow(p.x, p.y, 36, 'rgba(120,220,255,.45)');
      ctx.globalCompositeOperation = 'source-over';
      for (const e of en) { ctx.fillStyle = e.sh ? '#e8408a' : '#8f6bff'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.047 + e.ph; ctx.lineTo(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(e.x - 5, e.y - 2, 3, 4); ctx.fillRect(e.x + 2, e.y - 2, 3, 4); }
      if (boss) { ctx.fillStyle = '#a3121f'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * .785 + boss.t * .01; ctx.lineTo(boss.x + Math.cos(a) * boss.r, boss.y + Math.sin(a) * boss.r); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffb07a'; ctx.beginPath(); ctx.arc(boss.x, boss.y, 12, 0, 6.28); ctx.fill(); ctx.fillStyle = '#ffffff22'; ctx.fillRect(120, 12, 400, 8); ctx.fillStyle = '#ff4655'; ctx.fillRect(120, 12, 400 * boss.hp / boss.max, 8); }
      for (const q of pu) { ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, 7, 0, 6.28); ctx.fill(); }
      if (inv % 8 < 5) { ctx.fillStyle = '#bfefff'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 16); ctx.lineTo(p.x + 11, p.y + 12); ctx.lineTo(p.x, p.y + 6); ctx.lineTo(p.x - 11, p.y + 12); ctx.closePath(); ctx.fill(); }
      if (power.shield > 0) { ctx.strokeStyle = '#7fffd0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, 6.28); ctx.stroke(); }
    };
    const step = now => {
      if (!alive) return; const dt = Math.min(40, now - last) / 16.7; last = now; inv = Math.max(0, inv - dt);
      const sp = 5 * dt; if (keys.ArrowLeft) p.x -= sp; if (keys.ArrowRight) p.x += sp; if (keys.ArrowUp) p.y -= sp; if (keys.ArrowDown) p.y += sp;
      if (tgt) { const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy); if (d > 1) { const s = Math.min(d, 9 * dt); p.x += dx / d * s; p.y += dy / d * s; } }
      p.x = Math.max(14, Math.min(W - 14, p.x)); p.y = Math.max(40, Math.min(H - 14, p.y));
      fireT -= dt; if (fireT <= 0) { fire(); fireT = power.rapid > 0 ? 5 : 11; } for (const k in power) power[k] = Math.max(0, power[k] - dt);
      bl.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; }); bl = bl.filter(b => b.y > -20 && b.x > -20 && b.x < W + 20);
      eb.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; if (Math.hypot(b.x - p.x, b.y - p.y) < 10) { b.dead = 1; hurt(); } }); eb = eb.filter(b => !b.dead && b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);
      for (const e of en) { e.ph += .04 * dt; e.y += e.vy * dt; e.x += (e.vx + Math.sin(e.ph) * .8) * dt; if (e.x < 14 || e.x > W - 14) e.vx *= -1; if (e.sh && (e.st -= dt) <= 0) { e.st = rnd(90, 170); const a = Math.atan2(p.y - e.y, p.x - e.x); eb.push({ x: e.x, y: e.y, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2 }); } if (e.y > H + 20) { e.dead = 1; } else if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 8) { e.dead = 1; burst(e.x, e.y, '#8f6bff', 8); hurt(); } }
      if (boss) { boss.t += dt; if (boss.y < 90) boss.y += dt; else { boss.x += boss.dir * 1.6 * dt; if (boss.x > W - 60 || boss.x < 60) boss.dir *= -1; if (((boss.t | 0) % 28) === 0 && !boss.f) { boss.f = 1; for (let i = -3; i <= 3; i++) eb.push({ x: boss.x, y: boss.y + 30, vx: i * .9, vy: 3 }); const a = Math.atan2(p.y - boss.y, p.x - boss.x); eb.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 }); } else if (((boss.t | 0) % 28) !== 0) boss.f = 0; } if (Math.hypot(boss.x - p.x, boss.y - p.y) < boss.r + 8) hurt(); }
      for (const b of bl) { for (const e of en) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 4) { b.dead = 1; if (--e.hp <= 0) { e.dead = 1; score += 10 * wave; burst(e.x, e.y, '#c9a8ff', 10); tone(500 + Math.random() * 300, .05, 'triangle', .05); if (Math.random() < .13) pu.push({ x: e.x, y: e.y, t: ['spread', 'rapid', 'shield'][Math.random() * 3 | 0] }); } else tone(300, .03, 'square', .03); }
        if (boss && Math.hypot(boss.x - b.x, boss.y - b.y) < boss.r) { b.dead = 1; boss.hp--; score += 2; if (boss.hp <= 0) { burst(boss.x, boss.y, '#ff7a5a', 60); score += 300 + wave * 20; boss = null; tone(90, .8, 'sawtooth', .25); pu.push({ x: W / 2, y: 120, t: 'shield' }, { x: W / 2 - 40, y: 120, t: 'spread' }); } } }
      bl = bl.filter(b => !b.dead); en = en.filter(e => !e.dead);
      pu.forEach(q => { q.y += 1.6 * dt; q.c = q.t === 'spread' ? 'rgba(90,170,255,.9)' : q.t === 'rapid' ? 'rgba(255,220,90,.9)' : 'rgba(110,255,190,.9)'; if (Math.hypot(q.x - p.x, q.y - p.y) < 18) { q.dead = 1; power[q.t] = q.t === 'shield' ? 9999 : 600; tone(900, .12, 'triangle'); } }); pu = pu.filter(q => !q.dead && q.y < H + 20);
      parts.forEach(q => { q.x += q.vx * dt; q.y += q.vy * dt; q.l -= .03 * dt; }); parts = parts.filter(q => q.l > 0);
      if (!en.length && !boss) { wave++; $s('hWave').textContent = wave; score += 50; startWave(); }
      $s('hScore').textContent = Math.floor(score); draw(); raf = requestAnimationFrame(step);
    };
    $s('hStart').onclick = () => { cancelAnimationFrame(raf); reset(); alive = true; $s('hScore').textContent = 0; $s('hWave').textContent = 1; $s('hLife').textContent = 3; startWave(); last = performance.now(); raf = requestAnimationFrame(step); };
    draw();
    return () => { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  }

  /* ================= 7) REIATSU RHYTHM — 4-lane rhythm game with generated music ================= */
  function rhythm() {
    stage.innerHTML = `<div class="g-head"><div><h3>🥁 ریتم رواتسو</h3><p>نت‌ها که به خط پایین رسیدند، کلید <b>D F J K</b> (یا لمس ستون) را بزن. ۴۵ ثانیه موسیقی تولیدشده؛ رتبه‌ی S بگیر!</p></div><div class="g-stats">${stat('rScore', 'SCORE', 0)}${stat('rCombo', 'COMBO', 0)}${stat('rAcc', 'ACC', '—')}${stat('rBest', 'BEST', getBest('rhy') || '—')}</div></div><canvas class="cv" id="rcv" width="480" height="480" style="max-width:480px;cursor:pointer;border-color:#a98bff55;background:#07040f;aspect-ratio:1/1"></canvas><p class="g-msg" id="rMsg">با دکمه‌ی شروع آماده شو.</p><p style="text-align:center"><button class="g-btn" id="rStart">شروع</button></p>`;
    const cv = $s('rcv'), ctx = cv.getContext('2d'), W = 480, H = 480, L = 4, LW = W / L, HIT = H - 80, FALL = 1.3, COL = ['#a98bff', '#5ad1ff', '#ff6b9a', '#ffd86b'], KEYS = ['d', 'f', 'j', 'k'];
    let notes = [], running = false, raf, t0 = 0, sc = 0, combo = 0, maxc = 0, judged = { P: 0, G: 0, O: 0, M: 0 }, fb = '', fbT = 0, flash = [0, 0, 0, 0], total = 0;
    const BPM = 112, SD = 60 / BPM / 2, STEPS = 170, LEAD = 2.2;
    const build = () => { notes = []; let prev = -1; for (let i = 0; i < STEPS; i++) { const dens = i < 16 ? 0 : Math.min(.75, .35 + i / 260); if (i % 2 === 0 || Math.random() < dens * .55) { if (Math.random() < dens) { let l; do { l = Math.random() * 4 | 0; } while (l === prev && Math.random() < .7); prev = l; notes.push({ t: LEAD + i * SD, l, done: 0 }); if (i > 60 && Math.random() < .12) { let l2; do { l2 = Math.random() * 4 | 0; } while (l2 === l); notes.push({ t: LEAD + i * SD, l: l2, done: 0 }); } } } } total = notes.length; };
    const music = c => { // drums + bass + arp scheduled up front, in sync with the chart
      const t = c.currentTime + .1; t0 = t; const root = [73.4, 58.3, 98, 55];
      for (let i = 0; i < STEPS; i++) { const tt = t + LEAD + i * SD, bar = (i / 8 | 0) % 4;
        if (i % 8 === 0 || i % 8 === 5) Snd.taiko(tt, .55, 1.1); if (i % 8 === 4) { const n = Snd.noise(.2), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 1800; Snd.env(g, tt, .002, .22, .14); n.connect(f); f.connect(g); g.connect(Snd.master); n.start(tt); n.stop(tt + .2); }
        if (i % 2 === 1) { const n = Snd.noise(.05), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 7000; Snd.env(g, tt, .001, .07, .04); n.connect(f); f.connect(g); g.connect(Snd.master); n.start(tt); n.stop(tt + .06); }
        if (i % 4 === 0) Snd.tone(root[bar], tt, SD * 3.5, 'sawtooth', .07);
        if (i % 2 === 0) Snd.tone(root[bar] * 4 * [1, 1.5, 1.2, 2][(i / 2) % 4 | 0], tt, SD * 1.5, 'triangle', .035, 1);
      } };
    const judge = lane => {
      const now = Snd.ctx.currentTime - t0; let bestN = null, bd = 9; for (const n of notes) if (!n.done && n.l === lane) { const d = Math.abs(n.t - now); if (d < bd) { bd = d; bestN = n; } }
      flash[lane] = 1; if (!bestN || bd > .16) { return; } bestN.done = 1; let g;
      if (bd < .05) { g = 'PERFECT'; sc += 300; judged.P++; } else if (bd < .1) { g = 'GOOD'; sc += 150; judged.G++; } else { g = 'OK'; sc += 60; judged.O++; }
      combo++; maxc = Math.max(maxc, combo); sc += Math.min(combo, 50) * 3; fb = g; fbT = 1; Snd.tone([523, 659, 784, 988][lane], Snd.ctx.currentTime, .25, 'triangle', .07, 1);
    };
    const kd = e => { const l = KEYS.indexOf(e.key.toLowerCase()); if (l >= 0 && running && !e.repeat) judge(l); };
    addEventListener('keydown', kd);
    cv.addEventListener('pointerdown', e => { if (!running) return; const r = cv.getBoundingClientRect(); judge(Math.min(3, Math.max(0, ((e.clientX - r.left) / r.width * 4) | 0))); });
    const draw = () => {
      const now = Snd.ctx ? Snd.ctx.currentTime - t0 : 0;
      ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, W, H);
      for (let l = 0; l < L; l++) { ctx.fillStyle = `rgba(255,255,255,${.03 + flash[l] * .12})`; ctx.fillRect(l * LW + 2, 0, LW - 4, H); const g = ctx.createLinearGradient(0, HIT - 60, 0, HIT + 40); g.addColorStop(0, 'transparent'); g.addColorStop(1, COL[l] + (flash[l] > 0 ? 'aa' : '33')); ctx.fillStyle = g; ctx.fillRect(l * LW + 2, HIT - 60, LW - 4, 100); flash[l] = Math.max(0, flash[l] - .08); }
      ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, HIT); ctx.lineTo(W, HIT); ctx.stroke();
      ctx.font = '700 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff77'; KEYS.forEach((k, l) => ctx.fillText(k.toUpperCase(), l * LW + LW / 2, HIT + 38));
      ctx.globalCompositeOperation = 'lighter';
      for (const n of notes) { if (n.done) continue; const y = HIT - (n.t - now) / FALL * HIT; if (y < -30 || y > H + 30) continue; const x = n.l * LW + LW / 2; const g = ctx.createRadialGradient(x, y, 2, x, y, 34); g.addColorStop(0, '#fff'); g.addColorStop(.35, COL[n.l]); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(x - 34, y - 34, 68, 68); }
      ctx.globalCompositeOperation = 'source-over';
      if (fbT > 0) { ctx.globalAlpha = fbT; ctx.fillStyle = fb === 'PERFECT' ? '#ffd86b' : fb === 'GOOD' ? '#7fe9ff' : '#fff'; ctx.font = '700 28px sans-serif'; ctx.fillText(fb, W / 2, 140); ctx.globalAlpha = 1; fbT -= .04; }
      if (combo > 4) { ctx.fillStyle = '#ffffffcc'; ctx.font = '700 44px sans-serif'; ctx.fillText(combo, W / 2, 210); }
    };
    const loop = () => {
      if (!running) return; const now = Snd.ctx.currentTime - t0;
      for (const n of notes) if (!n.done && now - n.t > .16) { n.done = 1; judged.M++; combo = 0; }
      $s('rScore').textContent = sc; $s('rCombo').textContent = combo; const j = judged.P + judged.G + judged.O + judged.M; if (j) $s('rAcc').textContent = Math.round((judged.P + judged.G * .6 + judged.O * .3) / j * 100) + '%';
      draw(); if (now > LEAD + STEPS * SD + 1) return finish(); raf = requestAnimationFrame(loop);
    };
    const finish = () => { running = false; const acc = (judged.P + judged.G * .6 + judged.O * .3) / total, rank = acc > .93 ? 'S' : acc > .82 ? 'A' : acc > .65 ? 'B' : 'C'; const nb = best('rhy', sc); if (rank === 'S' && window.Prog) Prog.unlock('rhythm_s'); $s('rBest').textContent = getBest('rhy'); $s('rMsg').innerHTML = `رتبه <b style="font-size:26px;color:#ffd86b">${rank}</b> · امتیاز ${sc} · بیشترین کومبو ${maxc}${nb ? ' — رکورد جدید 🏆' : ''} <span id="gReward" style="color:#ffd86b"></span>`; };
    $s('rStart').onclick = () => { if (!Snd.init()) { $s('rMsg').textContent = 'مرورگر شما از صدا پشتیبانی نمی‌کند.'; return; } cancelAnimationFrame(raf); build(); sc = 0; combo = 0; maxc = 0; judged = { P: 0, G: 0, O: 0, M: 0 }; running = true; $s('rMsg').textContent = ''; music(Snd.ctx); raf = requestAnimationFrame(loop); };
    ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, W, H);
    return () => { running = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); };
  }

  /* ================= 8) CONNECT-4 duel vs AI (alpha-beta) ================= */
  function connect4() {
    const R = 6, C = 7; let diff = 4, b, turn, over, busy;
    const html = () => { stage.innerHTML = `<div class="g-head"><div><h3>⛓ چهار‌تایی؛ دوئل با ذهن آیزن</h3><p>تو <b style="color:#ff4655">قرمز</b> (مادارا) هستی، آیزن <b style="color:#a98bff">بنفش</b>. چهار مهره‌ی هم‌رنگ را در یک ردیف بچین. هوش مصنوعی minimax دارد!</p></div><div class="g-stats"><div class="g-stat">LEVEL<b><select id="c4d" style="background:#0c0b12;color:#fff;border:0"><option value="2">آسان</option><option value="4" ${diff === 4 ? 'selected' : ''}>عادی</option><option value="6">سخت</option></select></b></div>${stat('c4w', 'WINS', G.store.get('eizen-c4w', 0))}</div></div><div class="c4" id="c4"></div><p class="g-msg" id="c4m"></p><p style="text-align:center"><button class="g-btn" id="c4r">بازی تازه</button></p>`; };
    const reset = () => { b = Array.from({ length: R }, () => Array(C).fill(0)); turn = 1; over = false; busy = false; html(); const box = $s('c4'); box.innerHTML = Array.from({ length: R * C }, (_, i) => `<i data-c="${i % C}" data-r="${(i / C) | 0}"></i>`).join(''); $s('c4d').onchange = e => { diff = +e.target.value; reset(); }; $s('c4r').onclick = reset; box.onclick = e => { const c = e.target.dataset.c; if (c !== undefined) play(+c); }; $s('c4m').textContent = 'نوبت توست'; };
    const drop = (bd, c, p) => { for (let r = R - 1; r >= 0; r--) if (!bd[r][c]) { bd[r][c] = p; return r; } return -1; };
    const win = (bd, p) => { for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const cells = []; for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= R || cc < 0 || cc >= C || bd[rr][cc] !== p) { cells.length = 0; break; } cells.push([rr, cc]); } if (cells.length) return cells; } return null; };
    const score = bd => { let s = 0; for (let r = 0; r < R; r++) s += (bd[r][3] === 2 ? 3 : bd[r][3] === 1 ? -3 : 0); const win4 = (r, c, dr, dc) => { let a = 0, h = 0, e = 0; for (let k = 0; k < 4; k++) { const v = bd[r + dr * k]?.[c + dc * k]; if (v === undefined) return 0; v === 2 ? a++ : v === 1 ? h++ : e++; } if (a && h) return 0; if (a === 3 && e) return 5; if (a === 2 && e === 2) return 2; if (h === 3 && e) return -6; if (h === 2 && e === 2) return -2; return 0; }; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) s += win4(r, c, dr, dc); return s; };
    const order = [3, 2, 4, 1, 5, 0, 6];
    const mm = (bd, d, al, be, max) => { if (win(bd, 2)) return 10000 + d; if (win(bd, 1)) return -10000 - d; if (!d || bd[0].every(x => x)) return score(bd); let v = max ? -1e9 : 1e9; for (const c of order) { if (bd[0][c]) continue; const r = drop(bd, c, max ? 2 : 1); const s = mm(bd, d - 1, al, be, !max); bd[r][c] = 0; if (max) { v = Math.max(v, s); al = Math.max(al, v); } else { v = Math.min(v, s); be = Math.min(be, v); } if (al >= be) break; } return v; };
    const aiMove = () => { let bc = -1, bv = -1e9; const cand = shuffle(order); for (const c of cand) { if (b[0][c]) continue; const r = drop(b, c, 2); const v = mm(b, diff - 1, -1e9, 1e9, false) + (diff <= 2 ? rnd(-6, 6) : 0); b[r][c] = 0; if (v > bv) { bv = v; bc = c; } } return bc; };
    const put = (c, p) => { const r = drop(b, c, p); const cell = $s('c4').children[r * C + c]; cell.className = 'p' + p; tone(p === 1 ? 330 : 440, .12, 'triangle', .1); return r; };
    const check = p => { const w = win(b, p); if (w) { over = true; w.forEach(([r, c]) => $s('c4').children[r * C + c].classList.add('win')); if (p === 1) { const wins = +G.store.get('eizen-c4w', 0) + 1; G.store.set('eizen-c4w', wins); $s('c4w').textContent = wins; const coins = diff * 18; window.Prog && (Prog.played('c4'), Prog.addCoins(coins), Prog.addXp(coins * 2)); $s('c4m').innerHTML = `🏆 بردی! +${coins} 🪙`; tone(1000, .4, 'triangle'); } else { $s('c4m').textContent = 'آیزن برد… همه‌چیز طبق نقشه بود 🦋'; tone(120, .5, 'sawtooth'); } return true; } if (b[0].every(x => x)) { over = true; $s('c4m').textContent = 'مساوی!'; return true; } return false; };
    const play = c => { if (over || busy || b[0][c]) return; put(c, 1); if (check(1)) return; busy = true; $s('c4m').textContent = 'آیزن فکر می‌کند…'; setTimeout(() => { const m = aiMove(); if (m >= 0) put(m, 2); busy = false; if (!check(2)) $s('c4m').textContent = 'نوبت توست'; }, 350); };
    reset(); return () => {};
  }

  /* ================= 9) ILLUSION SEQUENCE (Simon) ================= */
  function simon() {
    const PADS = [['鏡', '#a98bff', 261.6], ['花', '#ff6b9a', 329.6], ['水', '#5ad1ff', 392], ['月', '#ffd86b', 523.3]];
    let seq = [], idx = 0, playing = false, locked = true, to = [];
    stage.innerHTML = `<div class="g-head"><div><h3>🔮 توالی توهم</h3><p>الگوی نورها را ببین و دقیقاً تکرار کن. هر دور یک مرحله بلندتر و سریع‌تر می‌شود.</p></div><div class="g-stats">${stat('sRound', 'ROUND', 0)}${stat('sBest', 'BEST', getBest('sim') || '—')}</div></div><div class="simon" id="simon">${PADS.map((p, i) => `<button type="button" class="spad" data-i="${i}" style="--c:${p[1]}"><span>${p[0]}</span></button>`).join('')}</div><p class="g-msg" id="sMsg">برای شروع دکمه را بزن.</p><p style="text-align:center"><button class="g-btn" id="sStart">شروع</button></p>`;
    const pads = [...stage.querySelectorAll('.spad')];
    const light = (i, d = 320) => { pads[i].classList.add('lit'); tone(PADS[i][2], d / 1000, 'triangle', .14); setTimeout(() => pads[i].classList.remove('lit'), d); };
    const later = (f, ms) => { const t = setTimeout(f, ms); to.push(t); };
    const show = () => { locked = true; idx = 0; const sp = Math.max(260, 620 - seq.length * 25); $s('sMsg').textContent = 'ببین…'; seq.forEach((v, k) => later(() => light(v, sp * .7), 600 + k * sp)); later(() => { locked = false; $s('sMsg').textContent = 'حالا تو!'; }, 600 + seq.length * sp); };
    const next = () => { seq.push(Math.random() * 4 | 0); $s('sRound').textContent = seq.length; show(); };
    pads.forEach(p => p.onpointerdown = () => {
      if (locked || !playing) return; const i = +p.dataset.i; light(i, 220);
      if (i !== seq[idx]) { playing = false; locked = true; const r = seq.length - 1; const nb = r > 0 ? best('sim', r) : false; $s('sBest').textContent = getBest('sim') || '—'; $s('sMsg').innerHTML = `اشتباه! به دور ${r} رسیدی${nb ? ' — رکورد جدید 🏆' : ''} <span id="gReward" style="color:#ffd86b"></span>`; tone(110, .5, 'sawtooth', .2); return; }
      idx++; if (idx === seq.length) { locked = true; $s('sMsg').textContent = '✓'; later(next, 700); }
    });
    $s('sStart').onclick = () => { to.forEach(clearTimeout); to = []; seq = []; playing = true; $s('sRound').textContent = 0; next(); };
    return () => to.forEach(clearTimeout);
  }

  G.register('🔮', 'شکارچی ارواح', hunter, ['hunt', v => v / 12]);
  G.register('🥁', 'ریتم', rhythm, ['rhy', v => v / 60]);
  G.register('⛓', 'چهارتایی', connect4);
  G.register('🔮', 'توالی توهم', simon, ['sim', v => v * 12]);
})();
