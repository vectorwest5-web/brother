/* EIZEN Vault v2 — YOUR cards. No built-in characters: the site owner adds cards (photo + power stats + skill),
   visitors collect them via packs, level them, duel with them and play "guess the card". Cards are stored on the server. */
(() => {
  'use strict';
  const { $, store, toast } = window.EZ, Prog = window.Prog, Snd = window.Snd;
  const root = $('cardsApp'); if (!root) return;
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.random() * a.length | 0], shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const RAR = { N: { c: '#9aa3b2', w: 46, v: 20, lo: 25, hi: 55 }, R: { c: '#5ab0ff', w: 30, v: 50, lo: 40, hi: 70 }, SR: { c: '#b57cff', w: 16, v: 120, lo: 55, hi: 85 }, SSR: { c: '#ffb347', w: 6, v: 300, lo: 70, hi: 95 }, UR: { c: '#ff4d6d', w: 2, v: 800, lo: 85, hi: 100 } };
  const RK = Object.keys(RAR), STATS = [['atk', '⚔', 'حمله'], ['def', '🛡', 'دفاع'], ['spd', '⚡', 'سرعت'], ['mag', '✨', 'جادو']];
  let cards = [], S; const loadS = () => { try { S = JSON.parse(store.get('eizen-vault2', 'null')) } catch (_) { S = null; } S = Object.assign({ owned: {}, pity: 0, daily: 0, team: [], wins: 0, stage: 1, pulls: 0 }, S || {}); };
  loadS(); const save = () => store.set('eizen-vault2', JSON.stringify(S));
  const byId = id => cards.find(c => c.id === id), lvOf = id => S.owned[id]?.lv || 1;
  const val = (c, k) => Math.round(c[k] * (1 + (lvOf(c.id) - 1) * .06)), power = c => STATS.reduce((a, s) => a + val(c, s[0]), 0);
  const give = id => { const o = S.owned[id]; if (o) { o.n++; if (o.lv < 10) { o.lv++; return 'lv'; } Prog.addCoins(RAR[byId(id).rar].v / 2); return 'coin'; } S.owned[id] = { n: 1, lv: 1, fav: 0 }; return 'new'; };
  const distinct = () => Object.keys(S.owned).filter(id => byId(id)).length;
  const api = async (m, b) => { const r = await fetch('/api/cards', { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); const d = await r.json(); if (!r.ok) throw Error(d.error || 'خطا'); return d; };
  const reload = async () => { try { cards = (await api('GET')).cards || []; } catch (_) { cards = []; } };

  /* ---------- card face ---------- */
  const cardHTML = (c, o = {}) => { const own = S.owned[c.id], lock = o.lock && !own, r = RAR[c.rar];
    return `<div class="vc r-${c.rar} ${lock ? 'lock' : ''} ${o.cls || ''}" data-id="${c.id}" tabindex="0" style="--rc:${r.c}"><div class="vc-art">${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.name)}" loading="lazy" draggable="false">` : '<div class="vc-ph"><b>＋</b><span>عکس نداره</span></div>'}</div><div class="vc-foil"></div><span class="vc-rar">${c.rar}</span>${own ? `<span class="vc-lv">Lv.${own.lv}</span>` : ''}${own?.fav ? '<span class="vc-fav">★</span>' : ''}<div class="vc-info"><h4>${esc(c.name)}</h4><p>${esc(c.series)}</p><div class="vc-stats">${STATS.map(s => `<span title="${s[2]}">${s[1]}${val(c, s[0])}</span>`).join('')}</div></div></div>`; };

  /* ---------- shell ---------- */
  const TABS = [['pack', '🎴', 'بسته‌گشایی'], ['coll', '📚', 'مجموعه'], ['battle', '⚔️', 'دوئل کارتی'], ['guess', '🧩', 'حدس کارت'], ['maker', '🛠', 'مدیریت کارت‌ها'], ['data', '💾', 'پشتیبان']];
  root.innerHTML = `<div class="vault-bar"><div class="vault-tabs" id="vTabs">${TABS.map(t => `<button type="button" data-t="${t[0]}"><b>${t[1]}</b>${t[2]}</button>`).join('')}</div><div class="vault-wallet"><span>🪙 <b id="vCoin">0</b></span><span title="ضمانت SSR+">🎯 <b id="vPity">0</b>/30</span><button type="button" id="vDaily" class="g-btn sm">🎁</button></div></div><div id="vBody"></div><div id="vModal" hidden></div>`;
  const body = $('vBody'), modal = $('vModal'); let tab = 'pack';
  const wallet = () => { $('vCoin').textContent = Prog.data.coins; $('vPity').textContent = S.pity; const ok = Date.now() - S.daily > 864e5; $('vDaily').disabled = !ok; $('vDaily').textContent = ok ? '🎁 هدیه‌ی روزانه' : '🎁 فردا برگرد'; };
  addEventListener('prog', wallet);
  $('vDaily').onclick = () => { if (Date.now() - S.daily <= 864e5) return; S.daily = Date.now(); save(); Prog.addCoins(300); Snd.gold(); toast('🎁 ۳۰۰ سکه گرفتی!'); wallet(); };
  const empty = () => { body.innerHTML = `<div class="v-empty"><b>🃏</b><h3>هنوز هیچ کارتی نساخته‌ای</h3><p>این بخش با کارت‌های خودت زنده می‌شود: عکس بگذار، قدرت و توانایی بده، و بعد بسته‌گشایی و دوئل شروع می‌شود.</p><button class="g-btn" id="goMk">ساخت اولین کارت ✦</button></div>`; $('goMk').onclick = () => go('maker'); };
  const go = async t => { tab = t; [...$('vTabs').children].forEach(b => b.classList.toggle('on', b.dataset.t === t)); wallet(); if (!cards.length && t !== 'maker' && t !== 'data') { await reload(); } if (!cards.length && t !== 'maker' && t !== 'data') return empty(); ({ pack, coll, battle, guess, maker, data })[t](); };
  $('vTabs').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.t); };
  const closeM = () => { modal.hidden = true; modal.innerHTML = ''; if (tab === 'coll') coll(); };

  /* ---------- 3D tilt + holo on any card ---------- */
  root.addEventListener('pointermove', e => { const c = e.target.closest('.vc'); if (!c || e.pointerType === 'touch') return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%'); c.style.transform = `perspective(700px) rotateY(${(x - .5) * 16}deg) rotateX(${(.5 - y) * 16}deg) translateY(-4px)`; }, { passive: true });
  root.addEventListener('pointerout', e => { const c = e.target.closest('.vc'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; }, { passive: true });

  /* ---------- packs ---------- */
  function roll(g) {
    S.pity++; let r = 'N';
    if (S.pity >= 30) { r = Math.random() < .25 ? 'UR' : 'SSR'; S.pity = 0; }
    else { let t = Math.random() * 100, a = 0; for (const k of RK) { a += RAR[k].w; if (t < a) { r = k; break; } } if (g && (r === 'N' || r === 'R')) r = 'SR'; if (r === 'SSR' || r === 'UR') S.pity = 0; }
    let i = RK.indexOf(r), list = []; for (let d = 0; d < 5 && !list.length; d++) { list = cards.filter(c => c.rar === RK[i - d]); if (!list.length && i + d < 5) list = cards.filter(c => c.rar === RK[i + d]); }
    return pick(list.length ? list : cards);
  }
  function pack() {
    body.innerHTML = `<div class="pack-stage"><div class="pack-art"><div class="pack-glow"></div><div class="pack-card"><b>EIZEN</b><span>VAULT PACK</span><i>藍</i></div></div><div class="pack-btns"><button class="g-btn" data-n="1">۱ بسته · 100 🪙</button><button class="g-btn alt" data-n="10">۱۰ بسته · 900 🪙 (حداقل یک SR)</button></div><p class="pack-note">شانس: UR ۲٪ · SSR ۶٪ · SR ۱۶٪ · R ۳۰٪ · N ۴۶٪ — هر ۳۰ بسته یک SSR یا UR تضمینی. کارت تکراری = ارتقای سطح (+۶٪ آمار). ${cards.length} کارت در گنجینه است.</p></div>`;
    body.querySelector('.pack-btns').onclick = e => { const b = e.target.closest('button'); if (b) open(+b.dataset.n); };
  }
  function open(n) {
    const cost = n === 1 ? 100 : 900; if (!Prog.spend(cost)) return; Snd.init();
    const res = []; for (let i = 0; i < n; i++) res.push(roll(n === 10 && i === 9 && !res.some(x => x.rar !== 'N' && x.rar !== 'R'))); S.pulls += n;
    const top = res.reduce((a, c) => RK.indexOf(c.rar) > RK.indexOf(a) ? c.rar : a, 'N'), outs = res.map(c => ({ c, r: give(c.id) })); save(); wallet();
    if (distinct() >= 10) Prog.unlock('cards_10'); if (res.some(c => c.rar === 'UR')) Prog.unlock('ur_card');
    modal.hidden = false; modal.className = 'vm-open';
    modal.innerHTML = `<div class="open-wrap"><div class="open-pack" style="--rc:${RAR[top].c}"><div class="pack-glow"></div><span>در حال باز کردن…</span></div><div class="open-row" id="openRow"></div><div class="open-ctl" hidden><button class="g-btn" id="opAgain">یک بسته‌ی دیگر</button><button class="g-btn alt" id="opClose">بستن</button></div></div>`;
    const row = $('openRow'); try { Snd.riser(Snd.ctx.currentTime, 1.1); } catch (_) {}
    setTimeout(() => {
      modal.querySelector('.open-pack')?.remove(); try { Snd.taiko(Snd.ctx.currentTime, 1, 1); } catch (_) {}
      outs.forEach((o, i) => setTimeout(() => { const d = document.createElement('div'); d.className = 'open-slot'; d.innerHTML = cardHTML(o.c, { cls: 'flipin' }) + `<em class="tag-${o.r}">${o.r === 'new' ? 'جدید!' : o.r === 'lv' ? 'ارتقا ↑' : '+سکه'}</em>`; row.appendChild(d); if (o.c.rar === 'SSR' || o.c.rar === 'UR') { Snd.gold(); window.blast && o.c.rar === 'UR' && window.blast(); } else Snd.chime(); if (i === outs.length - 1) modal.querySelector('.open-ctl').hidden = false; }, i * 300));
      $('opAgain').onclick = () => open(n); $('opClose').onclick = closeM;
    }, 1400);
  }

  /* ---------- collection ---------- */
  let flt = { q: '', rar: '', fav: false, sort: 'rar', own: false };
  function coll() {
    body.innerHTML = `<div class="coll-bar"><input id="cq" placeholder="جستجوی نام یا انیمه…" value="${esc(flt.q)}"><select id="cr"><option value="">همه‌ی کمیابی‌ها</option>${RK.map(r => `<option ${flt.rar === r ? 'selected' : ''}>${r}</option>`).join('')}</select><select id="cs"><option value="rar">مرتب: کمیابی</option><option value="pow">مرتب: قدرت</option><option value="lv">مرتب: سطح</option><option value="name">مرتب: نام</option></select><label><input type="checkbox" id="cf" ${flt.fav ? 'checked' : ''}> ★ علاقه‌مندی</label><label><input type="checkbox" id="co" ${flt.own ? 'checked' : ''}> فقط دارایی</label><span id="cc" class="muted"></span></div><div class="coll-grid" id="cg"></div>`;
    const draw = () => {
      let l = cards.filter(c => (!flt.q || (c.name + c.series).toLowerCase().includes(flt.q.toLowerCase())) && (!flt.rar || c.rar === flt.rar) && (!flt.fav || S.owned[c.id]?.fav) && (!flt.own || S.owned[c.id]));
      l.sort((a, b) => (S.owned[b.id] ? 1 : 0) - (S.owned[a.id] ? 1 : 0) || (flt.sort === 'rar' ? RK.indexOf(b.rar) - RK.indexOf(a.rar) : flt.sort === 'pow' ? power(b) - power(a) : flt.sort === 'lv' ? lvOf(b.id) - lvOf(a.id) : a.name.localeCompare(b.name, 'fa')));
      $('cg').innerHTML = l.map(c => cardHTML(c, { lock: 1 })).join('') || '<p class="g-msg">کارتی پیدا نشد.</p>'; $('cc').textContent = `${distinct()}/${cards.length} کارت`;
    };
    [['cq', 'q', 'input'], ['cr', 'rar', 'change'], ['cs', 'sort', 'change']].forEach(([id, k, ev]) => $(id).addEventListener(ev, e => { flt[k] = e.target.value; draw(); }));
    $('cf').onchange = e => { flt.fav = e.target.checked; draw(); }; $('co').onchange = e => { flt.own = e.target.checked; draw(); };
    $('cg').onclick = e => { const c = e.target.closest('.vc'); if (c) detail(c.dataset.id); }; $('cg').onkeydown = e => { if (e.key === 'Enter') { const c = e.target.closest('.vc'); if (c) detail(c.dataset.id); } };
    draw();
  }
  function detail(id) {
    const c = byId(id), o = S.owned[id]; if (!c) return; modal.hidden = false; modal.className = 'vm-detail';
    modal.innerHTML = `<div class="detail"><button class="dclose" id="dClose" aria-label="بستن">×</button><div class="d-card">${cardHTML(c, { lock: 1, cls: 'big' })}</div><div class="d-info"><p class="overline">${esc(c.series)} · ${c.rar}</p><h3>${esc(c.name)}</h3>${o ? `<p class="muted">سطح ${o.lv}/10 · ${o.n} نسخه</p>` : '<p class="muted">هنوز نداری — از بسته‌گشایی بگیرش.</p>'}<div class="d-stats">${STATS.map(s => `<div><span>${s[1]} ${s[2]}</span><i><u style="width:${val(c, s[0])}%"></u></i><b>${val(c, s[0])}</b></div>`).join('')}</div>${c.skill ? `<div class="d-skill"><b>✦ ${esc(c.skill)}</b><p>${esc(c.skillText)}</p></div>` : ''}${c.lore ? `<p class="d-lore">${esc(c.lore)}</p>` : ''}<div class="d-btns">${o ? `<button class="g-btn sm" id="dFav">${o.fav ? '★ حذف علاقه' : '☆ علاقه‌مندی'}</button><button class="g-btn sm" id="dTeam">${S.team.includes(id) ? '− از تیم' : '+ به تیم'}</button>${o.n > 1 ? `<button class="g-btn sm alt" id="dSell">فروش نسخه‌ی اضافه (+${RAR[c.rar].v / 2} 🪙)</button>` : ''}` : ''}<button class="g-btn sm alt" id="dEdit">✎ ویرایش</button></div></div></div>`;
    $('dClose').onclick = closeM; modal.onclick = e => { if (e.target === modal) closeM(); };
    $('dFav')?.addEventListener('click', () => { o.fav = o.fav ? 0 : 1; save(); detail(id); });
    $('dTeam')?.addEventListener('click', () => { if (S.team.includes(id)) S.team = S.team.filter(x => x !== id); else if (S.team.length >= 3) { toast('تیم حداکثر ۳ نفر است'); return; } else S.team.push(id); save(); detail(id); });
    $('dSell')?.addEventListener('click', () => { o.n--; Prog.addCoins(RAR[c.rar].v / 2); save(); detail(id); });
    $('dEdit').onclick = () => { closeM(); go('maker').then(() => editCard(id)); };
  }

  /* ---------- duel (top-trumps with 3 cards each) ---------- */
  function battle() {
    const mine = Object.keys(S.owned).map(byId).filter(Boolean);
    if (mine.length < 3) { body.innerHTML = `<div class="v-empty"><b>⚔️</b><h3>برای دوئل حداقل ۳ کارت لازم است</h3><p>الان ${mine.length} کارت داری. از بسته‌گشایی کارت بگیر.</p><button class="g-btn" id="gp">بسته‌گشایی</button></div>`; $('gp').onclick = () => go('pack'); return; }
    const team = (S.team.map(byId).filter(Boolean).length === 3 ? S.team.map(byId) : mine.sort((a, b) => power(b) - power(a)).slice(0, 3));
    body.innerHTML = `<div class="duel-intro"><h3>مرحله‌ی ${S.stage} <small>(${S.wins} برد)</small></h3><p class="muted">تیم تو (از صفحه‌ی کارت‌ها هم می‌توانی تیم را عوض کنی). هر دور یک کارت و یک ویژگی انتخاب می‌کنی؛ ویژگی بالاتر برنده است. ۳ دور — برنده‌ی بیشتر امتیاز.</p><div class="duel-row">${team.map(c => cardHTML(c)).join('')}</div><button class="g-btn" id="dGo">شروع دوئل ⚔</button></div>`;
    $('dGo').onclick = () => { if (window.gameCountdown) { gameCountdown(() => startDuel(team)); } else startDuel(team); };
  }
  function startDuel(team) {
    const diff = 1 + (S.stage - 1) * .05, foes = shuffle(cards).slice(0, 3); while (foes.length < 3) foes.push(pick(cards));
    let hand = team.slice(), fh = foes.slice(), pw = 0, fw = 0, round = 1;
    const fval = (c, k) => Math.round(c[k] * diff * rnd(.92, 1.08));
    const draw = () => { body.innerHTML = `<div class="duel-play"><div class="dscore"><b>تو ${pw}</b><span>دور ${round}/3</span><b>دشمن ${fw}</b></div><p class="muted" id="dMsg">یک کارت و یک ویژگی انتخاب کن.</p><div class="duel-foe">${fh.map(() => '<div class="vc back"><div class="vc-art"></div><span class="vc-rar">?</span></div>').join('')}</div><div class="duel-row" id="dHand">${hand.map(c => `<div class="dh">${cardHTML(c)}<div class="dbtn">${STATS.map(s => `<button data-c="${c.id}" data-k="${s[0]}" title="${s[2]}">${s[1]} ${val(c, s[0])}</button>`).join('')}</div></div>`).join('')}</div></div>`;
      $('dHand').onclick = e => { const b = e.target.closest('button'); if (!b) return; const c = byId(b.dataset.c), k = b.dataset.k, f = pick(fh), a = val(c, k), z = fval(f, k); fh = fh.filter(x => x !== f); hand = hand.filter(x => x !== c); const win = a > z, tie = a === z; if (win) pw++; else if (!tie) fw++; Snd.tone(win ? 880 : 200, Snd.ctx.currentTime, .25, win ? 'triangle' : 'sawtooth', .12);
        body.innerHTML = `<div class="duel-play"><div class="dscore"><b>تو ${pw}</b><span>دور ${round}/3</span><b>دشمن ${fw}</b></div><div class="clash"><div>${cardHTML(c)}<h4>${STATS.find(s => s[0] === k)[1]} ${a}</h4></div><b class="${win ? 'w' : tie ? 't' : 'l'}">${win ? 'برد!' : tie ? 'مساوی' : 'باخت'}</b><div>${cardHTML(f)}<h4>${STATS.find(s => s[0] === k)[1]} ${z}</h4></div></div></div>`;
        setTimeout(() => { round++; if (round > 3) end(); else draw(); }, 1700); };
    };
    const end = () => { const win = pw > fw, coins = win ? 80 + S.stage * 25 : pw === fw ? 30 : 15; if (win) { S.wins++; S.stage++; Prog.addXp(coins * 2); Prog.unlock('battle_win'); Snd.gold(); } Prog.addCoins(coins); save(); wallet();
      body.innerHTML = `<div class="v-empty"><b>${win ? '🏆' : pw === fw ? '🤝' : '💀'}</b><h3>${win ? 'پیروز شدی!' : pw === fw ? 'مساوی' : 'شکست خوردی'}</h3><p>${pw} - ${fw} · +${coins} 🪙${win ? ` · مرحله‌ی بعد: ${S.stage}` : ''}</p><button class="g-btn" id="dAgain">دوئل بعدی</button></div>`; $('dAgain').onclick = battle; };
    draw();
  }

  /* ---------- guess the card ---------- */
  function guess() {
    const withImg = cards.filter(c => c.img); if (withImg.length < 4) { body.innerHTML = `<div class="v-empty"><b>🧩</b><h3>حدس کارت</h3><p>برای این بازی حداقل ۴ کارت با عکس لازم است (الان ${withImg.length}).</p></div>`; return; }
    let r = 0, ok = 0; const set = shuffle(withImg).slice(0, Math.min(8, withImg.length));
    const next = () => {
      if (r >= set.length) { const c = ok * 15; Prog.addCoins(c); Prog.addXp(c * 2); Prog.played('guess'); wallet(); body.innerHTML = `<div class="v-empty"><b>${ok === set.length ? '🏆' : '🧩'}</b><h3>${ok} / ${set.length}</h3><p>+${c} 🪙</p><button class="g-btn" id="gAgain">دوباره</button></div>`; $('gAgain').onclick = () => gameCountdown ? gameCountdown(guess) : guess(); return; }
      const c = set[r], opts = shuffle([c, ...shuffle(cards.filter(x => x !== c)).slice(0, 3)]), px = rnd(20, 80), py = rnd(20, 80);
      body.innerHTML = `<div class="guess"><p class="muted">سؤال ${r + 1}/${set.length} — این کارت کدام است؟</p><div class="g-zoom" id="gz" style="background-image:url('${esc(c.img)}');background-position:${px}% ${py}%"></div><div class="g-opts">${opts.map(o => `<button class="q-opt" data-id="${o.id}">${esc(o.name)}</button>`).join('')}</div></div>`;
      setTimeout(() => { const z = $('gz'); if (z) z.classList.add('open'); }, 100);
      body.querySelector('.g-opts').onclick = e => { const b = e.target.closest('.q-opt'); if (!b) return; const good = b.dataset.id === c.id; if (good) ok++; body.querySelectorAll('.q-opt').forEach(x => { x.disabled = true; if (x.dataset.id === c.id) x.classList.add('right'); }); if (!good) b.classList.add('wrong'); $('gz').classList.add('full'); Snd.tone(good ? 880 : 180, Snd.ctx.currentTime, .2, good ? 'triangle' : 'sawtooth', .12); setTimeout(() => { r++; next(); }, 1300); };
    };
    next();
  }

  /* ---------- manager: add / edit / delete cards (with photo + power) ---------- */
  let editing = null, img = null;
  const crop = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const W = 600, H = 800, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'), s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s; x.drawImage(im, (W - w) / 2, (H - h) * .3, w, h); res(cv.toDataURL('image/jpeg', .86)); }; im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); });
  const randStats = r => { const q = RAR[r]; return Object.fromEntries(STATS.map(s => [s[0], Math.round(rnd(q.lo, q.hi))])); };
  function maker() {
    editing = null; img = null;
    body.innerHTML = `<div class="mk"><div class="mk-form"><h3 id="mkTitle">کارت جدید</h3><label>عکس (به‌صورت خودکار ۳:۴ بریده می‌شود)</label><input type="file" id="mkImg" accept="image/*"><label>نام</label><input id="mkName" placeholder="مثلاً: ملکه‌ی آینه‌ها"><label>انیمه / سری</label><input id="mkSeries" placeholder="Bleach، Naruto، …"><label>کمیابی</label><select id="mkRar">${RK.map(r => `<option>${r}</option>`).join('')}</select><div class="mk-stats">${STATS.map(s => `<label>${s[1]} ${s[2]} <b id="o_${s[0]}">50</b><input type="range" min="1" max="100" value="50" id="mk_${s[0]}"></label>`).join('')}</div><button type="button" class="g-btn sm alt" id="mkRand">🎲 آمار تصادفی بر اساس کمیابی</button><label>نام توانایی</label><input id="mkSkill" placeholder="مثلاً: شکستن توهم"><label>توضیح توانایی</label><textarea id="mkSkillT" rows="2"></textarea><label>داستان / جمله</label><textarea id="mkLore" rows="2"></textarea><div class="mk-btns"><button class="g-btn" id="mkSave">ذخیره‌ی کارت</button><button class="g-btn alt" id="mkNew" type="button">فرم تازه</button></div><p class="g-msg" id="mkMsg"></p><hr><label>افزودن گروهی: چند عکس را یک‌جا انتخاب کن (اسم فایل = اسم کارت)</label><input type="file" id="mkBulk" accept="image/*" multiple></div><div class="mk-side"><div id="mkPrev"></div><h4>کارت‌های ساخته‌شده (${cards.length})</h4><div class="mk-list" id="mkList"></div></div></div>`;
    const prev = () => { const c = formCard(); $('mkPrev').innerHTML = cardHTML(c); }; const f = id => $(id);
    const formCard = () => ({ id: editing?.id || 'preview', name: f('mkName').value || 'نام کارت', series: f('mkSeries').value || 'سری', rar: f('mkRar').value, ...Object.fromEntries(STATS.map(s => [s[0], +f('mk_' + s[0]).value])), img: img || editing?.img || '', skill: f('mkSkill').value });
    body.querySelector('.mk-form').addEventListener('input', e => { STATS.forEach(s => { f('o_' + s[0]).textContent = f('mk_' + s[0]).value; }); prev(); });
    f('mkImg').onchange = async e => { if (e.target.files[0]) { img = await crop(e.target.files[0]); prev(); $('mkPrev').querySelector('.vc-art').innerHTML = `<img src="${img}">`; } };
    f('mkRand').onclick = () => { const s = randStats(f('mkRar').value); STATS.forEach(k => f('mk_' + k[0]).value = s[k[0]]); f('mkName').dispatchEvent(new Event('input', { bubbles: true })); };
    f('mkNew').onclick = maker;
    f('mkSave').onclick = async () => {
      if (!img && !editing?.img) { f('mkMsg').textContent = 'اول یک عکس انتخاب کن.'; return; } if (!f('mkName').value.trim()) { f('mkMsg').textContent = 'اسم کارت را بنویس.'; return; }
      const c = { id: editing?.id, name: f('mkName').value, series: f('mkSeries').value, rar: f('mkRar').value, skill: f('mkSkill').value, skillText: f('mkSkillT').value, lore: f('mkLore').value, ...Object.fromEntries(STATS.map(s => [s[0], +f('mk_' + s[0]).value])) };
      f('mkMsg').textContent = 'در حال ذخیره…'; try { await api('POST', { card: c, image: img }); await reload(); toast('✅ کارت ذخیره شد'); maker(); } catch (e) { f('mkMsg').textContent = e.message; }
    };
    f('mkBulk').onchange = async e => { const fs = [...e.target.files]; f('mkMsg').textContent = `در حال افزودن ${fs.length} کارت…`; let n = 0; for (const file of fs) { try { const r = pick(['N', 'N', 'R', 'R', 'SR']); await api('POST', { card: { name: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), series: '', rar: r, ...randStats(r) }, image: await crop(file) }); n++; } catch (_) { } } await reload(); toast(`✅ ${n} کارت اضافه شد — اسم و آمارشان را ویرایش کن`); maker(); };
    $('mkList').innerHTML = cards.map(c => `<div class="mk-item" data-id="${c.id}">${cardHTML(c)}<div><button class="g-btn sm" data-a="e">✎</button><button class="g-btn sm alt" data-a="d">🗑</button></div></div>`).join('') || '<p class="muted">هنوز کارتی نیست.</p>';
    $('mkList').onclick = async e => { const b = e.target.closest('button'), it = e.target.closest('.mk-item'); if (!b || !it) return; if (b.dataset.a === 'e') editCard(it.dataset.id); else if (confirm('این کارت برای همیشه حذف شود؟')) { await api('POST', { action: 'delete', id: it.dataset.id }); delete S.owned[it.dataset.id]; S.team = S.team.filter(x => x !== it.dataset.id); save(); await reload(); maker(); } };
    prev();
  }
  function editCard(id) { const c = byId(id); if (!c || tab !== 'maker') return; editing = c; img = null; $('mkTitle').textContent = 'ویرایش: ' + c.name; $('mkName').value = c.name; $('mkSeries').value = c.series; $('mkRar').value = c.rar; STATS.forEach(s => { $('mk_' + s[0]).value = c[s[0]]; $('o_' + s[0]).textContent = c[s[0]]; }); $('mkSkill').value = c.skill || ''; $('mkSkillT').value = c.skillText || ''; $('mkLore').value = c.lore || ''; $('mkPrev').innerHTML = cardHTML(c); $('mkTitle').scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  /* ---------- backup ---------- */
  function data() {
    body.innerHTML = `<div class="v-empty"><b>💾</b><h3>پشتیبان پیشرفت</h3><p>پیشرفت کارت‌ها (دارایی‌ها، سطح‌ها، تیم) و سکه/XP در همین مرورگر ذخیره می‌شود. یک نسخه‌ی پشتیبان بگیر یا برگردان.</p><div class="d-btns"><button class="g-btn" id="bkOut">دانلود پشتیبان</button><label class="g-btn alt" style="cursor:pointer">بازگردانی<input type="file" id="bkIn" accept=".json" hidden></label><button class="g-btn alt" id="bkReset">پاک‌کردن پیشرفت کارت‌ها</button></div></div>`;
    $('bkOut').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ vault: S, prog: Prog.data })], { type: 'application/json' })); a.download = 'eizen-progress.json'; a.click(); };
    $('bkIn').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); if (d.vault) { S = Object.assign(S, d.vault); save(); } if (d.prog) { Object.assign(Prog.data, d.prog); store.set('eizen-prog', JSON.stringify(Prog.data)); } toast('بازگردانی شد ✓'); setTimeout(() => location.reload(), 600); } catch (_) { toast('فایل نامعتبر است'); } }); };
    $('bkReset').onclick = () => { if (confirm('پیشرفت کارت‌ها پاک شود؟ (کارت‌های ساخته‌شده می‌مانند)')) { store.set('eizen-vault2', ''); loadS(); save(); go('pack'); } };
  }

  // render lazily (after login, when the section is near the viewport) so /api/cards is never called while logged out
  let started = false; const boot = () => { if (started || $('app').hidden) return; started = true; reload().then(() => go('pack')); };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es[0].isIntersecting) boot(); }, { rootMargin: '300px' }).observe(root); else boot();
})();
