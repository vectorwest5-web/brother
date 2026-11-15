/* EIZEN winter: falling snow that piles up along the bottom of the screen, a bulldozer that clears it every 8 seconds,
   a detailed snowman, Christmas lights, sleigh-bell sounds. Runs only while the winter theme is active. */
(() => {
  'use strict';
  const { $, store, toast } = window.EZ, Snd = window.Snd;
  const cv = $('snowCv'); if (!cv) return; const ctx = cv.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, active = false, raf = 0, last = 0, T = 0, wind = 0;
  const COL = 4; let pile = [], flakes = [], spray = [], puffs = [];
  const nFlakes = () => { const q = store.get('eizen-q', 'high'); return reduced || q === 'off' ? 0 : q === 'low' ? 45 : q === 'mid' ? 90 : 150; };

  /* ---------- sprites ---------- */
  const mk = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
  const dot = mk(24, 24, (x, w) => { const g = x.createRadialGradient(12, 12, 0, 12, 12, 12); g.addColorStop(0, '#fff'); g.addColorStop(.45, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const crystal = mk(48, 48, x => { x.translate(24, 24); x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineCap = 'round'; x.shadowColor = '#cfeaff'; x.shadowBlur = 5; for (let i = 0; i < 6; i++) { x.save(); x.rotate(i * Math.PI / 3); x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -19); x.stroke(); x.lineWidth = 1.4; x.beginPath(); x.moveTo(0, -9); x.lineTo(-5, -14); x.moveTo(0, -9); x.lineTo(5, -14); x.moveTo(0, -14); x.lineTo(-4, -18); x.moveTo(0, -14); x.lineTo(4, -18); x.stroke(); x.restore(); } });

  const soft = mk(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.6, 'rgba(235,245,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const clump = [0, 1, 2, 3].map(v => mk(32, 32, x => { let sd = v * 7 + 3; const r = () => (sd = (sd * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 4 + v; i++) { const px = 16 + (r() - .5) * 9, py = 16 + (r() - .5) * 9, rr = 4 + r() * 5, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.55, 'rgba(244,250,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); } }));
  const jag = []; /* static micro-noise for the snow surface */
  /* ---------- bulldozer sprite (original generic design, drawn once at 2x) ---------- */
  const SW = 280, SH = 150;
  const dozerSprite = mk(SW * 2, SH * 2, (x) => {
    x.scale(2, 2); const rr = (a, b, w, h, r) => { x.beginPath(); x.roundRect ? x.roundRect(a, b, w, h, r) : x.rect(a, b, w, h); };
    // tracks
    let g = x.createLinearGradient(0, 98, 0, 148); g.addColorStop(0, '#34373f'); g.addColorStop(1, '#0d0e12'); x.fillStyle = g; rr(14, 98, 202, 48, 22); x.fill();
    x.strokeStyle = '#555a66'; x.lineWidth = 2; rr(16, 100, 198, 44, 21); x.stroke();
    [42, 82, 122, 162, 196].forEach(cx => { const rg = x.createRadialGradient(cx - 3, 120, 2, cx, 122, 15); rg.addColorStop(0, '#9aa1ad'); rg.addColorStop(1, '#3a3e47'); x.fillStyle = rg; x.beginPath(); x.arc(cx, 122, 13, 0, 6.3); x.fill(); x.fillStyle = '#1b1d22'; x.beginPath(); x.arc(cx, 122, 5, 0, 6.3); x.fill(); });
    // chassis
    g = x.createLinearGradient(0, 56, 0, 102); g.addColorStop(0, '#ffd23a'); g.addColorStop(.55, '#f3b200'); g.addColorStop(1, '#a87400'); x.fillStyle = g;
    x.beginPath(); x.moveTo(44, 100); x.lineTo(44, 66); x.lineTo(132, 66); x.lineTo(140, 58); x.lineTo(196, 58); x.quadraticCurveTo(210, 60, 212, 76); x.lineTo(214, 100); x.closePath(); x.fill();
    x.strokeStyle = '#fff6'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(142, 60); x.lineTo(196, 60); x.stroke();
    x.fillStyle = '#0006'; x.fillRect(44, 92, 170, 8);
    // grille + vents
    x.fillStyle = '#2a2c33'; for (let i = 0; i < 5; i++) x.fillRect(200, 66 + i * 6.5, 11, 3.5); x.fillStyle = '#1a1b20'; for (let i = 0; i < 4; i++) x.fillRect(150 + i * 10, 70, 6, 20);
    x.fillStyle = '#0b0b0e'; x.font = '700 9px sans-serif'; x.fillText('EIZEN', 56, 86);
    // cab
    g = x.createLinearGradient(0, 18, 0, 70); g.addColorStop(0, '#ffd23a'); g.addColorStop(1, '#d99a00'); x.fillStyle = g; rr(60, 14, 82, 9, 3); x.fill();
    x.fillStyle = '#20222a'; x.fillRect(64, 22, 5, 46); x.fillRect(134, 22, 5, 46); x.fillRect(64, 22, 75, 4);
    g = x.createLinearGradient(70, 26, 130, 66); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#4f86ad'); x.fillStyle = g; x.globalAlpha = .88; x.fillRect(69, 26, 65, 40); x.globalAlpha = 1; x.fillStyle = '#fff4'; x.beginPath(); x.moveTo(78, 26); x.lineTo(96, 26); x.lineTo(80, 66); x.lineTo(69, 66); x.fill();
    x.fillStyle = '#2b2f38'; rr(92, 40, 18, 24, 5); x.fill(); x.fillStyle = '#c14a1f'; x.beginPath(); x.arc(101, 39, 7, 0, 6.3); x.fill(); // driver silhouette
    // exhaust
    x.fillStyle = '#1c1d22'; x.fillRect(176, 36, 7, 24); x.fillStyle = '#444'; x.fillRect(174, 33, 11, 5);
    // headlight
    const hl = x.createRadialGradient(207, 72, 1, 207, 72, 8); hl.addColorStop(0, '#fff'); hl.addColorStop(1, '#ffe08a'); x.fillStyle = hl; x.beginPath(); x.arc(207, 72, 6, 0, 6.3); x.fill();
    // blade + arm
    x.strokeStyle = '#8b929c'; x.lineWidth = 8; x.lineCap = 'round'; x.beginPath(); x.moveTo(190, 88); x.lineTo(228, 98); x.stroke(); x.strokeStyle = '#d3d8df'; x.lineWidth = 4; x.beginPath(); x.moveTo(196, 88); x.lineTo(214, 93); x.stroke();
    g = x.createLinearGradient(216, 0, 246, 0); g.addColorStop(0, '#6a727d'); g.addColorStop(.45, '#c8d0da'); g.addColorStop(1, '#5a626d'); x.fillStyle = g; x.beginPath(); x.moveTo(218, 56); x.lineTo(246, 46); x.lineTo(250, 142); x.lineTo(226, 148); x.closePath(); x.fill();
    x.fillStyle = '#1f2229'; x.beginPath(); x.moveTo(226, 148); x.lineTo(250, 142); x.lineTo(251, 148); x.lineTo(226, 150); x.fill(); x.strokeStyle = '#ffffff55'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(232, 62); x.lineTo(238, 138); x.stroke();
    x.fillStyle = '#f3b200'; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(219 + i * 7.4, 57 - i * 2.2); x.lineTo(224 + i * 7.4, 55 - i * 2.2); x.lineTo(220 + i * 7.4, 66); x.fill(); }
    // snow dusting on roof & hood
    x.fillStyle = '#f4f9ff'; x.beginPath(); x.ellipse(100, 13, 38, 4.5, 0, 0, 6.3); x.fill(); x.beginPath(); x.ellipse(168, 57, 24, 3.5, 0, 0, 6.3); x.fill();
  });
  const D = { on: false, x: 0, dir: 1, pushed: 0, t0: 0, next: 0, scale: 1, spd: 320, flip: 1, eng: null };
  const sc = () => Math.max(.62, Math.min(1.15, H / 720));

  /* ---------- pile / snowfall ---------- */
  const resize = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; const n = Math.ceil(W / COL) + 2; const old = pile; pile = new Array(n).fill(0).map((_, i) => old[Math.min(old.length - 1, i)] || 0); };
  const gAt = x => pile[Math.max(0, Math.min(pile.length - 1, (x / COL) | 0))] || 0;
  const fillFlakes = (init) => { const n = nFlakes(); while (flakes.length < n) flakes.push(spawn({}, init)); flakes.length = n; };
  function spawn(f, init) { const r = Math.random(); f.z = r < .5 ? rnd(.12, .4) : r < .86 ? rnd(.4, .72) : rnd(.76, 1); f.x = rnd(-40, W + 40); f.y = init ? rnd(-20, H) : rnd(-60, -8); f.ph = rnd(0, 6.3); f.sp = rnd(.7, 1.25); f.fq = rnd(.5, 1.5); f.am = rnd(5, 20); f.cr = f.z > .82 && Math.random() < .3; f.oof = !f.cr && f.z > .8 && Math.random() < .5; f.v = (Math.random() * 4) | 0; f.rot = rnd(0, 6.3); f.rs = rnd(-.6, .6); return f; }
  const bump = (x, a) => { const c = (x / COL) | 0; for (let k = -3; k <= 3; k++) { const i = c + k; if (i >= 0 && i < pile.length) pile[i] += a * (1 - Math.abs(k) / 4); } };

  function frame(now) {
    raf = requestAnimationFrame(frame); if (document.hidden) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; T += dt; ctx.clearRect(0, 0, W, H);
    // growth
    const cap = 46 + Math.sin(T * .2) * 6;
    for (let i = 0; i < pile.length; i++) { const n = (Math.sin(i * .31 + T * .55) + Math.sin(i * .09 - T * .33) + 2.2) / 4.2; if (pile[i] < cap * (.55 + n * .6)) pile[i] += dt * 3.6 * (.5 + n); }
    if (((T * 10) | 0) % 2 === 0) for (let i = 1; i < pile.length - 1; i++) pile[i] = (pile[i - 1] + pile[i] * 2 + pile[i + 1]) / 4;
    // dozer schedule
    if (!D.on && now >= D.next) startDozer(now);
    if (D.on) stepDozer(dt, now);
    // flakes: depth layers, turbulence, travelling gusts, tumbling crystals
    wind *= .985; const gust = Math.sin(T * .21) * 7 + Math.sin(T * .53 + 1.3) * 4;
    for (const f of flakes) {
      const z = f.z, local = (Math.sin(T * .22 + f.y * .0045 + f.x * .0012) * 9 + Math.sin(T * .7 + f.x * .003) * 4 + gust + wind * 90) * (.35 + z * .85);
      f.y += (24 + z * 78) * f.sp * (1 + .22 * Math.sin(T * 1.3 + f.ph)) * dt; f.x += (Math.sin(T * f.fq + f.ph) * f.am * (.3 + z * .7) + Math.sin(T * f.fq * 2.3 + f.ph * 1.7) * f.am * .3 * z + local) * dt; f.rot += dt * f.rs;
      if (f.y > H - gAt(f.x) - 2) { if (Math.random() < .4) bump(f.x, z * z * 1.2 + .15); spawn(f, false); continue; }
      if (f.x < -50) f.x = W + 40; else if (f.x > W + 50) f.x = -40;
      const s = 1.5 + z * z * 8.5;
      if (f.cr) { const fl = Math.cos(T * 1.4 + f.ph); ctx.globalAlpha = .55 + z * .4; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.scale(.35 + Math.abs(fl) * .65, 1); ctx.drawImage(crystal, -s * 1.2, -s * 1.2, s * 2.4, s * 2.4); ctx.restore(); }
      else if (f.oof) { ctx.globalAlpha = .55; ctx.drawImage(soft, f.x - s * 2.2, f.y - s * 2.2, s * 4.4, s * 4.4); }
      else if (z > .5) { ctx.globalAlpha = .45 + z * .5; ctx.drawImage(clump[f.v], f.x - s * 1.3, f.y - s * 1.3, s * 2.6, s * 2.6); }
      else { ctx.globalAlpha = .25 + z * .7; ctx.drawImage(dot, f.x - s, f.y - s, s * 2, s * 2); }
    }
    ctx.globalAlpha = 1; drawPile(); if (D.on) drawDozer(now); drawSpray(dt);
  }
  function drawPile() {
    if (jag.length < pile.length) for (let i = jag.length; i < pile.length; i++) jag.push(Math.random());
    // misty haze above the ground
    const mh = ctx.createLinearGradient(0, H - 150, 0, H); mh.addColorStop(0, 'rgba(210,228,255,0)'); mh.addColorStop(1, 'rgba(210,228,255,.14)'); ctx.fillStyle = mh; ctx.fillRect(0, H - 150, W, 150);
    // far drift (smoothed, bluish, slightly higher)
    ctx.fillStyle = 'rgba(150,178,222,.55)'; ctx.beginPath(); ctx.moveTo(0, H); for (let i = 0; i < pile.length; i += 2) { const p = pile[i] * 1.18 + 8 + Math.sin(i * .05 + 2) * 4; ctx.lineTo(i * COL, H - p); } ctx.lineTo(W + COL, H); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, H - 80, 0, H); g.addColorStop(0, '#fbfdff'); g.addColorStop(.3, '#e3eeff'); g.addColorStop(.7, '#b7cdea'); g.addColorStop(1, '#86a5d1');
    const yy = i => H - pile[i] - 1 - (jag[i] - .5) * 1.8;
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H); for (let i = 0; i < pile.length; i++) ctx.lineTo(i * COL, yy(i)); ctx.lineTo(W + COL, H); ctx.closePath(); ctx.fill();
    // sun-lit rim + soft blue shade below it
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < pile.length; i++) i ? ctx.lineTo(i * COL, yy(i)) : ctx.moveTo(0, yy(i)); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,150,200,.28)'; ctx.lineWidth = 5; ctx.beginPath(); for (let i = 0; i < pile.length; i++) i ? ctx.lineTo(i * COL, yy(i) + 4) : ctx.moveTo(0, yy(i) + 4); ctx.stroke();
    // glints
    ctx.fillStyle = 'rgba(255,255,255,.95)'; for (let k = 0; k < 18; k++) { const i = ((k * 37 + (T * 2 | 0) * 11) % pile.length); const a = Math.sin(T * 2.4 + k * 2.1); if (a > .8) { const gx = i * COL, gy = H - pile[i] + 5 + (k % 4) * 5, r = (a - .8) * 12; ctx.fillRect(gx - r, gy, r * 2, 1); ctx.fillRect(gx, gy - r, 1, r * 2); } }
  }

  /* ---------- bulldozer ---------- */
  function startDozer(now) {
    D.on = true; D.dir = -D.dir || 1; D.dir = D.dir === 0 ? 1 : D.dir; D.scale = sc(); D.spd = 300 * D.scale; D.pushed = 0; D.t0 = now;
    D.x = D.dir > 0 ? -SW * D.scale - 40 : W + 40; engine(true);
  }
  function stepDozer(dt, now) {
    D.x += D.dir * D.spd * dt; const sw = SW * D.scale, bx = D.dir > 0 ? D.x + sw - 28 * D.scale : D.x + 28 * D.scale;
    for (let i = 0; i < pile.length; i++) { const px = i * COL; if (D.dir > 0 ? px < bx : px > bx) { if (pile[i] > 1.5) { D.pushed += pile[i]; pile[i] = 1.5; if (!reduced && spray.length < 70 && Math.random() < .22) spray.push({ x: px, y: H - 20, vx: D.dir * rnd(40, 160), vy: -rnd(60, 190), l: 1 }); } } }
    if (Math.random() < .12) puffs.push({ x: D.dir > 0 ? D.x + 178 * D.scale : D.x + (SW - 178) * D.scale, y: H - 112 * D.scale, r: 4 * D.scale, l: 1 });
    if ((D.dir > 0 && D.x > W + 30) || (D.dir < 0 && D.x + sw < -30)) { D.on = false; D.next = Math.max(now + 400, D.t0 + 8000); engine(false); pile.fill(1.5); }
  }
  function drawDozer(now) {
    const s = D.scale, sw = SW * s, sh = SH * s, y = H - sh + 3 * s, t = (now - D.t0) / 1000;
    // ahead mound of pushed snow
    const mh = Math.min(84 * s, 8 + Math.sqrt(D.pushed) * 2.1) , bx = D.dir > 0 ? D.x + sw - 18 * s : D.x + 18 * s, mw = 130 * s;
    const mg = ctx.createLinearGradient(0, H - mh, 0, H); mg.addColorStop(0, '#fff'); mg.addColorStop(1, '#a9c4e8'); ctx.fillStyle = mg; ctx.beginPath(); ctx.moveTo(bx, H); ctx.quadraticCurveTo(bx + D.dir * mw * .2, H - mh * 1.15, bx + D.dir * mw * .55, H - mh * .7); ctx.quadraticCurveTo(bx + D.dir * mw * .9, H - mh * .3, bx + D.dir * mw, H); ctx.closePath(); ctx.fill();
    // headlight beam
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const hx = D.dir > 0 ? D.x + 207 * s : D.x + (SW - 207) * s, hy = y + 72 * s, bg = ctx.createLinearGradient(hx, 0, hx + D.dir * 300, 0); bg.addColorStop(0, 'rgba(255,238,170,.38)'); bg.addColorStop(1, 'rgba(255,238,170,0)'); ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(hx, hy - 4); ctx.lineTo(hx + D.dir * 300, hy - 46); ctx.lineTo(hx + D.dir * 300, hy + 60); ctx.lineTo(hx, hy + 4); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(D.dir > 0 ? D.x : D.x + sw, y + Math.sin(t * 22) * .8); ctx.scale(D.dir * s, s);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(125, SH - 2, 130, 5, 0, 0, 6.3); ctx.fill();
    ctx.drawImage(dozerSprite, 0, 0, SW, SH);
    // moving tread marks
    ctx.fillStyle = '#161820'; const off = (t * 90) % 14; for (let k = -1; k < 15; k++) { const xx = 30 + k * 14 - off; if (xx > 22 && xx < 208) { ctx.fillRect(xx, 99, 6, 5); ctx.fillRect(xx, 140, 6, 5); } }
    // spinning wheel spokes
    ctx.strokeStyle = '#c3c9d3'; ctx.lineWidth = 1.6; [42, 82, 122, 162, 196].forEach(cx => { ctx.save(); ctx.translate(cx, 122); ctx.rotate(t * 7); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke(); ctx.restore(); });
    // beacon
    const on = Math.sin(t * 12) > 0; ctx.fillStyle = on ? '#ff8a1a' : '#7a3d0b'; ctx.beginPath(); ctx.arc(138, 10, 4.2, 0, 6.3); ctx.fill(); if (on) { ctx.globalCompositeOperation = 'lighter'; const bgx = ctx.createRadialGradient(138, 10, 1, 138, 10, 30); bgx.addColorStop(0, 'rgba(255,150,40,.7)'); bgx.addColorStop(1, 'rgba(255,150,40,0)'); ctx.fillStyle = bgx; ctx.fillRect(100, -20, 80, 60); }
    ctx.restore();
  }
  function drawSpray(dt) {
    for (let i = spray.length - 1; i >= 0; i--) { const p = spray[i]; p.l -= dt * 1.4; if (p.l <= 0) { spray.splice(i, 1); continue; } p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.globalAlpha = p.l; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4 * p.l + .6, 0, 6.3); ctx.fill(); }
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.l -= dt * .7; if (p.l <= 0) { puffs.splice(i, 1); continue; } p.y -= 34 * dt; p.x += wind * 10 * dt + 6 * dt * -D.dir; p.r += dt * 9; ctx.globalAlpha = p.l * .35; ctx.fillStyle = '#b9c2d0'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function engine(on) {
    try {
      if (!Snd || !Snd.ctx || Snd.ctx.state !== 'running') return; const c = Snd.ctx, t = c.currentTime;
      if (on && !D.eng) { const g = c.createGain(), lp = c.createBiquadFilter(), o1 = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), n = Snd.noise(2), nf = c.createBiquadFilter(), ng = c.createGain(); o1.type = 'sawtooth'; o1.frequency.value = 36; o2.type = 'square'; o2.frequency.value = 72; lfo.frequency.value = 11; lg.gain.value = 4; lfo.connect(lg); lg.connect(o1.frequency); lp.type = 'lowpass'; lp.frequency.value = 190; nf.type = 'bandpass'; nf.frequency.value = 160; ng.gain.value = .04; n.loop = true; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .8); o1.connect(lp); o2.connect(lp); lp.connect(g); n.connect(nf); nf.connect(ng); ng.connect(g); g.connect(Snd.master); [o1, o2, lfo, n].forEach(s => s.start()); D.eng = { g, nodes: [o1, o2, lfo, n] }; }
      else if (!on && D.eng) { const e = D.eng; D.eng = null; e.g.gain.cancelScheduledValues(t); e.g.gain.setValueAtTime(e.g.gain.value, t); e.g.gain.linearRampToValueAtTime(0, t + .6); setTimeout(() => e.nodes.forEach(s => { try { s.stop(); } catch (_) {} }), 800); }
    } catch (_) {}
  }

  /* ---------- sounds ---------- */
  const PENTA = [1318.5, 1568, 1760, 2093, 2349.3, 2637];
  function bells(n = 9) { try { if (!Snd.init()) return; const c = Snd.ctx, t = c.currentTime; for (let i = 0; i < n; i++) { const f = PENTA[Math.random() * PENTA.length | 0]; Snd.tone(f, t + i * .11 + Math.random() * .03, .9, 'sine', .06, 1); Snd.tone(f * 2.76, t + i * .11, .35, 'sine', .02, 1); const k = Snd.noise(.08), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 6000; g.gain.setValueAtTime(.05, t + i * .11); g.gain.exponentialRampToValueAtTime(.001, t + i * .11 + .07); k.connect(hp); hp.connect(g); g.connect(Snd.master); k.start(t + i * .11); }
    const w = Snd.noise(2.5), wf = c.createBiquadFilter(), wg = c.createGain(); wf.type = 'bandpass'; wf.frequency.setValueAtTime(400, t); wf.frequency.linearRampToValueAtTime(1500, t + 1.2); wf.Q.value = .5; wg.gain.setValueAtTime(.0001, t); wg.gain.exponentialRampToValueAtTime(.12, t + .5); wg.gain.exponentialRampToValueAtTime(.0001, t + 2.4); w.connect(wf); wf.connect(wg); wg.connect(Snd.master); w.start(t); } catch (_) {} }

  /* ---------- snowman (original generic design: beanie, plaid scarf, carrot nose) ---------- */
  const SNOWMAN = `<div id="snowman" aria-hidden="true"><div class="sm-wrap">
  <svg class="sm-body" viewBox="0 0 240 340"><defs>
   <radialGradient id="smG" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".42" stop-color="#f0f5fd"/><stop offset=".78" stop-color="#bccce6"/><stop offset="1" stop-color="#7d95bb"/></radialGradient>
   <radialGradient id="smR" cx=".12" cy=".4" r="1"><stop offset=".55" stop-color="#7fb8ff" stop-opacity="0"/><stop offset="1" stop-color="#8ec5ff" stop-opacity=".5"/></radialGradient>
   <filter id="smF" x="-12%" y="-12%" width="124%" height="124%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="4" result="a"/><feDisplacementMap in="SourceGraphic" in2="a" scale="8" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="9" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 .5  0 0 0 0 .62  0 0 0 0 .82  0 0 0 .55 -.16" result="sp"/><feComposite in="sp" in2="d" operator="in" result="s2"/><feMerge><feMergeNode in="d"/><feMergeNode in="s2"/></feMerge></filter></defs>
   <ellipse cx="120" cy="326" rx="92" ry="11" fill="#08122a" opacity=".5"/>
   <g filter="url(#smF)"><circle cx="120" cy="262" r="66" fill="url(#smG)"/><circle cx="120" cy="170" r="50" fill="url(#smG)"/><circle cx="120" cy="102" r="37" fill="url(#smG)"/>
   <circle cx="120" cy="262" r="66" fill="url(#smR)"/><circle cx="120" cy="170" r="50" fill="url(#smR)"/><circle cx="120" cy="102" r="37" fill="url(#smR)"/></g>
   <ellipse cx="120" cy="206" rx="46" ry="9" fill="#5c76a3" opacity=".3"/><ellipse cx="120" cy="136" rx="33" ry="7" fill="#5c76a3" opacity=".3"/></svg>
  <svg class="sm-face" viewBox="0 0 240 340"><defs>
   <pattern id="plaid" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#c1121f"/><rect width="14" height="3.5" y="2" fill="#0e5a34"/><rect width="3.5" height="14" x="2" fill="#0e5a34" opacity=".85"/><rect width="14" height="1.2" y="9" fill="#f5e9c8"/><rect width="1.2" height="14" x="9" fill="#f5e9c8" opacity=".8"/></pattern>
   <pattern id="rib" width="6" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="12" fill="#e8eef8"/><rect width="3" height="12" fill="#c7d3e8"/></pattern>
   <linearGradient id="carrot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb04a"/><stop offset="1" stop-color="#d4540c"/></linearGradient>
   <radialGradient id="coal" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#6a6f7a"/><stop offset=".4" stop-color="#1b1d22"/><stop offset="1" stop-color="#050506"/></radialGradient>
   <radialGradient id="pom" cx=".4" cy=".35"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9d6ee"/></radialGradient></defs>
   <g class="arm-l"><path d="M76 160 C54 150 40 140 26 118 M44 140 C36 138 30 132 26 126 M36 130 C34 122 30 116 30 110" fill="none" stroke="#4a2f1b" stroke-width="5" stroke-linecap="round"/><path d="M76 159 C55 149 41 139 27 117" fill="none" stroke="#7a5233" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></g>
   <g class="arm-r"><path d="M164 160 C188 150 204 144 216 122 M196 142 C204 142 210 138 214 132 M206 134 C210 128 212 122 212 116" fill="none" stroke="#4a2f1b" stroke-width="5" stroke-linecap="round"/><path d="M164 159 C187 149 203 143 215 121" fill="none" stroke="#7a5233" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></g>
   <g><circle cx="120" cy="156" r="5.5" fill="url(#coal)"/><circle cx="120" cy="176" r="5.5" fill="url(#coal)"/><circle cx="120" cy="196" r="5.5" fill="url(#coal)"/></g>
   <g class="scarf-tail"><path d="M142 140 C146 160 146 184 142 206 L162 202 C160 182 160 160 156 140Z" fill="url(#plaid)"/><g stroke="#f5e9c8" stroke-width="1.4"><path d="M144 206 v8 M149 205 v9 M154 204 v8 M159 203 v9"/></g><path d="M142 140 C146 160 146 184 142 206" fill="none" stroke="#0004" stroke-width="1.5"/></g>
   <path d="M80 126 C96 142 144 142 160 126 L162 144 C146 160 94 160 78 144Z" fill="url(#plaid)"/><path d="M80 126 C96 142 144 142 160 126" fill="none" stroke="#fff3" stroke-width="2"/><path d="M78 144 C94 160 146 160 162 144" fill="none" stroke="#0005" stroke-width="2"/>
   <ellipse cx="150" cy="140" rx="11" ry="9" fill="url(#plaid)" stroke="#0004"/>
   <g><ellipse cx="97" cy="113" rx="8" ry="5" fill="#ff7d96" opacity=".32"/><ellipse cx="143" cy="113" rx="8" ry="5" fill="#ff7d96" opacity=".32"/></g>
   <g class="eyes"><circle class="eye" cx="106" cy="99" r="4.6" fill="url(#coal)"/><circle class="eye" cx="134" cy="99" r="4.6" fill="url(#coal)"/><circle cx="104.8" cy="97.6" r="1.3" fill="#fff" opacity=".85"/><circle cx="132.8" cy="97.6" r="1.3" fill="#fff" opacity=".85"/></g>
   <path d="M118 107 C128 106 146 108 158 113 C146 115 130 116 118 114Z" fill="url(#carrot)"/><path d="M126 108 q3 3 1 6 M135 109 q3 3 1 5 M144 111 q2 2 1 4" fill="none" stroke="#8a3407" stroke-width=".9" opacity=".6"/><ellipse cx="119" cy="110.5" rx="3.4" ry="4.4" fill="#e66a14"/>
   <g fill="#1a1c20">${[[100, 119], [105, 122.5], [112, 124.5], [120, 125], [128, 124.5], [135, 122.5], [140, 119]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.2"/>`).join('')}</g>
   <g><path d="M84 88 C84 58 100 46 120 46 C140 46 156 58 156 88 C140 82 100 82 84 88Z" fill="#2457a8"/><path d="M92 82 C93 62 104 52 114 50 M104 84 C103 62 112 52 122 50 M118 84 C118 62 124 52 132 50 M132 84 C132 64 138 54 144 56" fill="none" stroke="#e8eef8" stroke-width="3.4" opacity=".85"/><rect x="82" y="82" width="76" height="17" rx="5" fill="url(#rib)"/><rect x="82" y="82" width="76" height="17" rx="5" fill="none" stroke="#0003"/><circle cx="120" cy="42" r="12" fill="url(#pom)"/><path d="M110 40 q4 -6 10 -2 M118 46 q6 -2 10 -8 M112 46 q-2 -3 0 -6" fill="none" stroke="#b3c3df" stroke-width="1.2"/><ellipse cx="116" cy="52" rx="22" ry="5" fill="#fff" opacity=".85"/></g>
   <g fill="#fff" opacity=".9"><circle cx="86" cy="150" r="2"/><circle cx="150" cy="176" r="1.6"/><circle cx="96" cy="184" r="1.8"/><circle cx="132" cy="230" r="2"/><circle cx="104" cy="248" r="1.6"/></g></svg></div></div>`;
  document.body.insertAdjacentHTML('beforeend', SNOWMAN);
  const sm = $('snowman');
  sm.addEventListener('click', () => { wind = 2.2; bells(7); sm.classList.remove('hop'); void sm.offsetWidth; sm.classList.add('hop'); for (let i = 0; i < 40; i++) { const f = spawn({}, false); f.x = sm.getBoundingClientRect().left + rnd(10, 140); f.y = H - 220 + rnd(0, 120); flakes.push(f); } setTimeout(() => { flakes.length = Math.min(flakes.length, nFlakes()); }, 6000); });

  /* ---------- Christmas lights across the top ---------- */
  const lights = document.createElement('div'); lights.id = 'xmasLights'; lights.setAttribute('aria-hidden', 'true'); document.body.appendChild(lights);
  const buildLights = () => {
    const n = Math.max(8, Math.round(innerWidth / 120)), sw = innerWidth / n, cols = ['#ff4455', '#ffd86b', '#52d6ff', '#ff9ad9', '#7dffa0'], rr = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1; let h = `<svg width="100%" height="96" viewBox="0 0 ${innerWidth} 96" preserveAspectRatio="none" style="overflow:visible">`, pts = [];
    let d = 'M0 6'; for (let i = 0; i < n; i++) { d += ` Q${i * sw + sw / 2} ${44} ${(i + 1) * sw} 6`; }
    h += `<path d="${d}" fill="none" stroke="#0b2e1b" stroke-width="13" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#14683a" stroke-width="9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#2f9a58" stroke-width="3" stroke-dasharray="3 5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffd86b55" stroke-width="1.2" stroke-dasharray="1 9"/>`;
    for (let i = 0; i < n; i++) { const x0 = i * sw, t = k => { const m = 1 - k; return [m * m * x0 + 2 * m * k * (x0 + sw / 2) + k * k * (x0 + sw), m * m * 6 + 2 * m * k * 44 + k * k * 6]; };
      for (let j = 1; j <= 5; j++) { const [bx, by] = t(j / 6), c = cols[(i * 5 + j) % 5]; h += `<g class="bulb" style="animation-delay:${((i + j) % 5) * .3}s"><rect x="${bx - 2.5}" y="${by + 2}" width="5" height="6" fill="#1b2a20"/><ellipse cx="${bx}" cy="${by + 15}" rx="5" ry="7.5" fill="${c}"/><ellipse cx="${bx}" cy="${by + 15}" rx="12" ry="14" fill="${c}" opacity=".22"/></g>`; }
      // hanging baubles at each swag low point
      const [mx, my] = t(.5), bc = ['#d62839', '#ffd86b', '#3b82f6', '#c0c8d8'][i % 4]; h += `<g><line x1="${mx}" y1="${my + 4}" x2="${mx}" y2="${my + 22}" stroke="#d8c27a" stroke-width="1"/><rect x="${mx - 3}" y="${my + 20}" width="6" height="4" fill="#d8c27a"/><circle cx="${mx}" cy="${my + 34}" r="11" fill="${bc}"/><circle cx="${mx - 4}" cy="${my + 30}" r="3.2" fill="#fff" opacity=".7"/><path d="M${mx - 10} ${my + 36} Q${mx} ${my + 44} ${mx + 10} ${my + 36}" stroke="#fff5" fill="none"/></g>`;
      // red bow at each knot
      if (i % 2 === 0) h += `<g transform="translate(${x0} 6)"><path d="M0 0 L-16 -9 L-16 9Z M0 0 L16 -9 L16 9Z" fill="#d62839" stroke="#7a0f1b"/><circle r="4.5" fill="#b01828"/><path d="M-3 4 L-9 22 L-3 18Z M3 4 L9 22 L3 18Z" fill="#a31222"/></g>`; }
    lights.innerHTML = h + '</svg>'; };

  /* ---------- unique hand-shaped snow caps on every button ---------- */
  const CAPSEL = '.gold-button,.g-btn,.vote-btn,.game-tab,.duo,.vault-tabs button,.pn,.bro-btn,#loginBtn';
  let capSeed = 7; const cr = () => (capSeed = (capSeed * 16807) % 2147483647) / 2147483647;
  function capFor(w) {
    w = Math.max(40, Math.min(420, Math.round(w))); const h = 26, base = 15; let d = `M0 ${h} L0 ${base + 2}`, x = 0, hl = '';
    // thicker mounds near the corners, thin in the middle, irregular lumps
    while (x < w) { const edge = Math.min(x, w - x) / w, th = 4 + (1 - Math.min(1, edge * 3.2)) * 7 + cr() * 4, step = 10 + cr() * 22, nx = Math.min(w, x + step), cx = (x + nx) / 2; d += ` Q${cx.toFixed(1)} ${(base - th).toFixed(1)} ${nx.toFixed(1)} ${(base + 1 + cr() * 3).toFixed(1)}`; x = nx; }
    d += ` L${w} ${h}Z`;
    // melting drips under the edge
    let dr = ''; const nd = 1 + Math.floor(w / 70); for (let i = 0; i < nd; i++) { const px = 8 + cr() * (w - 16), len = 4 + cr() * 9, r = 1.8 + cr() * 1.6; dr += `<path d="M${(px - r).toFixed(1)} ${base + 1} Q${px.toFixed(1)} ${base + 3} ${(px + r).toFixed(1)} ${base + 1} L${(px + r * .6).toFixed(1)} ${(base + len).toFixed(1)} a${(r * .6).toFixed(1)} ${(r * .8).toFixed(1)} 0 0 1 ${(-r * 1.2).toFixed(1)} 0Z" fill="url(#g)"/>`; }
    let sp = ''; for (let i = 0; i < 4; i++) sp += `<circle cx="${(cr() * w).toFixed(0)}" cy="${(base - 2 - cr() * 6).toFixed(0)}" r="${(.7 + cr() * .9).toFixed(1)}" fill="#fff"/>`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff'/><stop offset='.6' stop-color='#eaf3ff'/><stop offset='1' stop-color='#b9cfee'/></linearGradient></defs><path d='${d}' fill='#7f9ccb' opacity='.45' transform='translate(0 2.2)'/><path d='${d}' fill='url(#g)'/>${dr}<path d='${d.replace(/L\d+ ${h}Z$/, '')}' fill='none' stroke='#fff' stroke-width='1.2' opacity='.9'/>${sp}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  function capAll() { document.querySelectorAll(CAPSEL).forEach(el => { const w = el.offsetWidth; if (!w || el.dataset.cap === String(w)) return; el.dataset.cap = w; el.style.setProperty('--cap', capFor(w)); }); }
  let capT = 0; const capSoon = () => { clearTimeout(capT); capT = setTimeout(() => active && capAll(), 400); };
  new MutationObserver(capSoon).observe(document.body, { childList: true, subtree: true }); addEventListener('resize', capSoon, { passive: true });

  /* ---------- gifts beside the snowman + flying sleigh (original silhouettes) ---------- */
  const gift = (x, y, w, h, c1, c2) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c1}"/><rect x="${x}" y="${y}" width="${w}" height="${h * .28}" fill="#fff" opacity=".13"/><rect x="${x + w / 2 - 4}" y="${y}" width="8" height="${h}" fill="${c2}"/><rect x="${x}" y="${y + h * .38}" width="${w}" height="7" fill="${c2}" opacity=".9"/><path d="M${x + w / 2} ${y} q-18 -16 -4 -20 q10 -2 4 20 q-6 -22 8 -20 q14 4 -4 20Z" fill="${c2}"/></g>`;
  document.body.insertAdjacentHTML('beforeend', `<svg id="xmasGifts" aria-hidden="true" viewBox="0 0 220 120">${gift(8, 62, 62, 52, '#d62839', '#ffd86b')}${gift(66, 80, 48, 34, '#1d7a46', '#f4f8ff')}${gift(30, 36, 40, 28, '#2a63c4', '#ffd86b')}${gift(118, 88, 54, 26, '#8a2be2', '#ffd1f0')}</svg>
  <div id="sleigh" aria-hidden="true"><svg viewBox="0 0 520 120"><g fill="#07101f"><path d="M250 74 q4 -34 40 -34 h46 q10 0 10 12 l-6 30 q-4 12 -20 12 h-60 q-10 0 -10 -20Z"/><path d="M240 96 q70 12 140 0 q24 -4 30 -26" fill="none" stroke="#07101f" stroke-width="5" stroke-linecap="round"/><circle cx="318" cy="38" r="12"/><path d="M304 36 q14 -22 30 -4Z"/></g>${[0, 1, 2].map(i => `<g transform="translate(${40 + i * 62} ${i % 2 ? 10 : 0})" fill="#07101f"><ellipse cx="46" cy="64" rx="24" ry="10"/><path d="M64 60 q16 -18 24 -4 q-2 10 -12 14Z"/><path d="M80 52 l6 -16 M84 54 l12 -14 M88 56 l16 -8" stroke="#07101f" stroke-width="2.5" fill="none"/><path d="M28 70 l-8 26 M40 74 l-4 24 M56 74 l6 24 M66 70 l12 22" stroke="#07101f" stroke-width="3.5" stroke-linecap="round"/></g>`).join('')}<path d="M120 70 H250" stroke="#d8c27a" stroke-width="1.5" opacity=".7"/><circle cx="60" cy="64" r="3.6" fill="#ff3b3b"/></svg><i class="trail"></i></div>`);
  const sleigh = $('sleigh'); let sl = 0;
  const flySleigh = () => { if (!active || reduced) return; sleigh.classList.remove('fly'); void sleigh.offsetWidth; sleigh.style.top = (110 + Math.random() * 90) + 'px'; sleigh.classList.add('fly'); bells(5); };
  setInterval(() => { if (active && !document.hidden && ++sl % 5 === 0) flySleigh(); }, 8000); window.Winter_sleigh = flySleigh;

  /* ---------- start / stop ---------- */
  function start(fromSwitch) {
    if (active) return; active = true; cv.style.display = 'block'; resize(); pile.fill(0); fillFlakes(true); last = performance.now(); D.on = false; D.next = performance.now() + (fromSwitch ? 5500 : 4500); buildLights();
    raf = requestAnimationFrame(frame); setTimeout(capAll, 300);
  }
  function stop() { if (!active) return; active = false; cancelAnimationFrame(raf); engine(false); D.on = false; ctx.clearRect(0, 0, W, H); cv.style.display = 'none'; flakes = []; spray = []; puffs = []; }
  addEventListener('resize', () => { if (active) { resize(); buildLights(); } }, { passive: true });
  document.addEventListener('ez-theme', e => {
    if (e.detail.id === 'winter') { start(e.detail.fx); if (e.detail.fx) { wind = 3; bells(10); for (let i = 0; i < 60; i++) { const f = spawn({}, false); f.x = e.detail.ox + rnd(-200, 200); f.y = rnd(-200, 0); flakes.push(f); } setTimeout(() => { flakes.length = Math.min(flakes.length, nFlakes()); }, 7000); } }
    else stop();
  });
  if (document.body.classList.contains('theme-winter')) start(false);
  window.Winter = { start, stop, bells, sleigh: flySleigh, dozer: () => { D.next = 0; } };
})();
