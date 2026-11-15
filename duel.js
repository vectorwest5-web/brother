/* EIZEN saber duel: two generic stick-figure duelists with light-swords. Names + sentences are editable (saved on the server).
   Blade colours, floor and bubbles follow the active theme. */
(() => {
  'use strict';
  const { $, store, toast } = window.EZ, Snd = window.Snd; const root = $('duelApp'); if (!root) return;
  const PAL = { aizen: ['#a98bff', '#7fe9ff', '#1a1040', '#07040f'], madara: ['#ff4655', '#ffb347', '#2a0610', '#080205'], halloween: ['#ff7a1a', '#b66cff', '#240a3a', '#07030c'], winter: ['#7fd4ff', '#d6fff4', '#0f2548', '#050b18'], gold: ['#f3e1b3', '#ff9d4a', '#2a2112', '#070604'] };
  const DEF = { nameA: 'شوالیه‌ی تیره', nameB: 'شوالیه‌ی روشن', A: ['نمی‌ذارم سر راهم بایستی!', 'قدرت من بیشتر از چیزیه که فکر می‌کنی.', 'امروز همه‌چیز تموم می‌شه.', 'تو هیچ‌وقت منو درک نکردی!', 'این مسیر تو رو هم می‌بلعه.'], B: ['آروم باش؛ هنوز دیر نشده.', 'من هر حرکتت رو از قبل می‌شناسم.', 'تو خیلی بهتر از این هستی.', 'قدرت بدون تعادل فقط ویرانی می‌آره.', 'برگرد؛ هنوز راهی هست.'] };
  let cfg = JSON.parse(JSON.stringify(DEF)); try { Object.assign(cfg, JSON.parse(store.get('eizen-duel', '{}'))); } catch (_) {}
  const th = () => PAL[(window.EZfx && EZfx.theme()) || 'aizen'] || PAL.aizen;

  root.innerHTML = `<div class="duel-stage"><canvas id="dCv" width="960" height="440"></canvas><div class="sp spA" id="spA"></div><div class="sp spB" id="spB"></div><span class="nm nmA" id="nmA"></span><span class="nm nmB" id="nmB"></span></div>
  <div class="duel-ctl"><button class="g-btn sm" id="dClash">⚡ برخورد</button><button class="g-btn sm alt" id="dTalk">💬 جمله‌ی بعدی</button><button class="g-btn sm alt" id="dSound" aria-pressed="true">🔊 صدای شمشیر</button><button class="g-btn sm alt" id="dEdit">✎ ویرایش جمله‌ها و نام‌ها</button></div>
  <div class="duel-edit" id="dPanel" hidden><div class="de-grid"><div><label>نام شخصیت چپ</label><input id="eNA"><label>جمله‌های او (هر خط یک جمله)</label><textarea id="eA" rows="6"></textarea></div><div><label>نام شخصیت راست</label><input id="eNB"><label>جمله‌های او (هر خط یک جمله)</label><textarea id="eB" rows="6"></textarea></div></div><div class="mk-btns"><button class="g-btn" id="eSave">ذخیره</button><button class="g-btn alt" id="eReset">برگشت به پیش‌فرض</button></div><p class="muted">نام‌ها و جمله‌ها را هر طور دوست داری بنویس. شمشیرها با رنگ تم عوض می‌شوند.</p></div>`;
  const cv = $('dCv'), x = cv.getContext('2d'), W = 960, H = 440, FL = 350, spA = $('spA'), spB = $('spB');
  let sound = true, spark = [], lastClash = 0, flash = 0, run = false, raf, t0 = performance.now(), say = { who: 0, ia: 0, ib: 0, at: 0, full: '', n: 0 }, hop = [0, 0];
  const setNames = () => { $('nmA').textContent = cfg.nameA; $('nmB').textContent = cfg.nameB; };
  setNames();

  /* ----- geometry helpers ----- */
  const segInt = (p1, p2, p3, p4) => { const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x); if (!d) return null; const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d, u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) } : null; };
  /* ===== rigged duelists: 2-bone IK limbs, cape, hood/hair, choreographed moves ===== */
  const BL = { aizen: '#7fe9ff', madara: '#4da3ff', halloween: '#6dff7a', winter: '#8fdcff', gold: '#6fd0ff' }, RED = '#ff2638', RAD = Math.PI / 180, BLEN = 94;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, k) => a + (b - a) * k, ez = k => k * k * (3 - 2 * k), P2 = (px, py) => ({ x: px, y: py });
  function ik(a, b, l1, l2, bend) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, m = Math.min(d, l1 + l2 - .5), c = cl((l1 * l1 + m * m - l2 * l2) / (2 * l1 * m), -1, 1), base = Math.atan2(dy, dx) + Math.acos(c) * bend; return { j: P2(a.x + Math.cos(base) * l1, a.y + Math.sin(base) * l1), e: P2(a.x + dx / d * m, a.y + dy / d * m) }; }
  function rig(o) {
    const d = o.dir, bob = Math.sin(o.t * 3 + o.ph) * 2, hip = P2(o.cx + o.lunge * .45 * d, FL - 92 + o.crouch + bob - o.jump), lean = d * (.07 + o.lean), sh = P2(hip.x + Math.sin(lean) * 60, hip.y - Math.cos(lean) * 60), head = P2(sh.x + Math.sin(lean) * 19 + d * 3, sh.y - 21);
    const ang = d > 0 ? -o.loc * RAD : Math.PI + o.loc * RAD, hand = P2(sh.x + d * 14 + Math.cos(ang) * 26, sh.y + 10 + Math.sin(ang) * 20), ux = Math.cos(ang), uy = Math.sin(ang);
    const tip = P2(hand.x + ux * BLEN, hand.y + uy * BLEN), hilt = P2(hand.x - ux * 15, hand.y - uy * 15);
    const sh2 = P2(sh.x - d * 5, sh.y + 2), g2 = P2(hand.x - ux * 13, hand.y - uy * 13), tg = P2(sh.x + d * 66, sh.y - 2 - 10 * o.free), rt = P2(lerp(g2.x, tg.x, o.free), lerp(g2.y, tg.y, o.free));
    const a1 = ik(sh, hand, 31, 31, d), a2 = ik(sh2, rt, 30, 30, d), air = Math.max(0, o.jump) * .85, sw = Math.sin(o.t * 4 + o.ph) * 3;
    const fF = P2(hip.x + d * (30 + o.lunge * .6) + sw, FL - air - o.tuck * 22), fB = P2(hip.x - d * (25 + o.lunge * .05) - sw, FL - air - o.tuck * 8);
    const l1 = ik(hip, fF, 47, 47, -d), l2 = ik(hip, fB, 47, 47, -d);
    return { d, hip, sh, head, hand, tip, hilt, ang, arm1: [sh, a1.j, a1.e], arm2: [sh2, a2.j, a2.e], leg1: [hip, l1.j, l1.e], leg2: [hip, l2.j, l2.e], t: o.t, ph: o.ph, vx: o.vx };
  }
  const line = (a, b, w, c) => { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); };
  const limb = (pts, w, c, edge) => { x.lineJoin = x.lineCap = 'round'; x.beginPath(); x.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i].x, pts[i].y); x.strokeStyle = edge; x.lineWidth = w + 3; x.stroke(); x.strokeStyle = c; x.lineWidth = w; x.stroke(); };
  const STY = [{ robe: '#17141f', robe2: '#2a2535', edge: '#07060a', trim: RED, skin: '#0e0c12', hood: 1 }, { robe: '#cdbd9d', robe2: '#e6d9bd', edge: '#3a2f22', trim: '#7a5a38', skin: '#e9c9a6', hair: '#7a4f28' }];
  function draw(p, S, blade, flick) {
    const d = p.d, back = P2(p.sh.x - d * 14, p.sh.y + 2), fl = Math.sin(p.t * 5 + p.ph) * 7 + cl(-p.vx * d, -1, 1) * 18, tail = P2(p.hip.x - d * (38 + fl * .6), p.hip.y + 38 + fl * .5 - Math.abs(p.vx) * 2), tail2 = P2(p.hip.x - d * (14 + fl * .2), p.hip.y + 52);
    // cape
    x.fillStyle = S.hood ? '#0b0910' : '#9a8566'; x.strokeStyle = S.edge; x.lineWidth = 2; x.beginPath(); x.moveTo(p.sh.x - d * 6, p.sh.y - 4); x.quadraticCurveTo(back.x - d * 22, (back.y + tail.y) / 2, tail.x, tail.y); x.lineTo(tail2.x, tail2.y); x.quadraticCurveTo(p.hip.x - d * 4, p.hip.y + 10, p.sh.x + d * 4, p.sh.y + 4); x.closePath(); x.fill(); x.stroke();
    if (S.hood) { x.strokeStyle = RED + '88'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(tail.x, tail.y); x.lineTo(tail2.x, tail2.y); x.stroke(); }
    limb(p.leg2, 9, S.robe, S.edge); limb(p.arm2, 7, S.robe, S.edge);
    // torso + hem
    const nx = Math.cos(Math.atan2(p.sh.y - p.hip.y, p.sh.x - p.hip.x) + Math.PI / 2), ny = Math.sin(Math.atan2(p.sh.y - p.hip.y, p.sh.x - p.hip.x) + Math.PI / 2);
    x.fillStyle = S.robe2; x.strokeStyle = S.edge; x.lineWidth = 2; x.beginPath(); x.moveTo(p.sh.x + nx * 13, p.sh.y + ny * 13); x.lineTo(p.sh.x - nx * 13, p.sh.y - ny * 13); x.lineTo(p.hip.x - nx * 11 - d * 4, p.hip.y + 22); x.lineTo(p.hip.x + nx * 11 + d * 8, p.hip.y + 24); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = S.robe; x.beginPath(); x.moveTo(p.sh.x + nx * 13, p.sh.y + ny * 13); x.lineTo(p.sh.x + d * 2, p.sh.y + 18); x.lineTo(p.sh.x - nx * 13, p.sh.y - ny * 13); x.closePath(); x.fill();
    x.strokeStyle = S.trim; x.lineWidth = 4; x.beginPath(); x.moveTo(p.hip.x + nx * 10, p.hip.y + ny * 10 - 2); x.lineTo(p.hip.x - nx * 10, p.hip.y - ny * 10 - 2); x.stroke();
    limb(p.leg1, 10, S.robe, S.edge); x.fillStyle = S.edge; [p.leg1[2], p.leg2[2]].forEach(f => { x.beginPath(); x.ellipse(f.x + d * 5, f.y, 10, 5, 0, 0, 6.283); x.fill(); });
    // head
    const h = p.head; if (S.hood) { x.fillStyle = S.robe; x.strokeStyle = S.edge; x.lineWidth = 2; x.beginPath(); x.moveTo(h.x - d * 20, h.y + 6); x.quadraticCurveTo(h.x - d * 12, h.y - 24, h.x + d * 4, h.y - 17); x.quadraticCurveTo(h.x + d * 17, h.y - 8, h.x + d * 15, h.y + 8); x.quadraticCurveTo(h.x, h.y + 18, h.x - d * 20, h.y + 6); x.fill(); x.stroke(); x.fillStyle = S.skin; x.beginPath(); x.ellipse(h.x + d * 5, h.y, 8, 10, 0, 0, 6.283); x.fill(); x.fillStyle = '#ffc43a'; x.fillRect(h.x + d * 8, h.y - 3, 3, 2); x.fillRect(h.x + d * 2, h.y - 3, 3, 2); }
    else { x.fillStyle = S.skin; x.strokeStyle = S.edge; x.lineWidth = 2; x.beginPath(); x.arc(h.x, h.y, 12, 0, 6.283); x.fill(); x.stroke(); x.fillStyle = S.hair; x.beginPath(); x.arc(h.x - d * 1, h.y - 1, 12.5, Math.PI * 1.02, Math.PI * 2.02); x.lineTo(h.x - d * 8, h.y - 1); x.closePath(); x.fill(); x.fillStyle = '#2a1d12'; x.fillRect(h.x + d * 5, h.y - 2, 3, 2); x.strokeStyle = S.edge; x.lineWidth = 1.5; x.beginPath(); x.moveTo(h.x + d * 2, h.y + 6); x.lineTo(h.x + d * 8, h.y + 6); x.stroke(); }
    // front arm, hilt, blade
    limb(p.arm1, 7, S.robe2 === '#2a2535' ? S.robe : S.robe2, S.edge); x.fillStyle = S.skin === '#0e0c12' ? '#15121b' : S.skin; x.beginPath(); x.arc(p.hand.x, p.hand.y, 4.5, 0, 6.283); x.fill();
    line(p.hilt, p.hand, 7, '#8c8798'); line(p.hilt, p.hand, 3, '#3a3446'); const wv = 1 + .05 * flick;
    x.globalCompositeOperation = 'lighter'; line(p.hand, p.tip, 24 * wv, blade + '1c'); line(p.hand, p.tip, 15 * wv, blade + '44'); line(p.hand, p.tip, 8, blade); x.globalCompositeOperation = 'source-over'; line(p.hand, p.tip, 3.4, '#fff'); x.fillStyle = '#fff'; x.beginPath(); x.arc(p.tip.x, p.tip.y, 2.4, 0, 6.283); x.fill();
  }
  const zap = (v = .1) => { if (!sound) return; try { if (!Snd.init()) return; const c = Snd.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(900 + Math.random() * 300, t); o.frequency.exponentialRampToValueAtTime(110, t + .22); f.type = 'bandpass'; f.frequency.value = 1500; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .26); o.connect(f); f.connect(g); g.connect(Snd.master); o.start(t); o.stop(t + .3); } catch (_) {} };
  const hum = v => {}; const _humOld = (() => { let o, g, on = false; return v => { if (!Snd.ctx || (v && !sound)) return; if (v && !on) { try { const c = Snd.ctx; o = c.createOscillator(); g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 92; g.gain.value = .0001; g.gain.linearRampToValueAtTime(.018, c.currentTime + .4); o.connect(g); g.connect(Snd.master); o.start(); on = true; } catch (_) {} } else if (!v && on) { g.gain.linearRampToValueAtTime(.0001, Snd.ctx.currentTime + .3); const oo = o; setTimeout(() => { try { oo.stop(); } catch (_) {} }, 400); on = false; } }; })();

  /* ----- speech ----- */
  const pickLine = w => { const l = (w ? cfg.B : cfg.A).filter(s => s.trim()); return l.length ? l[Math.random() * l.length | 0] : '…'; };
  const speak = who => { say.who = who; say.full = pickLine(who); say.n = 0; say.at = performance.now(); const el = who ? spB : spA, o = who ? spA : spB; o.classList.remove('on'); el.textContent = ''; el.classList.add('on'); };
  const typer = now => { const el = say.who ? spB : spA; if (say.n < say.full.length && now - say.at > say.n * 38) { say.n++; el.textContent = say.full.slice(0, say.n); } };
  let talkT = 0; const autoTalk = now => { if (now - talkT > 3300) { talkT = now; speak(say.who ? 0 : 1); flashClash(); } };
  const flashClash = () => { lastClash = 0; };

  /* ----- choreography ----- */
  const TY = { high: [145, 5], side: [168, -16], low: [-50, 48], jump: [140, 0], push: [60, 60] }, TYPES = Object.keys(TY);
  let mv = { atk: 0, type: 'high', u: 0, dur: 2.7, clashed: false, pushed: false, sw: false }, slow = 0, shake = 0, lastT = 0, rings = [], trail = [[], []], prevX = [0, 0], mt = 0;
  const nextMove = () => { let ty; do ty = TYPES[Math.random() * TYPES.length | 0]; while (ty === mv.type); mv = { atk: 1 - mv.atk, type: ty, u: 0, dur: 2.5 + Math.random() * .5, clashed: false, pushed: false, sw: false }; };
  const att = (ty, u) => { const [wl, sl] = TY[ty], w = ez(cl(u / .28)), s = ez(cl((u - .28) / .22)), r = ez(cl((u - .72) / .28)); let loc = u < .28 ? lerp(70, wl, w) : u < .5 ? lerp(wl, sl, s) : u < .72 ? sl + Math.sin(u * 90) * 1.5 : lerp(sl, 70, r); const lunge = ((-14 * w * (1 - s)) + 74 * s) * (1 - r); return { loc, lunge, w, s, r, crouch: (ty === 'jump' ? 6 : 14) * w * (1 - s) * (1 - r), jump: ty === 'jump' ? 86 * Math.sin(Math.PI * cl((u - .1) / .6)) : 0, lean: .12 * s * (1 - r) - .05 * w * (1 - s) }; };
  const blk = (ty, u) => ez(cl((u - .24) / .2)) * (1 - ez(cl((u - .72) / .25))) * (ty === 'push' ? 0 : 1);
  const blockLoc = (h, d, Pt) => { const a = Math.atan2(Pt.y - h.y, Pt.x - h.x); return d > 0 ? -a / RAD : ((a - Math.PI) / RAD + 540) % 360 - 180; };
  const hitPt = (a, b) => segInt(a.hand, a.tip, b.hand, b.tip) || P2((a.tip.x + b.tip.x) / 2, (a.tip.y + b.tip.y) / 2);

  function frame(now) {
    if (!run) return; const t = (now - t0) / 1000, [ca, , g1, g2] = th(), bB = BL[(window.EZfx && EZfx.theme()) || 'aizen'] || '#7fe9ff';
    const real = Math.min(.05, (now - (lastT || now)) / 1000); lastT = now; slow = Math.max(0, slow - real); const dt = real * (slow > 0 ? .3 : 1); mv.u += dt / mv.dur; if (mv.u >= 1) nextMove(); const u = mv.u;
    hop[0] = Math.max(0, hop[0] - 2); hop[1] = Math.max(0, hop[1] - 2);
    const ai = mv.atk, di = 1 - ai, dirs = [1, -1], base = [W / 2 - 128, W / 2 + 128], phs = [0, 1.3];
    const ta = att(mv.type, u), bw = blk(mv.type, u), push = mv.type === 'push' ? ez(cl((u - .3) / .25)) * (1 - ez(cl((u - .7) / .3))) : 0, jit = u > .5 && u < .72 && mv.type !== 'push' ? (Math.random() - .5) * 2.4 : 0;
    const mk = (i, st) => rig({ cx: base[i] + (i ? 1 : -1) * 0 + (st.dx || 0) + jit * (i ? -1 : 1), dir: dirs[i], t, ph: phs[i], loc: st.loc, lunge: st.lunge, crouch: st.crouch, jump: st.jump + Math.sin(hop[i] / 40 * Math.PI) * 40, lean: st.lean, free: st.free || 0, tuck: st.tuck || 0, vx: st.vx || 0 });
    const guard = (i) => 70 + Math.sin(t * 2 + phs[i]) * 4;
    const sA = { ...ta, free: mv.type === 'push' ? ta.s * (1 - ta.r) : 0, tuck: mv.type === 'jump' ? Math.sin(Math.PI * cl((u - .1) / .6)) : 0, dx: 0 };
    const rA = mk(ai, { ...sA, vx: (base[ai] - prevX[ai]) });
    // defender: blade seeks the attacker's blade
    const dDef = { loc: guard(di), lunge: -10 * bw, crouch: (mv.type === 'jump' ? 16 : mv.type === 'low' ? 0 : 5) * bw, jump: mv.type === 'low' ? 34 * Math.sin(Math.PI * cl((u - .3) / .45)) : 0, lean: -.1 * bw - .35 * push, dx: (di ? 1 : -1) * -1 * 0 + (di ? 1 : -1) * 80 * push };
    const pre = mk(di, dDef), Pt = P2(rA.hand.x + (rA.tip.x - rA.hand.x) * .62, rA.hand.y + (rA.tip.y - rA.hand.y) * .62);
    dDef.loc = lerp(dDef.loc, blockLoc(pre.hand, dirs[di], Pt), bw); if (push) dDef.loc = lerp(dDef.loc, 150, push);
    const rD = mk(di, dDef), R = [null, null]; R[ai] = rA; R[di] = rD;
    // clash / force push events
    if (mv.type !== 'push' && !mv.clashed && u >= .5) { mv.clashed = true; const h = hitPt(rA, rD); hitX = h.x; hitY = h.y; lastClash = now; flash = .5; shake = 9; slow = .22; zap(); const cols = [RED, bB]; for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, s = 2 + Math.random() * 7; spark.push({ x: h.x, y: h.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, l: 1, c: cols[i % 2] }); } }
    if (mv.type === 'push' && !mv.pushed && u >= .34) { mv.pushed = true; shake = 5; flash = .25; zap(.05); rings.push({ x: rA.arm2[2].x, y: rA.arm2[2].y, r: 6, l: 1, c: ai ? bB : RED }); for (let i = 0; i < 14; i++) spark.push({ x: rD.sh.x, y: rD.sh.y, vx: (ai ? -1 : 1) * (2 + Math.random() * 4), vy: (Math.random() - .5) * 3, l: .8, c: '#fff' }); }
    if (!mv.sw && u >= .3) { mv.sw = true; zap(.035); }
    if (mv.clashed && u < .7 && Math.random() < .5) spark.push({ x: hitX + (Math.random() - .5) * 8, y: hitY + (Math.random() - .5) * 8, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4, l: .7, c: Math.random() < .5 ? RED : bB });
    prevX[0] = base[0]; prevX[1] = base[1];
    // scene
    x.save(); if (shake > .2) { x.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .86; }
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, g1); bg.addColorStop(1, g2); x.fillStyle = bg; x.fillRect(-12, -12, W + 24, H + 24);
    const gl = x.createRadialGradient(W / 2, FL - 80, 10, W / 2, FL - 80, 380); gl.addColorStop(0, ca + '30'); gl.addColorStop(1, 'transparent'); x.fillStyle = gl; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const sx = (i * 197 + t * 8) % W, sy = (i * 83) % (FL - 60); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(sx, sy, 1.5, 1.5); }
    x.fillStyle = '#05050a99'; x.fillRect(-12, FL + 6, W + 24, H - FL); x.fillStyle = ca + '55'; x.fillRect(-12, FL + 6, W + 24, 2);
    // blade light on the floor + shadows
    x.globalCompositeOperation = 'lighter'; [RED, bB].forEach((c, i) => { const p = R[i], k = cl((FL - p.tip.y) / 260, .15, 1), fg = x.createRadialGradient(p.tip.x, FL + 12, 2, p.tip.x, FL + 12, 120); fg.addColorStop(0, c + (k > .6 ? '55' : '33')); fg.addColorStop(1, 'transparent'); x.fillStyle = fg; x.fillRect(p.tip.x - 120, FL - 20, 240, 80); }); x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#0007'; R.forEach(p => { const k = 1 - cl((FL - p.hip.y - 92) / 160) * .6; x.beginPath(); x.ellipse(p.hip.x, FL + 8, 44 * k, 7 * k, 0, 0, 6.283); x.fill(); });
    // blade trails (fast sweeps leave a ribbon)
    x.globalCompositeOperation = 'lighter'; [RED, bB].forEach((c, i) => { const p = R[i], tr = trail[i]; tr.push([p.hand.x, p.hand.y, p.tip.x, p.tip.y]); if (tr.length > 8) tr.shift(); for (let k = 1; k < tr.length; k++) { const a = tr[k - 1], b = tr[k], sp = Math.hypot(b[2] - a[2], b[3] - a[3]); if (sp < 7) continue; x.globalAlpha = Math.min(.5, sp / 70) * (k / tr.length); x.fillStyle = c; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(a[2], a[3]); x.lineTo(b[2], b[3]); x.lineTo(b[0], b[1]); x.closePath(); x.fill(); } }); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    const fk = Math.sin(t * 43) + Math.sin(t * 29); draw(R[0], STY[0], RED, fk); draw(R[1], STY[1], bB, fk);
    // force-push rings, sparks, flash
    x.globalCompositeOperation = 'lighter'; rings = rings.filter(r => r.l > 0); for (const r of rings) { r.r += 9; r.l -= .035; x.strokeStyle = r.c; x.globalAlpha = Math.max(0, r.l) * .8; x.lineWidth = 3; x.beginPath(); x.ellipse(r.x, r.y, r.r * .6, r.r, 0, 0, 6.283); x.stroke(); } x.globalAlpha = 1;
    if (mv.clashed && u < .72) { const gg = x.createRadialGradient(hitX, hitY, 1, hitX, hitY, 46); gg.addColorStop(0, '#fff'); gg.addColorStop(.3, '#ffd9a0aa'); gg.addColorStop(1, 'transparent'); x.fillStyle = gg; x.fillRect(hitX - 46, hitY - 46, 92, 92); }
    spark = spark.filter(p => p.l > 0); for (const p of spark) { p.x += p.vx; p.y += p.vy; p.vy += .16; p.l -= .035; x.fillStyle = p.l > .5 ? '#fff' : p.c; x.globalAlpha = Math.max(0, p.l); x.fillRect(p.x, p.y, 3, 3); } x.globalAlpha = 1;
    if (flash > 0) { x.fillStyle = `rgba(255,255,255,${flash * .3})`; x.fillRect(0, 0, W, H); flash -= .06; } x.globalCompositeOperation = 'source-over'; x.restore();
    const A = R[0], B = R[1];
    spA.style.cssText = `left:${A.head.x / W * 100}%;top:${(A.head.y - 62) / H * 100}%;--bc:${RED}`; spB.style.cssText = `left:${B.head.x / W * 100}%;top:${(B.head.y - 62) / H * 100}%;--bc:${bB}`;
    $('nmA').style.cssText = `left:${A.hip.x / W * 100}%;--bc:${RED}`; $('nmB').style.cssText = `left:${B.hip.x / W * 100}%;--bc:${bB}`;
    typer(now); autoTalk(now); raf = requestAnimationFrame(frame);
  }
  let hitX = 0, hitY = 0;
  const start = () => { if (run) return; run = true; t0 = performance.now() - 1000; lastT = 0; hum(true); raf = requestAnimationFrame(frame); };
  const stop = () => { run = false; cancelAnimationFrame(raf); hum(false); };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es[0].isIntersecting && !document.hidden ? start() : stop(), { threshold: .2 }).observe(cv); else start();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, who = px > W / 2 ? 1 : 0; hop[who] = 40; speak(who); talkT = performance.now(); zap(.06); });

  $('dClash').onclick = () => { const A = [W / 2 - 40, FL - 130]; for (let i = 0; i < 30; i++) { const a = Math.random() * 6.283, s = 3 + Math.random() * 7; spark.push({ x: A[0], y: A[1], vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 1.2, c: th()[Math.random() < .5 ? 0 : 1] }); } flash = .9; zap(.16); };
  $('dTalk').onclick = () => { speak(say.who ? 0 : 1); talkT = performance.now(); };
  $('dSound').onclick = e => { sound = !sound; e.currentTarget.setAttribute('aria-pressed', sound); e.currentTarget.textContent = sound ? '🔊 صدای شمشیر' : '🔇 بی‌صدا'; if (sound) hum(true); else hum(false); };
  $('dEdit').onclick = () => { const p = $('dPanel'); p.hidden = !p.hidden; if (!p.hidden) { $('eNA').value = cfg.nameA; $('eNB').value = cfg.nameB; $('eA').value = cfg.A.join('\n'); $('eB').value = cfg.B.join('\n'); } };
  $('eSave').onclick = async () => { cfg = { nameA: $('eNA').value.trim() || DEF.nameA, nameB: $('eNB').value.trim() || DEF.nameB, A: $('eA').value.split('\n').map(s => s.trim()).filter(Boolean), B: $('eB').value.split('\n').map(s => s.trim()).filter(Boolean) }; if (!cfg.A.length) cfg.A = DEF.A; if (!cfg.B.length) cfg.B = DEF.B; store.set('eizen-duel', JSON.stringify(cfg)); setNames(); try { await fetch('/api/kv/lines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }); } catch (_) {} toast('✅ ذخیره شد'); $('dPanel').hidden = true; speak(0); };
  $('eReset').onclick = () => { cfg = JSON.parse(JSON.stringify(DEF)); store.set('eizen-duel', JSON.stringify(cfg)); setNames(); $('dEdit').click(); $('dEdit').click(); fetch('/api/kv/lines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }).catch(() => {}); };
  // server copy wins once logged in
  document.addEventListener('ez-login', async () => { try { const r = await fetch('/api/kv/lines'); if (r.ok) { const d = await r.json(); if (d.A && d.B) { cfg = Object.assign(cfg, d); store.set('eizen-duel', JSON.stringify(cfg)); setNames(); } } } catch (_) {} });
  speak(0);
})();
