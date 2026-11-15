/* EIZEN pro2: 3-2-1 countdown for every game, HUD (XP bar) upgrades. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), stage = $('gameStage'), tabs = $('gameTabs');
  const tick = (f, d = .12, type = 'sine', v = .16) => { try { const S = window.Snd; if (!S || !S.init()) return; S.tone(f, S.ctx.currentTime, d, type, v, 1); } catch (_) {} };

  /* ---------- countdown ---------- */
  let counting = false, pass = false;
  function countdown(cb) {
    if (counting) return; counting = true;
    const ov = document.createElement('div'); ov.className = 'cd-over'; ov.innerHTML = '<b></b><span>آماده باش…</span>'; stage.appendChild(ov);
    const n = ov.querySelector('b'); let i = 3;
    const step = () => {
      if (!ov.isConnected) { counting = false; return; }
      if (i > 0) { n.textContent = i; n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; tick(i === 1 ? 660 : 440, .18, 'triangle'); i--; setTimeout(step, 780); }
      else { n.textContent = 'برو!'; n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; ov.classList.add('go'); tick(990, .35, 'square', .12); setTimeout(() => { ov.remove(); counting = false; cb && cb(); }, 480); }
    };
    step();
  }
  window.gameCountdown = countdown;
  const START = /^(bStart|cStart|hStart|rStart|sStart|c4r|qAgain|mReset)$/;
  stage && stage.addEventListener('click', e => {
    if (pass) return; const b = e.target.closest('.g-btn'); if (!b || !START.test(b.id)) return;
    e.stopImmediatePropagation(); e.preventDefault(); if (counting) return;
    countdown(() => { if (!b.isConnected) return; pass = true; try { b.click(); } finally { pass = false; } });
  }, true);
  // games without a start button (memory, quiz, reflex, connect-4): count down when the tab opens
  tabs && tabs.addEventListener('click', e => {
    if (!e.target.closest('.game-tab')) return;
    setTimeout(() => { counting = false; stage.querySelectorAll('.cd-over').forEach(x => x.remove()); if (!stage.querySelector('[id$="Start"],#c4r') || stage.querySelector('#c4r')) { if (!stage.querySelector('[id$="Start"]')) countdown(); } }, 40);
  });

  /* ---------- XP bar ---------- */
  const hud = $('hud'), bar = hud && hud.querySelector('.hud-bar');
  const num = document.createElement('small'); num.className = 'hud-num'; bar && bar.after(num);
  const upd = () => { const Prog = window.Prog, P = Prog && Prog.data; if (!P) return; const lv = Prog.lv(), lo = 60 * (lv - 1) ** 2, hi = 60 * lv ** 2; num.textContent = `${P.xp - lo}/${hi - lo}`; hud.title = `سطح ${lv} · ${P.xp} XP`; };
  addEventListener('prog', upd); setInterval(upd, 1500); upd();
  if (window.Prog) {
    const Prog = window.Prog, orig = Prog.addXp; Prog.addXp = function (n) {
      const a = this.lv(); orig.call(this, n); upd();
      if (n > 0 && hud) { hud.classList.remove('xp-pulse'); void hud.offsetWidth; hud.classList.add('xp-pulse'); const p = document.createElement('span'); p.className = 'xp-pop'; p.textContent = '+' + Math.round(n) + ' XP'; hud.appendChild(p); setTimeout(() => p.remove(), 1700); }
      if (this.lv() > a && hud) hud.classList.add('lvup'), setTimeout(() => hud.classList.remove('lvup'), 2200);
    };
  }
})();
