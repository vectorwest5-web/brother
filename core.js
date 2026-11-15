/* EIZEN core: storage, progress (XP / coins / achievements), sound engine + cinematic login score. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  };
  const toast = msg => { const t = $('halloweenToast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
  window.EZ = { $, store, toast, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };

  /* ================= PROGRESS ================= */
  const ACH = {
    first_game: ['🎮', 'اولین بازی', 'یک بازی را تمام کن'],
    play_5: ['🕹️', 'بازیکن همه‌فن‌حریف', '۵ بازی مختلف را امتحان کن'],
    themes_all: ['🎨', 'جهانگرد تم‌ها', 'هر پنج تم را امتحان کن'],
    cards_10: ['🃏', 'کلکسیونر', '۱۰ کارت متفاوت جمع کن'],
    ur_card: ['👑', 'افسانه‌ای', 'یک کارت UR بگیر'],
    battle_win: ['⚔️', 'فاتح میدان', 'یک نبرد کارتی را ببر'],
    lvl_5: ['⭐', 'سطح ۵', 'به سطح ۵ برس'],
    quiz_perfect: ['🧠', 'ذهن بی‌نقص', 'کوییز را کامل درست جواب بده'],
    rhythm_s: ['🥁', 'ریتم کامل', 'در بازی ریتم رتبه‌ی S بگیر']
  };
  let P; try { P = JSON.parse(store.get('eizen-prog', 'null')) } catch (_) { P = null; }
  P = Object.assign({ xp: 0, coins: 500, ach: {}, games: {}, themes: {} }, P || {});
  const lvOf = xp => Math.floor(Math.sqrt(xp / 60)) + 1;
  const save = () => store.set('eizen-prog', JSON.stringify(P));
  const hud = () => {
    const lv = lvOf(P.xp), lo = 60 * (lv - 1) ** 2, hi = 60 * lv ** 2;
    $('hudLv') && ($('hudLv').textContent = 'Lv.' + lv); $('hudCoin') && ($('hudCoin').textContent = P.coins);
    $('hudXp') && ($('hudXp').style.width = Math.min(100, (P.xp - lo) / (hi - lo) * 100) + '%');
  };
  const Prog = {
    data: P, lv: () => lvOf(P.xp),
    addXp(n) { const a = lvOf(P.xp); P.xp += Math.round(n); const b = lvOf(P.xp); save(); hud(); if (b > a) { toast(`⭐ سطح ${b} شدی!`); window.Snd && Snd.chime(); if (b >= 5) Prog.unlock('lvl_5'); } },
    addCoins(n) { P.coins += Math.round(n); save(); hud(); dispatchEvent(new Event('prog')); },
    spend(n) { if (P.coins < n) { toast('سکه‌ات کافی نیست 🪙'); return false; } P.coins -= n; save(); hud(); dispatchEvent(new Event('prog')); return true; },
    unlock(id) { if (P.ach[id] || !ACH[id]) return; P.ach[id] = Date.now(); save(); toast(`${ACH[id][0]} دستاورد: ${ACH[id][1]}`); window.Snd && Snd.chime(); this.renderAch(); },
    played(name) { P.games[name] = (P.games[name] || 0) + 1; save(); this.unlock('first_game'); if (Object.keys(P.games).length >= 5) this.unlock('play_5'); },
    theme(name) { P.themes[name] = 1; save(); if (Object.keys(P.themes).length >= 5) this.unlock('themes_all'); },
    reward(score, game, scale = 1) { const c = Math.max(0, Math.round(score * scale)); if (!c) return 0; this.addCoins(c); this.addXp(c * 2); return c; },
    renderAch() {
      const l = $('achList'); if (!l) return; const ids = Object.keys(ACH);
      l.innerHTML = ids.map(id => `<div class="ach ${P.ach[id] ? 'on' : ''}"><b>${ACH[id][0]}</b><span>${ACH[id][1]}<small>${ACH[id][2]}</small></span></div>`).join('');
      const c = $('achCount'); if (c) c.textContent = `(${Object.keys(P.ach).length}/${ids.length})`;
    }
  };
  window.Prog = Prog; hud(); Prog.renderAch();

  /* ================= SOUND ================= */
  const Snd = {
    ctx: null, master: null, bus: null, vol: +store.get('eizen-vol', 80) / 100, voiceUrl: null, ambient: null,
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
        this.ctx = new AC(); const c = this.ctx;
        this.master = c.createGain(); this.master.gain.value = this.vol;
        const comp = c.createDynamicsCompressor(); this.master.connect(comp); comp.connect(c.destination);
        // shared echo bus = cheap "hall" for music/sfx
        this.bus = c.createGain(); this.bus.gain.value = .5;
        const d = c.createDelay(1); d.delayTime.value = .37; const fb = c.createGain(); fb.gain.value = .38; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
        this.bus.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(this.master);
        // convolution reverb (synthetic hall impulse) → gives pads/plucks a real room tail
        const len = c.sampleRate * 3.2, ir = c.createBuffer(2, len, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d2 = ir.getChannelData(ch); for (let i = 0; i < len; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
        this.verb = c.createConvolver(); this.verb.buffer = ir; const vg = c.createGain(); vg.gain.value = .7; this.verb.connect(vg); vg.connect(this.master);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },
    setVol(v) { this.vol = v; store.set('eizen-vol', Math.round(v * 100)); if (this.master) this.master.gain.value = v; },
    noise(sec) { const sr = this.ctx.sampleRate, b = this.ctx.createBuffer(1, sr * sec, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = this.ctx.createBufferSource(); s.buffer = b; return s; },
    env(g, t, a, peak, rel) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + rel); },
    tone(f, t, dur, type = 'sine', vol = .2, send = 0) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); this.env(g, t, .01, vol, dur); o.connect(g); g.connect(this.master); if (send) g.connect(this.bus); o.start(t); o.stop(t + dur + .05); return o; },
    taiko(t, vol = 1, pitch = 1) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(190 * pitch, t); o.frequency.exponentialRampToValueAtTime(48 * pitch, t + .28); this.env(g, t, .004, vol, .6); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + .7); const n = this.noise(.15), f = c.createBiquadFilter(), ng = c.createGain(); f.type = 'bandpass'; f.frequency.value = 900; this.env(ng, t, .002, .35 * vol, .12); n.connect(f); f.connect(ng); ng.connect(this.master); n.start(t); n.stop(t + .2); },
    riser(t, dur) { const c = this.ctx, n = this.noise(dur + .2), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + .05); n.connect(f); f.connect(g); g.connect(this.master); g.connect(this.bus); n.start(t); const o = c.createOscillator(), og = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(40, t); o.frequency.exponentialRampToValueAtTime(600, t + dur); const lf = c.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.setValueAtTime(200, t); lf.frequency.exponentialRampToValueAtTime(4500, t + dur); og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(.28, t + dur * .95); og.gain.linearRampToValueAtTime(0, t + dur + .04); o.connect(lf); lf.connect(og); og.connect(this.master); o.start(t); o.stop(t + dur + .1); },
    boom(t0) { const c = this.ctx, t = t0 || c.currentTime; const sub = c.createOscillator(), sg = c.createGain(); sub.type = 'sine'; sub.frequency.setValueAtTime(130, t); sub.frequency.exponentialRampToValueAtTime(24, t + 1.7); sg.gain.setValueAtTime(1, t); sg.gain.exponentialRampToValueAtTime(.001, t + 2.1); sub.connect(sg); sg.connect(this.master); sub.start(t); sub.stop(t + 2.2); const n = this.noise(2.5), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(8000, t); f.frequency.exponentialRampToValueAtTime(120, t + 2); g.gain.setValueAtTime(.95, t); g.gain.exponentialRampToValueAtTime(.001, t + 2.3); n.connect(f); f.connect(g); g.connect(this.master); n.start(t); const k = this.noise(.5), kf = c.createBiquadFilter(), kg = c.createGain(); kf.type = 'highpass'; kf.frequency.value = 2800; kg.gain.setValueAtTime(.5, t); kg.gain.exponentialRampToValueAtTime(.001, t + .45); k.connect(kf); kf.connect(kg); kg.connect(this.master); k.start(t); },
    choirChord(t, notes, dur, vol = .09) { // soft vowel pad: saw → two formant filters
      const c = this.ctx; notes.forEach((fr, i) => { const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); o.type = o2.type = 'sawtooth'; o.frequency.value = fr; o2.frequency.value = fr * 1.006; f1.type = f2.type = 'bandpass'; f1.frequency.value = 650; f2.frequency.value = 1080; f1.Q.value = f2.Q.value = 5; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .45); g.gain.exponentialRampToValueAtTime(.0001, t + dur); [o, o2].forEach(x => { x.connect(f1); x.connect(f2); x.start(t); x.stop(t + dur + .1); }); f1.connect(g); f2.connect(g); g.connect(this.master); g.connect(this.bus); }); },
    glass() { const c = this.ctx, t = c.currentTime; for (let i = 0; i < 16; i++) { const fr = 1400 + Math.random() * 4200, tt = t + i * .035 + Math.random() * .05; this.tone(fr, tt, .35 + Math.random() * .3, 'sine', .07, 1); } const n = this.noise(.5), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 5000; g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); n.connect(f); f.connect(g); g.connect(this.master); n.start(t); [523, 659, 784, 1047].forEach((fr, i) => this.tone(fr, t + .1 + i * .09, 1.4, 'triangle', .07, 1)); },
    madara() { const c = this.ctx, t = c.currentTime; this.taiko(t, 1, .8); this.taiko(t + .32, .8, .7); this.taiko(t + .7, 1, .6); const n = this.noise(2.2), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 220; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.7, t + .4); g.gain.exponentialRampToValueAtTime(.001, t + 2.2); n.connect(f); f.connect(g); g.connect(this.master); n.start(t); this.choirChord(t, [73.4, 110, 146.8], 2.2, .07); },
    thunder() { const c = this.ctx, t = c.currentTime; const k = this.noise(.4), kf = c.createBiquadFilter(), kg = c.createGain(); kf.type = 'highpass'; kf.frequency.value = 1500; kg.gain.setValueAtTime(.7, t); kg.gain.exponentialRampToValueAtTime(.001, t + .35); k.connect(kf); kf.connect(kg); kg.connect(this.master); k.start(t); const n = this.noise(3.2), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(1200, t + .1); f.frequency.exponentialRampToValueAtTime(90, t + 3); g.gain.setValueAtTime(.0001, t + .1); g.gain.exponentialRampToValueAtTime(.9, t + .3); g.gain.exponentialRampToValueAtTime(.001, t + 3.2); n.connect(f); f.connect(g); g.connect(this.master); n.start(t + .1); const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(700, t + .6); o.frequency.exponentialRampToValueAtTime(330, t + 2.2); const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency); og.gain.setValueAtTime(.0001, t + .6); og.gain.exponentialRampToValueAtTime(.06, t + 1.2); og.gain.exponentialRampToValueAtTime(.001, t + 2.4); o.connect(og); og.connect(this.master); og.connect(this.bus); o.start(t + .6); lfo.start(t + .6); o.stop(t + 2.5); lfo.stop(t + 2.5); },
    chime() { if (!this.init()) return; const t = this.ctx.currentTime; [880, 1175, 1568].forEach((f, i) => this.tone(f, t + i * .08, .7, 'triangle', .07, 1)); },
    gold() { if (!this.init()) return; const t = this.ctx.currentTime; [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, t + i * .07, 1, 'sine', .06, 1)); },
    sting() { // post-login cinematic hit: riser → taiko roll → boom + choir swell
      if (!this.init()) return; const t = this.ctx.currentTime, r = 1.5; this.riser(t, r);
      for (let i = 0; i < 6; i++) this.taiko(t + .3 + i * .2, .35 + i * .1, 1);
      this.taiko(t + r, 1.2, .8); this.boom(t + r); this.choirChord(t + r - .1, [73.4, 110, 146.8, 174.6, 293.7], 4, .1); return r;
    },
    async findVoice() { for (const ext of ['mp3', 'ogg', 'wav', 'm4a']) { const u = `assets/audio/aizen-voice.${ext}`; try { const r = await fetch(u, { method: 'HEAD', cache: 'no-store' }); if (r.ok) { this.voiceUrl = u; return; } } catch (_) {} } },
    voice() { if (!this.voiceUrl) return false; try { const a = new Audio(this.voiceUrl); a.volume = Math.min(1, this.vol + .2); a.play().catch(() => {}); return true; } catch (_) { return false; } },
    toggleAmbient() {
      if (!this.init()) return false;
      if (this.ambient) { const a = this.ambient; a.g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + .8); setTimeout(() => a.nodes.forEach(n => { try { n.stop(); } catch (_) {} }), 900); this.ambient = null; return false; }
      const c = this.ctx, t = c.currentTime, g = c.createGain(), nodes = []; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.15, t + 2.5); g.connect(this.master);
      [55, 55.5, 82.4, 110.3].forEach((fr, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'sine'; o.frequency.value = fr; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .07 + i * .05; lg.gain.value = 130; lfo.connect(lg); lg.connect(f.frequency); o.connect(f); f.connect(g); o.start(); lfo.start(); nodes.push(o, lfo); });
      const w = this.noise(4); w.loop = true; const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = .6; const wg = c.createGain(); wg.gain.value = .045; w.connect(wf); wf.connect(wg); wg.connect(g); w.start(); nodes.push(w); this.ambient = { g, nodes }; return true;
    }
  };
  window.Snd = Snd; Snd.findVoice();

  /* ===== Login music =====
     1) if the owner dropped assets/audio/login-music.(mp3|ogg|wav|m4a) → plays that on loop (any track you own);
     2) otherwise a generative cinematic score: piano plucks, string ensemble (chorus+vibrato), shakuhachi-style lead,
        taiko, all through a convolution-reverb hall. Starts on first click/tap on the login screen. */
  const Music = {
    on: false, timer: null, next: 0, step: 0, out: null, el: null, url: null,
    chords: [[146.83, 174.61, 220, 293.66], [116.54, 146.83, 174.61, 233.08], [98, 116.54, 146.83, 196], [110, 138.59, 164.81, 220]], // Dm  Bb  Gm  A
    bass: [73.42, 58.27, 49, 55],
    lead: [[587.33, 0, 523.25, 440, 0, 440, 349.23, 0], [466.16, 0, 523.25, 587.33, 0, 698.46, 0, 587.33], [392, 0, 466.16, 0, 587.33, 523.25, 466.16, 0], [554.37, 0, 659.25, 0, 587.33, 0, 440, 0]],
    async find() { for (const e of ['mp3', 'ogg', 'wav', 'm4a']) { const u = `assets/audio/login-music.${e}`; try { const r = await fetch(u, { method: 'HEAD', cache: 'no-store' }); if (r.ok) { this.url = u; return; } } catch (_) {} } },
    start() {
      if (this.on || !Snd.init()) return; this.on = true; const c = Snd.ctx;
      if (this.url) { this.el = new Audio(this.url); this.el.loop = true; this.el.volume = 0; this.el.play().catch(() => {}); let v = 0; const f = setInterval(() => { v = Math.min(1, v + .05); if (this.el) this.el.volume = v * Math.min(1, Snd.vol + .1); if (v >= 1) clearInterval(f); }, 120); return; }
      this.out = c.createGain(); this.out.gain.setValueAtTime(0, c.currentTime); this.out.gain.linearRampToValueAtTime(.8, c.currentTime + 3); this.out.connect(Snd.master); const send = c.createGain(); send.gain.value = .75; this.out.connect(send); send.connect(Snd.verb);
      this.next = c.currentTime + .15; this.step = 0; this.timer = setInterval(() => this.sched(), 100); this.sched();
    },
    stop(fade = 1.4) {
      if (!this.on) return; this.on = false; clearInterval(this.timer);
      if (this.el) { const e = this.el; this.el = null; let v = e.volume; const f = setInterval(() => { v = Math.max(0, v - .08); e.volume = v; if (v <= 0) { clearInterval(f); e.pause(); } }, fade * 1000 / 12); return; }
      const c = Snd.ctx, o = this.out; if (o) { o.gain.cancelScheduledValues(c.currentTime); o.gain.setValueAtTime(o.gain.value, c.currentTime); o.gain.linearRampToValueAtTime(0, c.currentTime + fade); setTimeout(() => { try { o.disconnect(); } catch (_) {} }, fade * 1000 + 400); }
    },
    pluck(f, t, vol) { const c = Snd.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(700, t + 1.4); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + 2.2); lp.connect(g); g.connect(this.out);
      [[1, 1], [2, .4], [3, .22], [4, .1], [5.01, .05]].forEach(([m, a]) => { const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.value = f * m; og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(.001, t + 2.2 / m ** .5); o.connect(og); og.connect(lp); o.start(t); o.stop(t + 2.3); }); },
    strings(freqs, t, dur, vol) { const c = Snd.ctx; freqs.forEach((f, i) => [-7, 0, 8].forEach(dt => { const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt + (i - 1) * 3; lfo.frequency.value = 4.8 + i * .3; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.detune); lp.type = 'lowpass'; lp.frequency.value = 1100; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * .35); g.gain.linearRampToValueAtTime(vol * .7, t + dur * .8); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .6); o.connect(lp); lp.connect(g); g.connect(this.out); o.start(t); lfo.start(t); o.stop(t + dur + .7); lfo.stop(t + dur + .7); })); },
    flute(f, t, dur, vol) { const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), n = Snd.noise(dur + .3), nf = c.createBiquadFilter(), ng = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * .985, t); o.frequency.linearRampToValueAtTime(f, t + .12); lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .012, t + dur * .6); lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .12); g.gain.exponentialRampToValueAtTime(.0001, t + dur); nf.type = 'bandpass'; nf.frequency.value = f * 2; nf.Q.value = 3; ng.gain.setValueAtTime(.0001, t); ng.gain.exponentialRampToValueAtTime(vol * .55, t + .05); ng.gain.exponentialRampToValueAtTime(.0001, t + dur * .8); o.connect(g); g.connect(this.out); n.connect(nf); nf.connect(ng); ng.connect(this.out); o.start(t); lfo.start(t); n.start(t); o.stop(t + dur + .1); lfo.stop(t + dur + .1); },
    sched() {
      const c = Snd.ctx, sd = 60 / 66 / 2; // 8th note @ 66bpm
      while (this.next < c.currentTime + .6) {
        const s = this.step % 32, bar = s >> 3, st = s & 7, t = this.next, ch = this.chords[bar];
        if (st === 0) {
          this.strings(ch, t, sd * 8, .028); const b = c.createOscillator(), bg = c.createGain(); b.type = 'sine'; b.frequency.value = this.bass[bar]; bg.gain.setValueAtTime(.0001, t); bg.gain.exponentialRampToValueAtTime(.4, t + .08); bg.gain.exponentialRampToValueAtTime(.0001, t + sd * 8); b.connect(bg); bg.connect(this.out); b.start(t); b.stop(t + sd * 8 + .1);
          if (bar === 0 || bar === 2) Snd.choirChord(t, [ch[1] * 2, ch[2] * 2], sd * 8, .03);
          this.drum(t, 1);
        }
        if (st === 4) this.drum(t, .45);
        if (st === 6 && bar === 3) { this.drum(t, .7); this.drum(t + sd * .5, .5); }
        const ln = this.lead[bar][st]; if (ln && (bar > 0 || this.step > 8)) this.flute(ln, t, sd * 1.9, .05);
        if (st % 2 === 0) this.pluck(ch[(st >> 1) % ch.length] * 2, t, st === 0 ? .1 : .055);
        this.next += sd; this.step++;
      }
    },
    drum(t, v) { const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(), n = Snd.noise(.12), nf = c.createBiquadFilter(), ng = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .35); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.9 * v, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .9); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 1); nf.type = 'lowpass'; nf.frequency.value = 900; ng.gain.setValueAtTime(.25 * v, t); ng.gain.exponentialRampToValueAtTime(.001, t + .1); n.connect(nf); nf.connect(ng); ng.connect(this.out); n.start(t); }
  };
  Music.find();
  window.Music = Music;
  // browsers only allow audio after a gesture → start the score on the first touch/click/key on the login screen
  const kick = () => { if ($('login') && !$('login').hidden) { Music.start(); } removeEventListener('pointerdown', kick); removeEventListener('keydown', kick); };
  addEventListener('pointerdown', kick, { once: false }); addEventListener('keydown', kick, { once: false });
})();
