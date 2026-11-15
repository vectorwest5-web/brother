/* EIZEN × MADARA — Arcade: 5 small games. Visuals are abstract (kanji, colours, shapes). */
(() => {
  'use strict';
  const stage = document.getElementById('gameStage'), tabs = document.getElementById('gameTabs');
  if (!stage || !tabs) return;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  };
  const REW = { mind: v => v / 25, bf: v => v * 1.5, met: v => v / 3, quiz: v => v * 18, ref: v => Math.max(5, (420 - v) / 8) };
  const best = (k, v, lowIsBetter) => {
    const o = +store.get('eizen-best-' + k, 0), nb = !o || (lowIsBetter ? v < o : v > o); if (nb) store.set('eizen-best-' + k, v);
    if (window.Prog) { Prog.played(k); const c = Prog.reward(REW[k] ? REW[k](v) : 0); if (c) { const m = document.getElementById('gReward'); if (m) m.textContent = `+${c} 🪙`; } }
    return nb;
  };
  const getBest = k => +store.get('eizen-best-' + k, 0);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const blip = (f = 600, d = .08, type = 'sine', vol = .15) => {
    try { const S = window.Snd; if (!S || !S.init()) return; const c = S.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(S.master); o.start(t); o.stop(t + d + .02); } catch (_) {}
  };
  const stat = (id, label, val) => `<div class="g-stat">${label}<b id="${id}">${val}</b></div>`;
  const $s = id => stage.querySelector('#' + id);

  /* ---------- 1) Mind Palace (illusion memory: levels, combos, swapping cards, peek) ---------- */
  function memory() {
    const SYM = ['鏡', '花', '水', '月', '藍', '染', '蝶', '霊', '崩', '玉', '虚', '刀', '夜', '炎', '星', '雷', '影', '氷'];
    const LV = [[4, 3, 60, 0], [4, 4, 75, 7], [5, 4, 90, 5], [6, 5, 130, 4], [6, 6, 170, 3]]; // cols, rows, seconds, swapEvery
    let lv = 0, total = 0, peeks = 2, run = null;
    const start = () => {
      const [cols, rows, secs, swapEvery] = LV[lv], pairs = cols * rows / 2, deck = shuffle([...SYM.slice(0, pairs), ...SYM.slice(0, pairs)]);
      let open = [], moves = 0, found = 0, combo = 0, left = secs, lock = false, ticking = null, over = false, sinceSwap = 0;
      stage.innerHTML = `<div class="g-head"><div><h3>🏯 کاخ ذهن · مرحله ${lv + 1}/${LV.length}</h3><p>جفت‌ها را پیدا کن. کومبو = امتیاز بیشتر. ${swapEvery ? `<b style="color:#a98bff">توهم کیوکا سویگتسو:</b> هر ${swapEvery} حرکت دو کارت جابه‌جا می‌شوند!` : 'مرحله‌ی گرم‌کردن، بدون توهم.'}</p></div><div class="g-stats">${stat('mScore', 'SCORE', total)}${stat('mCombo', 'COMBO', 'x1')}${stat('mTime', 'TIME', left)}${stat('mBest', 'BEST', getBest('mind') || '—')}</div></div><div class="mem-grid" style="grid-template-columns:repeat(${cols},1fr);max-width:${cols * 92}px">${deck.map(sym => `<button class="mcard" data-s="${sym}" aria-label="کارت"><span class="in"><span class="f"></span><span class="b">${sym}</span></span></button>`).join('')}</div><p class="g-msg" id="mMsg"></p><p style="text-align:center;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="g-btn" id="mPeek">👁 نگاه سریع (${peeks})</button><button class="g-btn" id="mReset" style="background:#ffffff14;color:#fff">از اول</button></p>`;
      const grid = stage.querySelector('.mem-grid'); let cards = [...grid.children];
      const setScore = v => { total = v; $s('mScore').textContent = Math.round(total); };
      const finish = won => { over = true; clearInterval(ticking); if (won) { const bonus = left * 5; setScore(total + bonus); blip(1100, .4, 'triangle'); const last = lv === LV.length - 1; const nb = last ? best('mind', Math.round(total)) : false; $s('mBest').textContent = getBest('mind') || '—'; $s('mMsg').innerHTML = `مرحله تمام شد! بونوس زمان +${bonus} ${last ? `<br>🏆 تمام مراحل! امتیاز نهایی ${Math.round(total)}${nb ? ' — رکورد جدید' : ''} <span id="gReward" style="color:#ffd86b"></span>` : ''}`; if (!last) { const b = document.createElement('button'); b.className = 'g-btn'; b.textContent = 'مرحله‌ی بعد ▶'; b.onclick = () => { lv++; start(); }; $s('mMsg').appendChild(document.createElement('br')); $s('mMsg').appendChild(b); } else { lv = 0; } }
        else { const nb = best('mind', Math.round(total)); $s('mBest').textContent = getBest('mind'); $s('mMsg').innerHTML = `زمان تمام شد! امتیاز: ${Math.round(total)}${nb ? ' — رکورد جدید 🏆' : ''} <span id="gReward" style="color:#ffd86b"></span>`; blip(120, .5, 'sawtooth'); lv = 0; total = 0; peeks = 2; } };
      const illusion = () => { // swap two face-down, unmatched cards with a FLIP animation
        const cand = cards.filter(c => !c.classList.contains('flip') && !c.classList.contains('ok')); if (cand.length < 2) return;
        const [a, b] = shuffle(cand), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), t = document.createElement('span');
        a.replaceWith(t); b.replaceWith(a); t.replaceWith(b); cards = [...grid.children];
        [[a, rb, ra], [b, ra, rb]].forEach(([el, from, to]) => { el.style.transition = 'none'; el.style.transform = `translate(${from.left - to.left}px,${from.top - to.top}px)`; void el.offsetWidth; el.style.transition = 'transform .55s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; el.classList.add('ill'); setTimeout(() => el.classList.remove('ill'), 600); });
        blip(1400, .25, 'triangle', .1); $s('mMsg').textContent = '🦋 توهم! دو کارت جابه‌جا شد…'; setTimeout(() => { if (!over) $s('mMsg').textContent = ''; }, 1500);
      };
      const clickCard = c => {
        if (lock || over || c.classList.contains('flip')) return;
        if (!ticking) ticking = setInterval(() => { left--; $s('mTime').textContent = left; if (left <= 0) finish(false); }, 1000);
        c.classList.add('flip'); open.push(c); blip(520 + open.length * 120, .06);
        if (open.length === 2) {
          moves++; sinceSwap++; const [a, b] = open;
          if (a.dataset.s === b.dataset.s) { a.classList.add('ok'); b.classList.add('ok'); open = []; found++; combo++; setScore(total + 100 * (1 + (combo - 1) * .5)); $s('mCombo').textContent = 'x' + combo; blip(660 + combo * 90, .18, 'triangle'); if (found === pairs) finish(true); }
          else { combo = 0; $s('mCombo').textContent = 'x1'; lock = true; setTimeout(() => { a.classList.remove('flip'); b.classList.remove('flip'); open = []; lock = false; if (swapEvery && sinceSwap >= swapEvery && !over) { sinceSwap = 0; illusion(); } }, 700); }
        }
      };
      grid.addEventListener('click', e => { const c = e.target.closest('.mcard'); if (c) clickCard(c); });
      $s('mPeek').onclick = () => { if (peeks <= 0 || lock || over) return; peeks--; $s('mPeek').textContent = `👁 نگاه سریع (${peeks})`; setScore(Math.max(0, total - 50)); lock = true; const hidden = cards.filter(c => !c.classList.contains('flip')); hidden.forEach(c => c.classList.add('flip')); setTimeout(() => { hidden.forEach(c => { if (!c.classList.contains('ok')) c.classList.remove('flip'); }); lock = false; }, 1300); blip(900, .15); };
      $s('mReset').onclick = () => { lv = 0; total = 0; peeks = 2; start(); };
      run = () => clearInterval(ticking);
    };
    start(); return () => run && run();
  }

  /* ---------- 2) Butterfly shatter (click real ones, avoid the mirror illusions) ---------- */
  function butterflies() {
    let score = 0, time = 30, running = false, spawn, clock, lifeMs = 1400;
    stage.innerHTML = `<div class="g-head"><div><h3>🦋 شکستن توهم</h3><p>پروانه‌ها را بزن (+1). آینه‌های توهم <b style="color:#ff4655">鏡</b> را نزن (−3)! ۳۰ ثانیه وقت داری.</p></div><div class="g-stats">${stat('bScore', 'SCORE', 0)}${stat('bTime', 'TIME', 30)}${stat('bBest', 'BEST', getBest('bf') || '—')}</div></div><div class="arena" id="arena"></div><p class="g-msg" id="bMsg">برای شروع دکمه را بزن.</p><p style="text-align:center"><button class="g-btn" id="bStart">شروع</button></p>`;
    const arena = $s('arena');
    const add = () => {
      if (!running) return; const bad = Math.random() < .26, el = document.createElement('button');
      el.className = 'tgt' + (bad ? ' bad' : ''); el.textContent = bad ? '鏡' : '🦋'; el.dataset.bad = bad ? 1 : 0;
      const r = arena.getBoundingClientRect(); el.style.left = rnd(40, r.width - 40) + 'px'; el.style.top = rnd(40, r.height - 40) + 'px';
      arena.appendChild(el); setTimeout(() => el.remove(), lifeMs);
      while (arena.children.length > 9) arena.firstChild.remove();
    };
    arena.addEventListener('pointerdown', e => {
      const el = e.target.closest('.tgt'); if (!el || !running || el.classList.contains('pop')) return;
      const bad = el.dataset.bad === '1'; score = Math.max(0, score + (bad ? -3 : 1)); $s('bScore').textContent = score; blip(bad ? 160 : 760, .1, bad ? 'sawtooth' : 'triangle');
      el.classList.add('pop'); setTimeout(() => el.remove(), 280);
    });
    $s('bStart').onclick = () => {
      stop(); arena.innerHTML = ''; score = 0; time = 30; lifeMs = 1400; running = true; $s('bScore').textContent = 0; $s('bTime').textContent = 30; $s('bMsg').textContent = '';
      const sp = () => { add(); lifeMs = Math.max(700, lifeMs - 12); spawn = setTimeout(sp, Math.max(330, 700 - (30 - time) * 12)); }; sp();
      clock = setInterval(() => { time--; $s('bTime').textContent = time; if (time <= 0) { stop(); running = false; arena.innerHTML = ''; const nb = best('bf', score); $s('bBest').textContent = getBest('bf'); $s('bMsg').textContent = `زمان تمام شد! امتیاز: ${score}${nb ? ' — رکورد جدید 🏆' : ''} <span id="gReward" style="color:#ffd86b"></span>`; $s('bMsg').innerHTML=$s('bMsg').textContent; blip(300, .5, 'triangle'); } }, 1000);
    };
    function stop() { clearTimeout(spawn); clearInterval(clock); running = false; }
    return stop;
  }

  /* ---------- 3) Meteor dodge (Tengai Shinsei) ---------- */
  function meteors() {
    stage.innerHTML = `<div class="g-head"><div><h3>☄ تنگای شینسی · فرار از شهاب‌سنگ</h3><p>با ماوس، لمس یا کلیدهای ◀ ▶ ▲ ▼ حرکت کن. حلقه‌ی آبی = سپر سوسانو (یک برخورد را تحمل می‌کند).</p></div><div class="g-stats">${stat('cScore', 'SCORE', 0)}${stat('cBest', 'BEST', getBest('met') || '—')}</div></div><canvas class="cv" id="cv" width="640" height="400"></canvas><p class="g-msg" id="cMsg">برای شروع روی صفحه کلیک کن.</p><p style="text-align:center"><button class="g-btn" id="cStart">شروع</button></p>`;
    const cv = $s('cv'), ctx = cv.getContext('2d'), W = 640, H = 400;
    let p, M, pick, score, alive = false, raf, last, spawnT, keys = {}, shield, target = null;
    const reset = () => { p = { x: W / 2, y: H - 50, r: 11 }; M = []; pick = []; score = 0; spawnT = 0; shield = false; target = null; };
    reset();
    const onKey = (e, v) => { if (e.key.startsWith('Arrow')) { keys[e.key] = v; if (alive) e.preventDefault(); } };
    const kd = e => onKey(e, true), ku = e => onKey(e, false); addEventListener('keydown', kd); addEventListener('keyup', ku);
    const pos = e => { const r = cv.getBoundingClientRect(); target = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    cv.addEventListener('pointermove', pos); cv.addEventListener('pointerdown', e => { pos(e); cv.setPointerCapture?.(e.pointerId); });
    const draw = () => {
      ctx.fillStyle = '#10050a'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, 380); g.addColorStop(0, '#6a0d1c88'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (const m of M) { ctx.strokeStyle = 'rgba(255,120,60,.35)'; ctx.lineWidth = m.r * .9; ctx.beginPath(); ctx.moveTo(m.x - m.vx * 6, m.y - m.vy * 6); ctx.lineTo(m.x, m.y); ctx.stroke(); const mg = ctx.createRadialGradient(m.x - m.r / 3, m.y - m.r / 3, 1, m.x, m.y, m.r); mg.addColorStop(0, '#ffe2a8'); mg.addColorStop(.5, '#ff6a2b'); mg.addColorStop(1, '#7a1209'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill(); }
      for (const q of pick) { ctx.strokeStyle = '#5ad1ff'; ctx.lineWidth = 3; ctx.shadowColor = '#5ad1ff'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(q.x, q.y, 11, 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0; }
      ctx.fillStyle = '#ff4655'; ctx.shadowColor = '#ff4655'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#10050a'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.283); ctx.fill();
      if (shield) { ctx.strokeStyle = '#5ad1ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 9, 0, 6.283); ctx.stroke(); }
    };
    const end = () => { alive = false; const s = Math.floor(score); const nb = best('met', s); $s('cBest').textContent = getBest('met'); $s('cMsg').textContent = `سقوط کردی! امتیاز: ${s}${nb ? ' — رکورد جدید 🏆' : ''}`; blip(120, .6, 'sawtooth', .25); };
    const step = now => {
      if (!alive) return; const dt = Math.min(40, now - last) / 16.7; last = now; score += dt * .16;
      const sp = 3.6 * dt; if (keys.ArrowLeft) p.x -= sp; if (keys.ArrowRight) p.x += sp; if (keys.ArrowUp) p.y -= sp; if (keys.ArrowDown) p.y += sp;
      if (target) { const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy); if (d > 1) { const s = Math.min(d, 7 * dt); p.x += dx / d * s; p.y += dy / d * s; } }
      p.x = Math.max(p.r, Math.min(W - p.r, p.x)); p.y = Math.max(p.r, Math.min(H - p.r, p.y));
      spawnT -= dt; if (spawnT <= 0) { const lvl = Math.min(score / 30, 5); spawnT = Math.max(7, 26 - lvl * 3.5); const r = rnd(9, 20 + lvl * 2); M.push({ x: rnd(0, W), y: -30, r, vx: rnd(-1.8, 1.8), vy: rnd(2.6, 4 + lvl * .7) }); if (Math.random() < .035 && !shield) pick.push({ x: rnd(30, W - 30), y: rnd(60, H - 30), t: 420 }); }
      for (let i = M.length - 1; i >= 0; i--) { const m = M[i]; m.x += m.vx * dt; m.y += m.vy * dt; if (m.y > H + 40 || m.x < -50 || m.x > W + 50) { M.splice(i, 1); continue; } if (Math.hypot(m.x - p.x, m.y - p.y) < m.r + p.r - 2) { if (shield) { shield = false; M.splice(i, 1); blip(300, .2, 'square'); } else { draw(); end(); return; } } }
      for (let i = pick.length - 1; i >= 0; i--) { const q = pick[i]; q.t -= dt; if (q.t <= 0) pick.splice(i, 1); else if (Math.hypot(q.x - p.x, q.y - p.y) < 22) { shield = true; pick.splice(i, 1); blip(900, .15, 'triangle'); } }
      $s('cScore').textContent = Math.floor(score); draw(); raf = requestAnimationFrame(step);
    };
    $s('cStart').onclick = () => { cancelAnimationFrame(raf); reset(); alive = true; $s('cMsg').textContent = ''; last = performance.now(); raf = requestAnimationFrame(step); };
    cv.addEventListener('click', () => { if (!alive && !score) $s('cStart').click(); });
    draw();
    return () => { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  }

  /* ---------- 4) Quiz ---------- */
  const QS = [
    ['BLEACH', 'نام زنبرکتوی آیزن چیست؟', ['کیوکا سویگتسو', 'سنبون‌زاکورا', 'ریوجین جاکا', 'زانگتسو'], 0],
    ['BLEACH', 'آیزن قبل از خیانت، سروان کدام سپاه بود؟', ['سپاه سوم', 'سپاه پنجم', 'سپاه نهم', 'سپاه دهم'], 1],
    ['BLEACH', 'قدرت اصلی کیوکا سویگتسو چیست؟', ['سرعت بی‌نهایت', 'هیپنوتیزم کامل', 'کنترل زمان', 'احیای مردگان'], 1],
    ['BLEACH', 'گوهری که آیزن به دنبال آن بود چه نام دارد؟', ['هوگیوکو', 'سوکیوکو', 'زانپاکتو', 'هالو‌مایند'], 0],
    ['BLEACH', 'پایگاه اصلی آیزن در هوئکو موندو چه نام داشت؟', ['سوکیوکو', 'لاس نوچس', 'سیرتی', 'مورناگا'], 1],
    ['BLEACH', 'ستوان سپاه پنجم که آیزن او را فریب داد کیست؟', ['مومو هیناموری', 'رانگیکو ماتسوموتو', 'اوریهیمه اینوئه', 'ریوکا'], 0],
    ['BLEACH', 'در نبرد نهایی، چه کسی آیزن را شکست داد؟', ['ایچیگو کوروساکی', 'بیاکویا کوچیکی', 'کنپاچی', 'اوراهارا'], 0],
    ['BLEACH', 'دو سروانی که همراه آیزن به هوئکو موندو رفتند چه کسانی بودند؟', ['گین ایچیمارو و کانامه توسن', 'رنجی و شونسوی', 'ایکاکو و یوروچی', 'هیتسوگایا و کیوراکو'], 0],
    ['NARUTO', 'مادارا اوچیها رقیب و دوست قدیمی چه کسی بود؟', ['هاشیراما سنجو', 'ایتاچی', 'ژیرایا', 'هیروزن'], 0],
    ['NARUTO', 'نبرد معروف مادارا و هاشیراما در کجا اتفاق افتاد؟', ['دره‌ی پایان', 'جنگل مرگ', 'دهکده‌ی ابر', 'جزیره‌ی مارپیچ'], 0],
    ['NARUTO', 'نقشه‌ی بزرگ مادارا چه نام داشت؟', ['تسوکویومی بی‌پایان', 'عملیات سایه', 'رسنگان ابدی', 'مهر چهارمین'], 0],
    ['NARUTO', 'فنی که مادارا با آن شهاب‌سنگ‌ها را فرود می‌آورد؟', ['تنگای شینسی', 'کاتون', 'چیدوری', 'کاماتاری'], 0],
    ['NARUTO', 'چه کسی مادارا را با «ادو تنسی» زنده کرد؟', ['کابوتو', 'اوروچیمارو', 'تانوکی', 'ساسوری'], 0],
    ['NARUTO', 'مادارا کدام چشم افسانه‌ای را بیدار کرد؟', ['رینه‌گان', 'بیاکوگان', 'تنسی‌گان', 'کتون‌گان'], 0]
  ];
  function quiz() {
    const set = shuffle(QS).slice(0, 8); let i = 0, ok = 0;
    const show = () => {
      if (i >= set.length) { const t = ok >= 7 ? 'سروان‌ سطح بالا 👑' : ok >= 5 ? 'بیدار شده‌ی طرفداران 🔥' : ok >= 3 ? 'تازه‌کار فریب‌خورده 🦋' : 'گرفتار توهم! 🌀'; const nb = best('quiz', ok); if (ok === set.length && window.Prog) Prog.unlock('quiz_perfect'); stage.innerHTML = `<div class="quiz"><div class="q-res"><p>نتیجه</p><h4>${ok} / ${set.length}</h4><p>${t}${nb ? ' — رکورد جدید 🏆' : ''}</p><p>رکورد: ${getBest('quiz')}</p><button class="g-btn" id="qAgain">بازی دوباره</button></div></div>`; $s('qAgain').onclick = quiz; return; }
      const q = set[i], opts = shuffle(q[2].map((t, k) => [t, k === q[3]]));
      stage.innerHTML = `<div class="quiz"><div class="q-prog"><i style="width:${i / set.length * 100}%"></i></div><div class="q-tag">${q[0]} · ${i + 1}/${set.length}</div><p class="q-text">${q[1]}</p><div class="q-opts">${opts.map((o, k) => `<button class="q-opt" data-k="${k}">${o[0]}</button>`).join('')}</div></div>`;
      stage.querySelectorAll('.q-opt').forEach(b => b.onclick = () => {
        const good = opts[b.dataset.k][1]; if (good) ok++; blip(good ? 800 : 180, .15, good ? 'triangle' : 'sawtooth');
        stage.querySelectorAll('.q-opt').forEach((x, k) => { x.disabled = true; if (opts[k][1]) x.classList.add('right'); }); if (!good) b.classList.add('wrong');
        setTimeout(() => { i++; show(); }, 950);
      });
    };
    show(); return () => {};
  }

  /* ---------- 5) Reflex duel ---------- */
  function reflex() {
    let state = 'idle', to, t0;
    stage.innerHTML = `<div class="g-head"><div><h3>⚡ دوئل واکنش</h3><p>صفحه که <b style="color:#ff6b76">قرمز</b> شد، سریع بزن! قبل از آن بزنی، باختی. چند بار تکرار کن تا رکوردت بهتر شود.</p></div><div class="g-stats">${stat('rLast', 'LAST', '—')}${stat('rBest', 'BEST', getBest('ref') ? getBest('ref') + 'ms' : '—')}</div></div><div class="reflex" id="rBox"><div><b>بزن تا شروع شود</b><span>آماده باش…</span></div></div><p class="g-msg" id="rMsg"></p>`;
    const box = $s('rBox'), set = (cls, h, s) => { box.className = 'reflex ' + cls; box.innerHTML = `<div><b>${h}</b><span>${s}</span></div>`; };
    box.onpointerdown = () => {
      if (state === 'idle') { state = 'wait'; set('wait', 'صبر کن…', 'منتظر رنگ قرمز'); to = setTimeout(() => { state = 'go'; t0 = performance.now(); set('go', 'حالا!', 'بزن بزن بزن'); blip(700, .1, 'square'); }, rnd(1500, 4200)); }
      else if (state === 'wait') { clearTimeout(to); state = 'idle'; set('early', 'زود بود!', 'دوباره بزن تا از نو شروع شود'); blip(150, .3, 'sawtooth'); }
      else if (state === 'go') {
        const ms = Math.round(performance.now() - t0); state = 'idle'; const nb = best('ref', ms, true);
        const rank = ms < 180 ? 'سرعت سروان‌ها! ⚡' : ms < 250 ? 'عالی 🔥' : ms < 350 ? 'خوب 👍' : 'می‌توانی بهتر باشی 🙂';
        $s('rLast').textContent = ms + 'ms'; $s('rBest').textContent = getBest('ref') + 'ms'; set('', ms + ' ms', rank + (nb ? ' — رکورد جدید 🏆' : '') + ' · دوباره بزن'); blip(950, .15, 'triangle');
      }
    };
    return () => clearTimeout(to);
  }

  /* ---------- Hub (extensible: games2.js registers more) ---------- */
  const games = [['memory', '鏡', 'کاخ ذهن', memory], ['bf', '蝶', 'پروانه‌ها', butterflies], ['meteor', '☄', 'شهاب‌سنگ', meteors], ['quiz', '？', 'کوییز', quiz], ['reflex', '⚡', 'واکنش', reflex]];
  let cleanup = () => {}, cur = -1;
  const build = () => { tabs.innerHTML = games.map((g, i) => `<button type="button" class="game-tab" role="tab" data-i="${i}"><b>${g[1]}</b>${g[2]}</button>`).join(''); if (cur >= 0) tabs.children[cur]?.classList.add('on'); };
  const open = i => { try { cleanup(); } catch (_) {} cur = i; [...tabs.children].forEach((b, k) => b.classList.toggle('on', k === i)); cleanup = games[i][3]() || (() => {}); };
  tabs.addEventListener('click', e => { const b = e.target.closest('.game-tab'); if (b) open(+b.dataset.i); });
  window.GH = { stage, store, best, getBest, rnd, shuffle, blip, stat, $s, REW, games, build, open, register(icon, label, fn, rew) { games.push([label, icon, label, fn]); if (rew) REW[rew[0]] = rew[1]; build(); } };
  build();
  const mount = () => { if (cur < 0) open(0); };
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { mount(); io.disconnect(); } }, { rootMargin: '200px' }); io.observe(stage); } else mount();
})();
