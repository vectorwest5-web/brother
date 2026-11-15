/* EIZEN music: every theme has its own playlist (files YOU upload). The ♫ button opens the player for the active theme. */
(() => {
  'use strict';
  const { $, store, toast } = window.EZ, Snd = window.Snd;
  const TH = { aizen: ['آیزن', '🦋', '#a98bff'], madara: ['مادارا', '☄', '#ff4655'], halloween: ['هالووین', '🎃', '#ff7a1a'], winter: ['زمستان', '❄', '#7fd4ff'], gold: ['طلایی', '✨', '#e6cf9d'] };
  const cur = () => (window.EZfx && EZfx.theme()) || 'aizen';
  let lists = {}, view = cur(), play = { theme: null, i: -1 }, loaded = false, shuffle = store.get('eizen-shuf', '0') === '1', ambientOn = false;
  const au = new Audio(); au.preload = 'none'; au.volume = Math.min(1, +store.get('eizen-mvol', 70) / 100);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const fmt = s => isFinite(s) ? `${s / 60 | 0}:${String(s % 60 | 0).padStart(2, '0')}` : '0:00';

  const panel = document.createElement('div'); panel.id = 'musicPanel'; panel.hidden = true;
  panel.innerHTML = `<div class="mp-head"><b id="mpTitle">موزیک</b><button type="button" id="mpClose" aria-label="بستن">×</button></div>
  <div class="mp-chips" id="mpChips"></div>
  <div class="mp-now"><div class="eq" id="mpEq"><i></i><i></i><i></i><i></i><i></i></div><div class="mp-song"><b id="mpSong">چیزی پخش نمی‌شود</b><small id="mpSub">یک آهنگ انتخاب کن</small></div></div>
  <input type="range" id="mpSeek" min="0" max="1000" value="0" aria-label="پیشرفت"><div class="mp-time"><span id="mpT1">0:00</span><span id="mpT2">0:00</span></div>
  <div class="mp-ctl"><button id="mpShuf" title="تصادفی">🔀</button><button id="mpPrev" title="قبلی">⏮</button><button id="mpPlay" class="big" title="پخش / توقف">▶</button><button id="mpNext" title="بعدی">⏭</button><label class="mp-vol" title="صدا">🔊<input type="range" id="mpVol" min="0" max="100" value="70"></label></div>
  <div class="mp-list" id="mpList"></div>
  <details class="mp-add"><summary>➕ افزودن موزیک برای این تم</summary><p>فایل‌های mp3 / ogg / wav / m4a را انتخاب کن (چندتا هم می‌شود).</p><input type="file" id="mpFile" accept="audio/*" multiple><p id="mpMsg" class="muted"></p></details>`;
  document.body.appendChild(panel);
  const q = id => panel.querySelector('#' + id);

  const tracks = t => lists[t] || [];
  const load = async () => { try { const r = await fetch('/api/music'); if (r.ok) { lists = await r.json(); loaded = true; } } catch (_) {} };
  const render = () => {
    const [nm, ic, col] = TH[view]; panel.style.setProperty('--mc', col); q('mpTitle').textContent = `${ic} موزیک تم ${nm}`;
    q('mpChips').innerHTML = Object.keys(TH).map(k => `<button type="button" data-t="${k}" class="${k === view ? 'on' : ''}" style="--c:${TH[k][2]}" title="${TH[k][0]}">${TH[k][1]}<small>${tracks(k).length}</small></button>`).join('');
    const l = tracks(view);
    q('mpList').innerHTML = `<div class="mp-row gen ${ambientOn && view === cur() ? 'now' : ''}" data-gen="1"><span>🎼</span><b>موسیقی ساخته‌شده‌ی سایت (فضاسازی)</b></div>` + (l.length ? l.map((t, i) => `<div class="mp-row ${play.theme === view && play.i === i ? 'now' : ''}" data-i="${i}"><span>${play.theme === view && play.i === i && !au.paused ? '♪' : i + 1}</span><b>${esc(t.name)}</b><button class="del" data-del="${esc(t.file)}" title="حذف">🗑</button></div>`).join('') : '<p class="mp-empty">هنوز موزیکی برای این تم نگذاشته‌ای.<br>از «افزودن موزیک» پایین استفاده کن.</p>');
    q('mpShuf').classList.toggle('on', shuffle);
  };
  const ui = () => {
    const pl = !au.paused || ambientOn; q('mpPlay').textContent = pl ? '⏸' : '▶'; q('mpEq').classList.toggle('on', pl); $('ambientBtn').classList.toggle('on', pl);
    const t = play.theme && tracks(play.theme)[play.i]; q('mpSong').textContent = ambientOn ? 'موسیقی ساخته‌شده' : t ? t.name : 'چیزی پخش نمی‌شود'; q('mpSub').textContent = ambientOn ? 'فضاسازی زنده' : t ? `تم ${TH[play.theme][0]}` : 'یک آهنگ انتخاب کن';
    if (t && 'mediaSession' in navigator) try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.name, artist: 'EIZEN · ' + TH[play.theme][0] }); } catch (_) {}
  };
  const stopAmbient = () => { if (ambientOn) { Snd.toggleAmbient(); ambientOn = false; } };
  const playIdx = (theme, i) => { const l = tracks(theme); if (!l[i]) return; stopAmbient(); play = { theme, i }; au.src = l[i].url; au.play().catch(() => toast('مرورگر پخش را مسدود کرد؛ یک‌بار دیگر بزن')); store.set('eizen-last-' + theme, i); render(); ui(); };
  const next = d => { const l = tracks(play.theme); if (!l.length) return; let i = shuffle && l.length > 1 ? (() => { let k; do k = Math.random() * l.length | 0; while (k === play.i); return k; })() : (play.i + d + l.length) % l.length; playIdx(play.theme, i); };
  au.addEventListener('ended', () => next(1)); au.addEventListener('play', () => { render(); ui(); }); au.addEventListener('pause', () => { render(); ui(); });
  let dragging = false; au.addEventListener('timeupdate', () => { if (au.duration && isFinite(au.duration) && !dragging) { q('mpSeek').value = au.currentTime / au.duration * 1000; q('mpT1').textContent = fmt(au.currentTime); q('mpT2').textContent = fmt(au.duration); } });
  au.addEventListener('error', () => { if (au.src) toast('این فایل پخش نشد'); });
  if ('mediaSession' in navigator) { try { navigator.mediaSession.setActionHandler('nexttrack', () => next(1)); navigator.mediaSession.setActionHandler('previoustrack', () => next(-1)); } catch (_) {} }

  const sk = q('mpSeek'); sk.addEventListener('pointerdown', () => { dragging = true; }); sk.addEventListener('keydown', () => { dragging = true; });
  sk.addEventListener('input', () => { if (au.duration && isFinite(au.duration)) q('mpT1').textContent = fmt(sk.value / 1000 * au.duration); });
  sk.addEventListener('change', () => { if (au.duration && isFinite(au.duration)) { const t = sk.value / 1000 * au.duration; try { au.currentTime = t; } catch (_) {} if (au.paused) au.play().catch(() => {}); } dragging = false; });
  addEventListener('pointerup', () => { setTimeout(() => { dragging = false; }, 60); });
  q('mpVol').value = au.volume * 100; q('mpVol').oninput = e => { au.volume = e.target.value / 100; store.set('eizen-mvol', e.target.value); };
  q('mpPlay').onclick = () => { if (ambientOn) { stopAmbient(); ui(); render(); return; } if (play.theme && au.src) { au.paused ? au.play() : au.pause(); return; } const l = tracks(view); if (l.length) playIdx(view, Math.min(+store.get('eizen-last-' + view, 0), l.length - 1)); else toast('برای این تم موزیکی نیست — ➕ را بزن'); };
  q('mpNext').onclick = () => next(1); q('mpPrev').onclick = () => next(-1);
  q('mpShuf').onclick = () => { shuffle = !shuffle; store.set('eizen-shuf', shuffle ? '1' : '0'); render(); };
  q('mpClose').onclick = () => panel.hidden = true;
  q('mpChips').onclick = e => { const b = e.target.closest('button'); if (b) { view = b.dataset.t; render(); } };
  q('mpList').onclick = async e => {
    const del = e.target.closest('[data-del]');
    if (del) { if (!confirm('این موزیک حذف شود؟')) return; if (play.theme === view && tracks(view)[play.i]?.file === del.dataset.del) { au.pause(); au.removeAttribute('src'); play = { theme: null, i: -1 }; } await fetch('/api/music-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: view, file: del.dataset.del }) }); await load(); render(); ui(); return; }
    const row = e.target.closest('.mp-row'); if (!row) return;
    if (row.dataset.gen) { if (!Snd.init()) return; au.pause(); ambientOn = Snd.toggleAmbient(); render(); ui(); return; }
    playIdx(view, +row.dataset.i);
  };
  q('mpFile').onchange = async e => {
    const fs = [...e.target.files]; if (!fs.length) return; q('mpMsg').textContent = `در حال آپلود ${fs.length} فایل…`; const fd = new FormData(); fd.append('theme', view); fs.forEach(f => fd.append('file', f));
    try { const r = await fetch('/api/music-upload', { method: 'POST', body: fd }), d = await r.json(); if (!r.ok) throw Error(d.error || 'خطا'); q('mpMsg').textContent = `✓ ${d.saved.length} موزیک اضافه شد`; e.target.value = ''; await load(); render(); } catch (er) { q('mpMsg').textContent = er.message; }
  };

  // ♫ button now opens this panel (capture phase so the old ambient toggle does not run)
  document.addEventListener('click', async e => { if (!e.target.closest('#ambientBtn')) return; e.stopImmediatePropagation(); e.preventDefault(); if (panel.hidden) { view = cur(); if (!loaded) await load(); render(); ui(); panel.hidden = false; } else panel.hidden = true; }, true);
  // theme switched → its own playlist takes over if music is playing
  document.addEventListener('ez-theme', e => {
    const id = e.detail.id; view = id; if (!panel.hidden) render();
    if ((!au.paused || ambientOn) && tracks(id).length && play.theme !== id) { const l = tracks(id), i = Math.min(+store.get('eizen-last-' + id, 0), l.length - 1); au.volume = 0; playIdx(id, i); let v = 0; const f = setInterval(() => { v = Math.min(1, v + .1); au.volume = v * Math.min(1, +q('mpVol').value / 100); if (v >= 1) clearInterval(f); }, 90); toast(`🎵 موزیک تم ${TH[id][0]}`); }
  });
  document.addEventListener('ez-login', () => { load().then(() => { if (!panel.hidden) render(); }); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) panel.hidden = true; });
  window.EZmusic = { open: () => $('ambientBtn').click(), pause: () => au.pause() };
})();
