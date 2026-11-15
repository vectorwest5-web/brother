/* EIZEN "Are we brothers?" — بله / خیر / نه. Each answer plays its own video (uploaded by you), stops at the end and
   returns to the question. With no video uploaded, a built-in animation plays instead so it always works. */
(() => {
  'use strict';
  const { $, store, toast } = window.EZ; const root = $('broApp'); if (!root) return;
  const SL = [['bro-yes', 'بله', 'yes'], ['bro-no', 'خیر', 'no'], ['bro-never', 'نه', 'never']];
  let cfg = { q: 'برادریم؟', sub: 'یک جواب انتخاب کن…' }; try { Object.assign(cfg, JSON.parse(store.get('eizen-bro', '{}'))); } catch (_) {}
  let vids = {}, playing = false, raf = 0;
  const cnt = () => { try { return JSON.parse(store.get('eizen-bro-n', '{}')); } catch (_) { return {}; } };

  root.innerHTML = `<div class="bro-card"><div class="bro-q" id="bQ"><h3 id="bTitle"></h3><p id="bSub"></p><div class="bro-btns">${SL.map(s => `<button type="button" class="bro-btn b-${s[2]}" data-s="${s[0]}">${s[1]}<small id="n_${s[0]}"></small></button>`).join('')}</div></div>
  <div class="bro-play" id="bPlay" hidden><video id="bVid" playsinline preload="auto"></video><canvas id="bCv" width="960" height="540" hidden></canvas><button type="button" id="bSkip" class="bro-skip">رد کردن ✕</button></div></div>
  <div class="bro-admin"><button type="button" class="g-btn sm alt" id="bGear">⚙ تنظیم ویدئوها و متن‌ها</button><div id="bPanel" hidden><div class="de-grid"><div><label>متن سؤال</label><input id="cQ"><label>زیرنویس</label><input id="cS"></div><div class="mk-btns"><button class="g-btn sm" id="cSave">ذخیره‌ی متن</button></div></div>
  <div class="vid-slots">${SL.map(s => `<div class="vslot" data-s="${s[0]}"><b>جواب «${s[1]}»</b><span class="vst" id="st_${s[0]}">ویدئو ندارد — انیمیشن پیش‌فرض</span><label class="g-btn sm alt">انتخاب ویدئو (mp4 / webm)<input type="file" accept="video/mp4,video/webm" hidden data-up="${s[0]}"></label><button class="g-btn sm alt" data-del="${s[0]}">حذف</button><button class="g-btn sm" data-test="${s[0]}">▶ تست</button></div>`).join('')}</div><p class="muted" id="bMsg"></p></div></div>`;
  const vid = $('bVid'), cv = $('bCv'), cx = cv.getContext('2d');
  const paint = () => { $('bTitle').textContent = cfg.q; $('bSub').textContent = cfg.sub; const n = cnt(); SL.forEach(s => { $('n_' + s[0]).textContent = n[s[0]] ? ` · ${n[s[0]]}` : ''; const u = vids[s[0]]; $('st_' + s[0]).textContent = u ? '✓ ویدئو گذاشته شده' : 'ویدئو ندارد — انیمیشن پیش‌فرض'; $('st_' + s[0]).classList.toggle('ok', !!u); }); };
  const loadVids = async () => { try { const r = await fetch('/api/videos'); if (r.ok) vids = await r.json(); } catch (_) {} paint(); };

  /* ----- built-in fallback animations (generic stick figures) ----- */
  function fallback(kind, done) {
    shape(16 / 9); cv.hidden = false; vid.hidden = true; const t0 = performance.now(), D = 4200, W = 960, H = 540, col = { yes: '#5fe3a0', no: '#ff7a1a', never: '#ff4655' }[kind], P = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 2 + Math.random() * 6, c: Math.random() })), txt = { yes: 'برادریم! 🤝', no: 'اوچ… 💔', never: 'نههههه! ⚡' }[kind];
    const stick = (px, py, arm, lean) => { cx.strokeStyle = '#eee'; cx.lineWidth = 6; cx.lineCap = 'round'; cx.fillStyle = '#eee'; cx.beginPath(); cx.arc(px + lean * 8, py - 112, 16, 0, 6.283); cx.fill(); const l = (a, b, c, d) => { cx.beginPath(); cx.moveTo(a, b); cx.lineTo(c, d); cx.stroke(); }; l(px, py - 60, px + lean * 8, py - 96); l(px, py - 60, px, py); l(px, py, px - 20, py + 70); l(px, py, px + 20, py + 70); l(px + lean * 6, py - 88, px + arm[0], py - 88 + arm[1]); l(px + lean * 6, py - 88, px + arm[2], py - 88 + arm[3]); };
    const f = now => {
      const t = Math.min(1, (now - t0) / D), s = (now - t0) / 1000; cx.fillStyle = '#07060c'; cx.fillRect(0, 0, W, H); const g = cx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 520); g.addColorStop(0, col + '44'); g.addColorStop(1, 'transparent'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      cx.fillStyle = '#ffffff10'; cx.fillRect(0, 430, W, 4);
      if (kind === 'yes') { const k = Math.min(1, s / 1.4), a = 220 - 150 * k; stick(W / 2 - a / 2 - 20, 430, [60 * k, 10, 30, 30 + 20 * k], 1); stick(W / 2 + a / 2 + 20, 430, [-60 * k, 10, -30, 30 + 20 * k], -1); if (s > 1.2) P.forEach(p => { p.y += p.v * .8; if (p.y > H) p.y = -10; cx.fillStyle = `hsl(${p.c * 360},90%,65%)`; cx.fillRect(p.x, p.y, 6, 10); }); }
      else if (kind === 'no') { const k = Math.min(1, s / 2); stick(W / 2 - 150 - 90 * k, 430, [-20, 50, -40, 40], -1); stick(W / 2 + 150 + 90 * k, 430, [20, 50, 40, 40], 1); cx.strokeStyle = '#7fb0ff99'; cx.lineWidth = 2; P.forEach(p => { p.y += p.v * 3; if (p.y > H) p.y = -20; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - 4, p.y + 14); cx.stroke(); }); }
      else { const fl = Math.sin(s * 14) > .6; stick(W / 2 - 170, 430, [60, -40, 80, -10], 1); stick(W / 2 + 170, 430 + (s > 1.2 ? 20 * Math.sin(s * 30) : 0), [-60, -40, -80, -10], -1); if (fl) { cx.fillStyle = '#fff'; cx.globalAlpha = .55; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; } cx.strokeStyle = '#ffe46b'; cx.lineWidth = 5; cx.beginPath(); let px = W / 2 - 30, py = 0; cx.moveTo(px, py); while (py < 300) { px += (Math.random() - .5) * 60; py += 40; cx.lineTo(px, py); } cx.stroke(); }
      cx.font = '700 64px Vazirmatn,sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.shadowColor = col; cx.shadowBlur = 26; cx.globalAlpha = Math.min(1, Math.max(0, s - .5)); cx.fillText(txt, W / 2, 150); cx.globalAlpha = 1; cx.shadowBlur = 0;
      if (t < 1 && playing) raf = requestAnimationFrame(f); else done();
    };
    raf = requestAnimationFrame(f);
  }
  /* ----- the frame takes the video's own shape ----- */
  const card = root.querySelector('.bro-card'); let home = null;
  function shape(ar) {
    if (!home) home = { w: card.offsetWidth, h: card.offsetHeight };
    const maxW = Math.min(card.parentElement.clientWidth || 900, 900), maxH = Math.max(240, innerHeight * .8);
    let w = maxW, h = w / ar; if (h > maxH) { h = maxH; w = h * ar; }
    card.style.minHeight = '0'; card.style.width = Math.round(w) + 'px'; card.style.height = Math.round(h) + 'px';
    card.classList.add('shaped'); card.classList.toggle('portrait', ar < .95);
  }
  function unshape() {
    if (!home) return; card.style.width = home.w + 'px'; card.style.height = home.h + 'px';
    const h = home; home = null; setTimeout(() => { if (!home) { card.style.width = card.style.height = card.style.minHeight = ''; card.classList.remove('shaped', 'portrait'); } }, 650);
    void h;
  }
  /* ----- play one answer ----- */
  function answer(slot, count = true) {
    if (playing) return; playing = true; const kind = SL.find(s => s[0] === slot)[2];
    if (count) { const n = cnt(); n[slot] = (n[slot] || 0) + 1; store.set('eizen-bro-n', JSON.stringify(n)); window.Prog && Prog.addXp(5); }
    window.EZmusic && EZmusic.pause();
    home = null; card.style.width = card.offsetWidth + 'px'; card.style.height = card.offsetHeight + 'px'; card.style.minHeight = '0'; home = { w: card.offsetWidth, h: card.offsetHeight };
    $('bQ').hidden = true; $('bPlay').hidden = false; void card.offsetWidth; card.classList.add('shaped');
    const back = () => { if (!playing) return; playing = false; cancelAnimationFrame(raf); vid.pause(); vid.removeAttribute('src'); vid.load(); vid.hidden = true; cv.hidden = true; $('bPlay').hidden = true; $('bQ').hidden = false; unshape(); paint(); };
    window.__broBack = back;
    const u = vids[slot];
    if (u) { cv.hidden = true; vid.hidden = false; vid.src = u; vid.currentTime = 0; vid.onended = back; vid.onloadedmetadata = () => { if (vid.videoWidth && vid.videoHeight) shape(vid.videoWidth / vid.videoHeight); }; vid.onerror = () => { vid.onerror = null; vid.hidden = true; fallback(kind, back); }; vid.play().catch(() => { vid.muted = true; vid.play().catch(back); }); }
    else fallback(kind, back);
  }
  $('bSkip').onclick = () => window.__broBack && window.__broBack();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && playing) window.__broBack && window.__broBack(); });
  root.querySelector('.bro-btns').onclick = e => { const b = e.target.closest('.bro-btn'); if (b) answer(b.dataset.s); };

  /* ----- admin ----- */
  $('bGear').onclick = () => { const p = $('bPanel'); p.hidden = !p.hidden; if (!p.hidden) { $('cQ').value = cfg.q; $('cS').value = cfg.sub; } };
  $('cSave').onclick = async () => { cfg = { q: $('cQ').value.trim() || 'برادریم؟', sub: $('cS').value.trim() }; store.set('eizen-bro', JSON.stringify(cfg)); paint(); try { await fetch('/api/kv/brother', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }); } catch (_) {} toast('✅ ذخیره شد'); };
  $('bPanel').addEventListener('change', async e => { const inp = e.target.closest('[data-up]'); if (!inp || !inp.files[0]) return; const fd = new FormData(); fd.append('slot', inp.dataset.up); fd.append('file', inp.files[0]); $('bMsg').textContent = 'در حال آپلود… (ویدئوهای بزرگ کمی طول می‌کشند)'; try { const r = await fetch('/api/video-upload', { method: 'POST', body: fd }), d = await r.json(); if (!r.ok) throw Error(d.error || 'خطا'); $('bMsg').textContent = '✓ ویدئو ذخیره شد'; await loadVids(); } catch (er) { $('bMsg').textContent = er.message; } inp.value = ''; });
  $('bPanel').addEventListener('click', async e => { const d = e.target.closest('[data-del]'), t = e.target.closest('[data-test]'); if (d) { await fetch('/api/video-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot: d.dataset.del }) }); await loadVids(); } if (t) answer(t.dataset.test, false); });
  document.addEventListener('ez-login', async () => { loadVids(); try { const r = await fetch('/api/kv/brother'); if (r.ok) { const d = await r.json(); if (d.q) { cfg = Object.assign(cfg, d); store.set('eizen-bro', JSON.stringify(cfg)); paint(); } } } catch (_) {} });
  paint();
})();
