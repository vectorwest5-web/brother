/* EIZEN Lab: 5 interactive tools about Aizen & Madara (all original text / abstract visuals). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), stage = $('labStage'), tabs = $('labTabs'); if (!stage || !tabs) return;
  const { store, toast } = window.EZ;
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.random() * a.length | 0];
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const once = (k, coins, xp) => { if (store.get('eizen-once-' + k, '')) return 0; store.set('eizen-once-' + k, '1'); window.Prog && (Prog.addCoins(coins), Prog.addXp(xp || coins * 2)); toast(`+${coins} 🪙`); return coins; };
  const hash = s => { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }; };
  const rng = seed => { let a = seed(); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const head = (t, d) => `<div class="g-head"><div><h3>${t}</h3><p>${d}</p></div></div>`;
  const snd = (f, d = .15, t = 'triangle', v = .12) => { try { const S = window.Snd; if (S && S.init()) S.tone(f, S.ctx.currentTime, d, t, v, 1); } catch (_) {} };

  /* ===== 1) personality test ===== */
  const PQ = [
    ['وقتی کسی نقشه‌ی بدی برای گروه می‌کشد، چه می‌کنی؟', [['آرام می‌مانم و می‌گذارم خودش اشتباهش را ببیند', 3, 0], ['همان لحظه مقابلش می‌ایستم', 0, 3], ['بی‌سروصدا نقشه‌ی بهتری می‌ریزم و جایگزینش می‌کنم', 3, 1], ['اگر لازم باشد خودم رهبری را می‌گیرم', 1, 3]]],
    ['قدرت برایت یعنی…', [['اطلاعاتی که دیگران ندارند', 3, 0], ['توانایی‌ای که هیچ‌کس نتواند جلویش بایستد', 0, 3], ['کنترل صحنه بدون اینکه کسی بفهمد', 3, 0], ['وسیله‌ای برای ساختن دنیای دلخواه', 1, 3]]],
    ['ایده‌آل‌ترین شب برای تو؟', [['کتابخانه‌ی ساکت و یک فنجان چای', 3, 0], ['زیر ماه کامل، روی بلندی، با فکر آینده', 1, 3], ['یک شطرنج طولانی با رقیب باهوش', 3, 1], ['دور آتش با همرزم‌های قدیمی', 0, 3]]],
    ['بزرگ‌ترین ترست؟', [['اینکه کسی بتواند مرا بخواند', 3, 0], ['اینکه رؤیایم هیچ‌وقت محقق نشود', 0, 3], ['اینکه کنترل از دستم برود', 3, 1], ['اینکه دوباره عزیزی را از دست بدهم', 0, 3]]],
    ['سبک صحبت کردنت؟', [['مؤدب، آرام و با لبخند', 3, 0], ['مستقیم، سنگین و بی‌پرده', 0, 3], ['هر کلمه حساب‌شده', 3, 1], ['کم‌حرف ولی کلام آخر با من', 1, 3]]],
    ['شکست خوردی. بعدش؟', [['ببینم کدام قسمت از نقشه عمداً به‌هم ریخت…', 3, 0], ['قوی‌تر برمی‌گردم، تا وقتی که ببرم', 0, 3], ['به‌روز‌رسانی استراتژی، بی‌احساس', 3, 1], ['یک بار دیگر با تمام قدرت', 1, 3]]],
    ['کدام صحنه جذاب‌تر است؟', [['فریبی که تا آخر کسی نفهمید', 3, 0], ['نبردی که زمین را عوض کرد', 0, 3], ['یک مکالمه‌ی دونفره‌ی تهدیدآمیز', 3, 1], ['بارش شهاب‌سنگ از آسمان', 0, 3]]],
    ['اگر قدرت مطلق داشتی، اول چه می‌کردی؟', [['بالای همه می‌ایستادم و تماشا می‌کردم', 3, 0], ['جنگ را برای همیشه تمام می‌کردم', 0, 3], ['قوانین دنیا را بازنویسی می‌کردم', 2, 2], ['همه را به رؤیایی آرام می‌بردم', 0, 3]]]
  ];
  function persona() {
    let i = 0, a = 0, m = 0;
    const ask = () => {
      if (i >= PQ.length) { const tot = a + m, pa = Math.round(a / tot * 100), pm = 100 - pa, aw = pa >= 50, mix = Math.abs(pa - 50) <= 8;
        const res = mix ? ['دو‌رگه‌ی افسانه‌ای', 'تو تقریباً مساوی بین آیزن و مادارایی: ذهن شطرنج‌باز آیزن و اراده‌ی آهنین مادارا. خطرناک‌ترین ترکیب!'] : aw ? ['تو آیزنی ✦', 'آرام، صبور و چند قدم جلوتر از همه. دوست داری کنترل داشته باشی و ترجیح می‌دهی دیگران ندانند در ذهنت چه می‌گذرد.'] : ['تو مادارایی ☄', 'اراده‌ی آهنین، رؤیای بزرگ و وفاداری شدید به چیزی که باور داری. وقتی تصمیم بگیری، هیچ‌چیز جلودارت نیست.'];
        once('persona', 50);
        stage.innerHTML = `<div class="persona-res ${aw ? 'a' : 'm'}"><div class="bars"><div><b>آیزن ${pa}٪</b><i><u style="width:${pa}%;background:var(--aizen)"></u></i></div><div><b>مادارا ${pm}٪</b><i><u style="width:${pm}%;background:var(--madara)"></u></i></div></div><h3>${res[0]}</h3><p>${res[1]}</p><div class="d-btns"><button class="g-btn" id="pTheme">فعال‌کردن تم من</button><button class="g-btn alt" id="pCopy">کپی نتیجه</button><button class="g-btn alt" id="pAgain">از اول</button></div></div>`;
        $('pTheme').onclick = () => window.setTheme && setTheme(aw ? 'aizen' : 'madara', true); $('pCopy').onclick = () => { navigator.clipboard?.writeText(`${res[0]} — آیزن ${pa}٪ / مادارا ${pm}٪`); toast('کپی شد'); }; $('pAgain').onclick = persona; if (window.blast) { Snd.init(); aw ? Snd.glass() : Snd.madara(); } return; }
      const q = PQ[i]; stage.innerHTML = `${head('شخصیت‌سنج: آیزن یا مادارا؟', 'بدون فکر زیاد جواب بده؛ اولین حس.')}<div class="quiz"><div class="q-prog"><i style="width:${i / PQ.length * 100}%"></i></div><div class="q-tag">${i + 1}/${PQ.length}</div><p class="q-text">${q[0]}</p><div class="q-opts">${q[1].map((o, k) => `<button class="q-opt" data-k="${k}">${o[0]}</button>`).join('')}</div></div>`;
      stage.querySelector('.q-opts').onclick = e => { const b = e.target.closest('.q-opt'); if (!b) return; const o = q[1][b.dataset.k]; a += o[1]; m += o[2]; i++; snd(520 + i * 60); ask(); };
    };
    ask(); return () => {};
  }

  /* ===== 2) Zanpakutō & Jutsu forge ===== */
  const EL = [['آینه', '#a98bff', 'Kagami'], ['شعله', '#ff5a3c', 'Hono'], ['مه', '#9fd6ff', 'Kiri'], ['رعد', '#ffe46b', 'Ikazuchi'], ['ماه', '#e7e3ff', 'Tsuki'], ['سایه', '#8a6cff', 'Kage'], ['شهاب', '#ff9d4a', 'Ryūsei'], ['یخ', '#7fe9ff', 'Kōri'], ['گل', '#ff8cc6', 'Hana'], ['باد', '#7affc2', 'Kaze']];
  const SUF = ['-maru', ' no Tsurugi', '-ryū', '-sei', '-gami', ' Zan', '-hime', ' Kokuin'];
  const EFF = ['هر چیزی را که لمس کند به سراب تبدیل می‌کند', 'ضربه‌هایش از چند جهت هم‌زمان فرود می‌آیند', 'میدان نبرد را در سکوتی سنگین فرو می‌برد', 'زخم‌هایش دیر ولی عمیق ظاهر می‌شوند', 'حریف را به رؤیایی شیرین‌تر از واقعیت می‌کشاند', 'با هر نفس قدرتش دو برابر می‌شود', 'سایه‌ی حریف را علیه خودش می‌شوراند', 'آسمان را بر سر دشمن خراب می‌کند'];
  const CMD = ['از خواب برخیز', 'بتاب تا آخرین نفس', 'جهان را بشکاف', 'بر سایه‌ها فرمان بران', 'سکوت را بشکن', 'بیدار شو و ببار'];
  const JUT = ['ریزش', 'رقص', 'حصار', 'نبض', 'فریاد', 'هجوم'];
  function forge() {
    const hist = (() => { try { return JSON.parse(store.get('eizen-forge', '[]')); } catch (_) { return []; } })();
    stage.innerHTML = `${head('کوره‌ی شمشیر و جوتسو', 'اسمت را بنویس تا شمشیر روح و فن اختصاصی‌ات از دل کوره بیرون بیاید. هر اسم همیشه همان نتیجه را می‌دهد.')}<div class="forge"><div class="forge-in"><input id="fName" maxlength="24" placeholder="اسم تو…"><button class="g-btn" id="fGo">🔥 ساخت</button></div><div id="fOut" class="forge-out"></div><h4>ساخته‌های قبلی</h4><div class="forge-hist" id="fHist"></div></div>`;
    const show = (name, anim) => {
      const R = rng(hash(name.toLowerCase())), el = EL[R() * EL.length | 0], el2 = EL[R() * EL.length | 0], sw = el[2] + SUF[R() * SUF.length | 0], cmd = CMD[R() * CMD.length | 0], eff = EFF[R() * EFF.length | 0], jut = `${el2[0]}‌ی ${pick(['شبانه', 'خاموش', 'بی‌پایان', 'سرخ', 'نقره‌ای'].sort(() => R() - .5))} — ${JUT[R() * JUT.length | 0]}`;
      const st = [['قدرت', 45 + R() * 55], ['سرعت', 45 + R() * 55], ['توهم', 35 + R() * 65], ['دفاع', 40 + R() * 60], ['اراده', 50 + R() * 50]].map(s => [s[0], Math.round(s[1])]), tot = st.reduce((a, s) => a + s[1], 0), rank = tot > 400 ? 'SSS' : tot > 365 ? 'SS' : tot > 330 ? 'S' : tot > 295 ? 'A' : 'B';
      $('fOut').innerHTML = `<div class="forge-card ${anim ? 'pop' : ''}" style="--fc:${el[1]};--fc2:${el2[1]}"><svg viewBox="0 0 120 420" class="blade" aria-hidden="true"><defs><linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="${el[1]}"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><polygon points="60,6 76,30 72,300 48,300 44,30" fill="url(#bg)"/><rect x="30" y="300" width="60" height="9" rx="3" fill="#2a2433"/><rect x="52" y="309" width="16" height="84" fill="#1c1626"/><rect x="52" y="320" width="16" height="4" fill="${el2[1]}"/><rect x="52" y="340" width="16" height="4" fill="${el2[1]}"/><rect x="52" y="360" width="16" height="4" fill="${el2[1]}"/></svg><div class="fc-info"><p class="overline">ZANPAKUTŌ · ${rank}</p><h3>${esc(name)}</h3><div class="fc-name">${esc(sw)}</div><p class="fc-cmd">«${cmd}، ${esc(sw.trim())}!»</p><p><b>عنصر:</b> ${el[0]} + ${el2[0]}</p><p><b>توانایی:</b> ${eff}.</p><p><b>جوتسو:</b> ${jut}</p><div class="fc-stats">${st.map(s => `<div><span>${s[0]}</span><i><u style="width:${s[1]}%"></u></i><b>${s[1]}</b></div>`).join('')}</div><div class="d-btns"><button class="g-btn sm alt" id="fCopy">کپی</button></div></div></div>`;
      $('fCopy').onclick = () => { navigator.clipboard?.writeText(`${name} — ${sw} (${rank})\n«${cmd}، ${sw.trim()}!»\n${eff}.\nجوتسو: ${jut}`); toast('کپی شد'); }; return { name, sw, rank };
    };
    const hh = () => { $('fHist').innerHTML = hist.map(h => `<button class="chip" data-n="${esc(h.name)}">${esc(h.name)} · ${esc(h.sw)} · ${h.rank}</button>`).join('') || '<span class="muted">هنوز چیزی نساخته‌ای.</span>'; };
    $('fHist').onclick = e => { const b = e.target.closest('.chip'); if (b) { $('fName').value = b.dataset.n; show(b.dataset.n, true); } };
    $('fGo').onclick = () => { const n = $('fName').value.trim(); if (!n) { $('fName').focus(); return; } try { Snd.init(); Snd.taiko(Snd.ctx.currentTime, .9, 1); Snd.chime(); } catch (_) {} const r = show(n, true); if (!hist.some(h => h.name === n)) { hist.unshift(r); hist.length = Math.min(hist.length, 10); store.set('eizen-forge', JSON.stringify(hist.filter(Boolean))); } hh(); once('forge', 25); window.blast && Math.random() < .25 && blast(); };
    $('fName').onkeydown = e => { if (e.key === 'Enter') $('fGo').click(); }; hh(); return () => {};
  }

  /* ===== 3) Aizen's grand plan (reveal board) ===== */
  const PLAN = [
    ['۱', 'مرگ نمایشی', 'همه فکر می‌کردند سروان آیزن به قتل رسیده و جسدش پیدا شده است.', 'او زنده بود و صحنه‌ی مرگ را با کیوکا سویگتسو ساخته بود تا بی‌دردسر حرکت کند.'],
    ['۲', 'گوهر پنهان', 'هوگیوکو ظاهراً نابود شده یا فراموش‌شده بود.', 'آیزن می‌دانست گوهر در جایی پنهان است و نقشه‌اش را حول بازیابی آن چیده بود.'],
    ['۳', 'خیانت سه‌نفره', 'رفتن چند نفر از سروان‌ها از سوسایتی غافل‌گیری ناگهانی بود.', 'آیزن، گین و توسن از مدت‌ها قبل هماهنگ بودند؛ هر کدام نقش خودش را بازی می‌کرد.'],
    ['۴', 'ارتش آرانکار', 'هالوها فقط هیولاهای بی‌هدف بودند.', 'او با هوگیوکو مرز هالو و شینیگامی را شکست و ارتشی تازه ساخت.'],
    ['۵', 'جنگ شهر ساختگی', 'همه‌ی توجه‌ها به نبرد در شهر بود.', 'نبرد خودش بخشی از طرح بود؛ حواس‌پرتی بزرگ برای رسیدن به هدف اصلی.'],
    ['۶', 'فراتر از مرز', 'او را قدرتمندترین سروان می‌دانستند.', 'با هوگیوکو پا را فراتر گذاشت و دیگر در هیچ دسته‌بندی قدیمی نمی‌گنجید.'],
    ['۷', 'غروبِ آیزن', 'نبرد پایانی ایچیگو به‌نظر عجیب و غیرممکن بود.', 'حتی بزرگ‌ترین نقشه‌ها هم یک نقطه‌ی کور دارند: کسی که حسابش نکرده‌ای.'],
    ['۸', 'درس نهایی', 'پایان یعنی شکست.', 'آیزن نشان داد فریب فقط وقتی موفق است که قربانی شروعش را نبیند — و شکستش هم حساب‌وکتاب داشت.']
  ];
  function plan() {
    const seen = new Set(); let cur = 0;
    stage.innerHTML = `${head('نقشه‌ی بزرگ آیزن', 'هر مهره‌ی صفحه‌ی شطرنج را باز کن: «آنچه همه فکر می‌کردند» در برابر «حقیقت». (تحلیل هواداری، نه متن رسمی)')}<div class="plan"><div class="plan-track" id="pTrack">${PLAN.map((p, i) => `<button class="pn" data-i="${i}"><b>${p[0]}</b><span>${p[1]}</span></button>`).join('')}</div><div class="plan-card" id="pCard"></div><p class="g-msg" id="pMsg"></p></div>`;
    const show = i => { cur = i; seen.add(i); const p = PLAN[i]; [...$('pTrack').children].forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', seen.has(k)); }); $('pCard').innerHTML = `<div class="pc-a"><small>آنچه همه فکر می‌کردند</small><p>${p[2]}</p></div><div class="pc-sep">♟</div><div class="pc-b"><small>حقیقت</small><p>${p[3]}</p></div>`; $('pCard').classList.remove('flip'); void $('pCard').offsetWidth; $('pCard').classList.add('flip'); snd(300 + i * 70, .2, 'sine', .1); $('pMsg').textContent = `${seen.size}/${PLAN.length} مهره باز شد`; if (seen.size === PLAN.length) { once('plan', 80); $('pMsg').textContent = '♟ کل نقشه را دیدی! +۸۰ 🪙 (بار اول)'; } };
    $('pTrack').onclick = e => { const b = e.target.closest('.pn'); if (b) show(+b.dataset.i); }; show(0); return () => {};
  }

  /* ===== 4) Moon room (Infinite Tsukuyomi dream) ===== */
  function moon() {
    stage.innerHTML = `${head('اتاق ماه · رؤیای بی‌پایان', 'آرزویت را بنویس؛ در آسمان سرخ بالا می‌رود. (فقط برای هوای فضا — هیچ‌چیز ارسال نمی‌شود)')}<div class="moon-wrap"><canvas id="mCv" width="960" height="460"></canvas></div><div class="forge-in"><input id="mWish" maxlength="48" placeholder="آرزوی تو…"><button class="g-btn" id="mAdd">☾ بفرست به ماه</button><button class="g-btn alt" id="mWake">بیدار شدن</button></div>`;
    const cv = $('mCv'), x = cv.getContext('2d'), W = 960, H = 460; let wishes = (() => { try { return JSON.parse(store.get('eizen-wishes', '[]')) } catch (_) { return []; } })().slice(-12).map(t => ({ t, x: rnd(80, W - 80), y: rnd(100, H - 40), v: rnd(.12, .35), ph: rnd(0, 6) })), dust = Array.from({ length: 50 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(.5, 2), v: rnd(.1, .5) })), raf, flash = 0, t0 = performance.now(), run = true;
    const frame = now => {
      if (!run) return; const t = (now - t0) / 1000;
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0208'); g.addColorStop(1, '#4d0a14'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      const mg = x.createRadialGradient(W / 2, 150, 20, W / 2, 150, 220); mg.addColorStop(0, '#ffd9c8'); mg.addColorStop(.25, '#ff6b5e'); mg.addColorStop(.55, '#b3122b55'); mg.addColorStop(1, 'transparent'); x.fillStyle = mg; x.fillRect(0, 0, W, H);
      x.beginPath(); x.arc(W / 2, 150, 78, 0, 6.283); x.fillStyle = '#ffe9de'; x.fill();
      x.globalAlpha = .12; x.fillStyle = '#b3122b'; [[-24, -14, 18], [20, 10, 26], [-6, 34, 12], [30, -30, 10]].forEach(c => { x.beginPath(); x.arc(W / 2 + c[0], 150 + c[1], c[2], 0, 6.283); x.fill(); }); x.globalAlpha = 1;
      for (let r = 0; r < 4; r++) { const rr = 100 + ((t * 28 + r * 60) % 240); x.strokeStyle = `rgba(255,120,110,${.28 * (1 - (rr - 100) / 240)})`; x.lineWidth = 1.5; x.beginPath(); x.arc(W / 2, 150, rr, 0, 6.283); x.stroke(); }
      for (const d of dust) { d.y -= d.v; if (d.y < -4) { d.y = H + 4; d.x = rnd(0, W); } x.fillStyle = 'rgba(255,200,180,.45)'; x.fillRect(d.x, d.y, d.s, d.s); }
      x.font = '600 17px Vazirmatn,sans-serif'; x.textAlign = 'center';
      for (const w of wishes) { w.y -= w.v; w.x += Math.sin(t + w.ph) * .35; if (w.y < 40) w.y = H + 20; const a = Math.min(1, (w.y - 20) / 90, (H - w.y) / 60 + .4); x.fillStyle = `rgba(255,236,226,${Math.max(.15, a)})`; x.shadowColor = '#ff4655'; x.shadowBlur = 12; x.fillText('✦ ' + w.t, w.x, w.y); x.shadowBlur = 0; }
      if (flash > 0) { x.fillStyle = `rgba(255,255,255,${flash})`; x.fillRect(0, 0, W, H); flash -= .03; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const add = () => { const v = $('mWish').value.trim(); if (!v) return; wishes.push({ t: v, x: rnd(120, W - 120), y: H, v: rnd(.15, .4), ph: rnd(0, 6) }); wishes = wishes.slice(-16); store.set('eizen-wishes', JSON.stringify(wishes.map(w => w.t))); $('mWish').value = ''; try { Snd.init(); Snd.choirChord(Snd.ctx.currentTime, [220, 277, 330], 2.5, .07); } catch (_) {} once('moon', 15); };
    $('mAdd').onclick = add; $('mWish').onkeydown = e => { if (e.key === 'Enter') add(); };
    $('mWake').onclick = () => { flash = 1; wishes = []; store.set('eizen-wishes', '[]'); try { Snd.init(); Snd.boom(); } catch (_) {} };
    return () => { run = false; cancelAnimationFrame(raf); };
  }

  /* ===== 5) wallpaper maker ===== */
  const WP = { aizen: { bg: ['#120a2e', '#2b1670', '#07040f'], c: '#a98bff', k: '藍染', k2: 'AIZEN' }, madara: { bg: ['#1c0208', '#6a0d1c', '#080205'], c: '#ff4655', k: 'マダラ', k2: 'MADARA' }, halloween: { bg: ['#12071f', '#4a1568', '#06030b'], c: '#ff7a1a', k: '魔', k2: 'HALLOWEEN' }, gold: { bg: ['#14110c', '#3a2f1c', '#070604'], c: '#e6cf9d', k: '永', k2: 'ETERNAL' } };
  function wing(x, c, s) { for (const sx of [-1, 1]) { x.save(); x.scale(sx, 1); const g = x.createLinearGradient(0, 0, 90 * s, 0); g.addColorStop(0, '#fff'); g.addColorStop(.25, c); g.addColorStop(1, c + '33'); x.fillStyle = g; x.shadowColor = c; x.shadowBlur = 22 * s; x.beginPath(); x.moveTo(4 * s, 0); x.bezierCurveTo(30 * s, -70 * s, 100 * s, -60 * s, 92 * s, -14 * s); x.bezierCurveTo(88 * s, 8 * s, 40 * s, 10 * s, 4 * s, 0); x.fill(); x.beginPath(); x.moveTo(4 * s, 4 * s); x.bezierCurveTo(60 * s, 10 * s, 70 * s, 60 * s, 34 * s, 54 * s); x.bezierCurveTo(10 * s, 48 * s, 4 * s, 30 * s, 4 * s, 4 * s); x.fill(); x.restore(); } x.shadowBlur = 0; x.fillStyle = '#fff'; x.fillRect(-1.5 * s, -8 * s, 3 * s, 40 * s); }
  function wall() {
    let theme = store.get('eizen-theme', 'aizen'); if (!WP[theme]) theme = 'aizen';
    stage.innerHTML = `${head('والپیپرساز', 'اسم و جمله‌ات را بنویس، رنگ و اندازه را انتخاب کن و تصویر را دانلود کن.')}<div class="wall"><div class="wall-ctl"><label>تم</label><select id="wT">${Object.keys(WP).map(k => `<option value="${k}" ${k === theme ? 'selected' : ''}>${k}</option>`).join('')}</select><label>اندازه</label><select id="wS"><option value="1080x1920">موبایل (۱۰۸۰×۱۹۲۰)</option><option value="1920x1080">دسکتاپ (۱۹۲۰×۱۰۸۰)</option></select><label>متن اصلی</label><input id="wN" maxlength="24" value="EIZEN"><label>جمله</label><input id="wL" maxlength="48" value="یک جهان کوچک، فقط برای تو"><button class="g-btn" id="wD">⬇ دانلود PNG</button></div><canvas id="wCv" class="wall-cv"></canvas></div>`;
    const cv = $('wCv'), draw = () => {
      const [w, h] = $('wS').value.split('x').map(Number), P = WP[$('wT').value], x = cv.getContext('2d'); cv.width = w; cv.height = h; const R = rng(hash($('wT').value + $('wN').value));
      const g = x.createLinearGradient(0, 0, w * .3, h); g.addColorStop(0, P.bg[0]); g.addColorStop(.55, P.bg[1]); g.addColorStop(1, P.bg[2]); x.fillStyle = g; x.fillRect(0, 0, w, h);
      const m = Math.min(w, h), mg = x.createRadialGradient(w * .5, h * .34, 0, w * .5, h * .34, m * .6); mg.addColorStop(0, P.c + 'aa'); mg.addColorStop(1, 'transparent'); x.fillStyle = mg; x.fillRect(0, 0, w, h);
      x.font = `700 ${m * .75}px "Noto Serif JP",serif`; x.textAlign = 'center'; x.fillStyle = P.c + '22'; x.fillText(P.k, w / 2, h * .5 + m * .25);
      x.beginPath(); x.arc(w * .5, h * .3, m * .13, 0, 6.283); x.fillStyle = $('wT').value === 'madara' ? '#ffd9cc' : '#f4efe4'; x.shadowColor = P.c; x.shadowBlur = m * .08; x.fill(); x.shadowBlur = 0;
      const t = $('wT').value; for (let i = 0; i < 26; i++) { const px = R() * w, py = R() * h, s = .3 + R() * .8; if (t === 'aizen') { x.save(); x.translate(px, py); x.rotate((R() - .5) * 1.2); x.globalAlpha = .45 + R() * .5; wing(x, P.c, s * m / 1000); x.restore(); } else { x.globalAlpha = .3 + R() * .6; x.fillStyle = P.c; x.shadowColor = P.c; x.shadowBlur = 14; x.beginPath(); x.arc(px, py, 2 + R() * 5 * s, 0, 6.283); x.fill(); x.shadowBlur = 0; } } x.globalAlpha = 1;
      const vg = x.createRadialGradient(w / 2, h / 2, m * .3, w / 2, h / 2, Math.max(w, h) * .75); vg.addColorStop(0, 'transparent'); vg.addColorStop(1, '#000c'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
      x.textAlign = 'center'; x.fillStyle = '#fff'; x.shadowColor = P.c; x.shadowBlur = m * .03; x.font = `700 ${m * .1}px Cinzel,"Times New Roman",serif`; x.fillText($('wN').value, w / 2, h * .74); x.shadowBlur = 0; x.font = `400 ${m * .036}px Vazirmatn,sans-serif`; x.fillStyle = '#e8e2f2'; x.fillText($('wL').value, w / 2, h * .79); x.font = `400 ${m * .022}px Cinzel,serif`; x.fillStyle = P.c; x.fillText(P.k2 + ' · ' + P.k, w / 2, h * .93);
    };
    stage.querySelector('.wall-ctl').addEventListener('input', draw); $('wD').onclick = () => { cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `eizen-${$('wT').value}.png`; a.click(); once('wall', 20); }); }; draw(); return () => {};
  }

  const tools = [['🎭', 'شخصیت‌سنج', persona], ['⚔', 'کوره‌ی شمشیر', forge], ['♟', 'نقشه‌ی آیزن', plan], ['🌕', 'اتاق ماه', moon], ['🖼', 'والپیپرساز', wall]];
  let cleanup = () => {}, cur = -1;
  tabs.innerHTML = tools.map((g, i) => `<button type="button" class="game-tab" data-i="${i}"><b>${g[0]}</b>${g[1]}</button>`).join('');
  const open = i => { try { cleanup(); } catch (_) {} cur = i; [...tabs.children].forEach((b, k) => b.classList.toggle('on', k === i)); cleanup = tools[i][2]() || (() => {}); };
  tabs.addEventListener('click', e => { const b = e.target.closest('.game-tab'); if (b) open(+b.dataset.i); });
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { if (cur < 0) open(0); io.disconnect(); } }, { rootMargin: '200px' }); io.observe(stage); } else open(0);
})();
