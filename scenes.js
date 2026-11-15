/* EIZEN scenes: a dedicated full-page background per theme (SVG, built lazily, cross-fades when the theme changes). */
(() => {
  'use strict';
  const box = document.getElementById('sceneBg'); if (!box) return;
  const R = seed => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const stars = (n, seed, maxY = 520, col = '#fff') => { const r = R(seed); let s = ''; for (let i = 0; i < n; i++) s += `<circle class="st" cx="${r() * 1600 | 0}" cy="${r() * maxY | 0}" r="${(.5 + r() * 1.4).toFixed(1)}" fill="${col}" style="animation-delay:${(r() * 5).toFixed(1)}s"/>`; return s; };
  const ridge = (seed, base, amp, step, fill, op = 1) => { const r = R(seed); let d = `M0 900 L0 ${base}`; for (let x = 0; x <= 1600; x += step) d += ` L${x} ${(base - r() * amp).toFixed(0)}`; return `<path d="${d} L1600 900Z" fill="${fill}" opacity="${op}"/>`; };
  const pines = (seed, y, n, h, fill) => { const r = R(seed); let s = ''; for (let i = 0; i < n; i++) { const x = r() * 1600, hh = h * (.7 + r() * .6), w = hh * .38; s += `<path d="M${x} ${y - hh} l${w * .5} ${hh * .3} h${-w * .25} l${w * .35} ${hh * .3} h${-w * .3} l${w * .45} ${hh * .4} h${-w * 2.3} l${w * .45} ${-hh * .4} h${-w * .3} l${w * .35} ${-hh * .3} h${-w * .25}Z" fill="${fill}"/>`; } return s; };
  const sky = (id, a) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${a.map((c, i) => `<stop offset="${i / (a.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const svg = (t, inner) => `<svg class="scn" data-t="${t}" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${inner}</svg>`;

  const S = {
    aizen: () => svg('aizen', `<defs>${sky('a1', ['#04020c', '#150b3d', '#3a2a9a'])}<radialGradient id="a2"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#d8ccff"/><stop offset="1" stop-color="#a98bff"/></radialGradient><radialGradient id="a3"><stop offset="0" stop-color="#a98bffaa"/><stop offset="1" stop-color="#a98bff00"/></radialGradient>${sky('a4', ['#2b1d7a', '#0a0620'])}</defs>
      <rect width="1600" height="900" fill="url(#a1)"/>${stars(90, 11, 520)}<circle cx="1190" cy="210" r="260" fill="url(#a3)"/><circle cx="1190" cy="210" r="86" fill="url(#a2)"/>
      ${ridge(3, 640, 150, 80, '#241660', .8)}${ridge(7, 700, 120, 60, '#170e45', .95)}${ridge(9, 760, 80, 50, '#0d0830')}
      <rect y="760" width="1600" height="140" fill="url(#a4)"/><g class="rip"><ellipse cx="1190" cy="790" rx="90" ry="5" fill="#d8ccff" opacity=".7"/><ellipse cx="1190" cy="812" rx="64" ry="4" fill="#d8ccff" opacity=".5"/><ellipse cx="1190" cy="836" rx="40" ry="3" fill="#d8ccff" opacity=".4"/><ellipse cx="1190" cy="862" rx="22" ry="2.5" fill="#d8ccff" opacity=".35"/></g>
      <g class="mist"><rect x="-200" y="700" width="2000" height="90" fill="#a98bff" opacity=".08"/></g>`),
    madara: () => svg('madara', `<defs>${sky('m1', ['#030001', '#2a030b', '#7d1020'])}<radialGradient id="m2"><stop offset=".42" stop-color="#000"/><stop offset=".5" stop-color="#ffd9c0"/><stop offset=".56" stop-color="#ff5a3c"/><stop offset=".8" stop-color="#c3182e55"/><stop offset="1" stop-color="#c3182e00"/></radialGradient></defs>
      <rect width="1600" height="900" fill="url(#m1)"/><circle class="cor" cx="800" cy="260" r="330" fill="url(#m2)"/>
      <g stroke="#ff8a7a" stroke-width="1.2" opacity=".18">${Array.from({ length: 14 }, (_, i) => `<line x1="${120 + i * 110}" y1="-20" x2="${i * 110 - 160}" y2="420"/>`).join('')}</g>
      ${ridge(21, 700, 170, 70, '#2a0610', .95)}${ridge(23, 770, 120, 55, '#12030a')}<rect y="840" width="1600" height="60" fill="#060102"/>
      <g fill="#07010300" opacity=".95"><path d="M180 760 l20 -190 l22 190Z M1380 770 l16 -230 l30 230Z" fill="#0a0206"/></g><rect class="haze" y="740" width="1600" height="160" fill="#ff2a3a" opacity=".12"/>`),
    halloween: () => svg('halloween', `<defs>${sky('h1', ['#07030f', '#25093f', '#7a3410'])}</defs><rect width="1600" height="900" fill="url(#h1)"/>${stars(60, 31, 420, '#ffe2b8')}
      ${ridge(41, 720, 90, 90, '#12061e')}
      <g fill="#0a0412"><rect x="1170" y="520" width="190" height="260"/><path d="M1150 520 L1265 430 L1380 520Z"/><rect x="1330" y="440" width="34" height="110"/><path d="M1324 440 L1347 400 L1370 440Z"/><rect x="1215" y="470" width="26" height="60"/><path d="M1210 470 L1228 440 L1246 470Z"/></g>
      <g fill="#ffb04a">${[[1200, 580], [1250, 580], [1300, 580], [1210, 660], [1300, 660]].map((p, i) => `<rect class="win" x="${p[0]}" y="${p[1]}" width="22" height="30" style="animation-delay:${i * .7}s"/>`).join('')}</g>
      <g stroke="#0a0412" stroke-width="9" fill="none" stroke-linecap="round"><path d="M130 800 C120 700 150 640 120 560 M122 650 C90 620 80 590 60 560 M128 600 C160 580 180 560 190 520 M150 700 C190 690 210 660 220 630"/><path d="M420 800 C410 730 440 690 420 630 M424 690 C400 670 395 650 380 630" stroke-width="6"/></g>
      <g fill="#0a0412">${Array.from({ length: 22 }, (_, i) => `<rect x="${20 + i * 38}" y="${790 + (i % 2) * 4}" width="7" height="60"/><path d="M${20 + i * 38} ${790 + (i % 2) * 4} l3.5 -12 l3.5 12Z"/>`).join('')}<rect x="0" y="826" width="1600" height="6"/><rect y="850" width="1600" height="60"/></g>
      <g fill="#0a0412"><path d="M640 850 v-48 a22 22 0 0 1 44 0 v48Z"/><path d="M790 850 v-38 a18 18 0 0 1 36 0 v38Z"/></g>
      <rect class="mist" x="-200" y="770" width="2000" height="110" fill="#c9a7ff" opacity=".07"/>`),
    gold: () => svg('gold', `<defs>${sky('g1', ['#0a0805', '#241b0e', '#4a3a1c'])}<radialGradient id="g2"><stop offset="0" stop-color="#ffe9a8aa"/><stop offset="1" stop-color="#ffe9a800"/></radialGradient></defs>
      <rect width="1600" height="900" fill="url(#g1)"/><g class="rays" style="transform-origin:800px -40px"><path d="${Array.from({ length: 11 }, (_, i) => { const a = (i - 5) * .16; return `M800 -40 L${800 + Math.sin(a - .03) * 1500} ${-40 + Math.cos(a - .03) * 1500} L${800 + Math.sin(a + .03) * 1500} ${-40 + Math.cos(a + .03) * 1500}Z`; }).join(' ')}" fill="#ffe9a8" opacity=".07"/></g>
      <circle cx="800" cy="-40" r="420" fill="url(#g2)"/>${(() => { const r = R(5); let s = ''; for (let i = 0; i < 26; i++) s += `<circle class="bk" cx="${r() * 1600 | 0}" cy="${200 + r() * 650 | 0}" r="${8 + r() * 34 | 0}" fill="#ffdf8a" opacity="${(.04 + r() * .08).toFixed(2)}" style="animation-delay:${(r() * 6).toFixed(1)}s"/>`; return s; })()}
      <g fill="none" stroke="#cdb58b" opacity=".18" stroke-width="2"><path d="M0 860 Q400 780 800 860 T1600 860"/><path d="M0 880 Q400 800 800 880 T1600 880"/></g>`),
    winter: () => svg('winter', `<defs>${sky('w1', ['#030713', '#0c1f45', '#2a5d97'])}<radialGradient id="w2"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#e9f3ff"/><stop offset="1" stop-color="#cfe4ff"/></radialGradient><radialGradient id="w3"><stop offset="0" stop-color="#bfe3ff99"/><stop offset="1" stop-color="#bfe3ff00"/></radialGradient>
      <linearGradient id="w4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf3ff"/><stop offset="1" stop-color="#9db8dc"/></linearGradient><linearGradient id="au1" x1="0" x2="1"><stop offset="0" stop-color="#3bf0a8" stop-opacity="0"/><stop offset=".4" stop-color="#3bf0a8" stop-opacity=".55"/><stop offset=".7" stop-color="#6b8bff" stop-opacity=".45"/><stop offset="1" stop-color="#b56bff" stop-opacity="0"/></linearGradient><filter id="wb" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="26"/></filter></defs>
      <rect width="1600" height="900" fill="url(#w1)"/>${stars(110, 51, 460)}
      <g filter="url(#wb)" opacity=".85"><path class="au a1" d="M-100 260 C200 120 500 340 800 210 S1300 130 1700 260 L1700 330 C1300 220 1000 380 700 290 S100 180 -100 340Z" fill="url(#au1)"/><path class="au a2" d="M-100 340 C300 250 600 420 900 300 S1400 240 1700 330 L1700 380 C1400 300 1000 450 700 380 S200 300 -100 400Z" fill="url(#au1)" opacity=".7"/></g>
      <circle cx="260" cy="190" r="200" fill="url(#w3)"/><circle cx="260" cy="190" r="62" fill="url(#w2)"/>
      <path d="M0 640 L180 470 L260 540 L420 380 L560 530 L700 430 L860 560 L1010 400 L1160 520 L1300 440 L1460 560 L1600 480 L1600 900 L0 900Z" fill="#5b7fb0" opacity=".55"/><path d="M420 380 L470 430 L430 425 L410 450 L380 430Z M1010 400 L1060 450 L1030 448 L1005 470 L975 450Z" fill="#fff" opacity=".8"/>
      <g opacity=".95">${pines(61, 790, 46, 120, '#0a1a2c')}${pines(62, 830, 34, 170, '#06111f')}</g>
      <path d="M0 800 C200 750 420 790 640 770 S1100 740 1300 775 S1500 770 1600 760 L1600 900 L0 900Z" fill="url(#w4)"/>
      <g class="cabin"><rect x="150" y="690" width="170" height="100" fill="#4a2c18"/><g stroke="#2e1a0c" stroke-width="3" opacity=".7">${[702, 716, 730, 744, 758, 772].map(y => `<line x1="150" y1="${y}" x2="320" y2="${y}"/>`).join('')}</g><path d="M136 692 L235 630 L334 692Z" fill="#2b1a10"/><path d="M130 696 L235 626 L340 696 L330 700 L235 640 L140 700Z" fill="#f4f8ff"/><rect x="285" y="620" width="20" height="46" fill="#3b2a24"/><rect x="281" y="614" width="28" height="8" fill="#f4f8ff"/><rect class="lit" x="180" y="715" width="34" height="38" fill="#ffc861"/><rect class="lit" x="256" y="715" width="34" height="38" fill="#ffc861" style="animation-delay:.9s"/><rect x="226" y="735" width="26" height="55" fill="#2a170d"/><circle class="smk" cx="295" cy="600" r="9" fill="#cfd9e8" opacity=".4"/><circle class="smk s2" cx="295" cy="600" r="9" fill="#cfd9e8" opacity=".4"/></g>
      <g class="tree"><path d="M420 790 l60 -60 h-24 l52 -60 h-24 l46 -56 h-24 l60 -80 l60 80 h-24 l46 56 h-24 l52 60 h-24 l60 60Z" transform="translate(-60 0) scale(.62) translate(310 330)" fill="#0f3a25"/></g>`)
  };
  let cur = null;
  const show = id => {
    const k = S[id] ? id : 'aizen'; let el = box.querySelector(`.scn[data-t="${k}"]`);
    if (!el) { box.insertAdjacentHTML('beforeend', S[k]()); el = box.querySelector(`.scn[data-t="${k}"]`); if (k === 'winter') addTree(el); }
    box.querySelectorAll('.scn.on').forEach(o => { if (o !== el) { o.classList.remove('in'); setTimeout(() => { if (!o.classList.contains('in')) o.classList.remove('on'); }, 1300); } });
    el.classList.add('on'); void el.getBoundingClientRect(); el.classList.add('in'); cur = k;
  };
  // decorated Christmas tree (original, generic) next to the cabin
  function addTree(svgEl) {
    const old = svgEl.querySelector('.tree'); if (old) old.remove(); const r = R(77); let t = ''; const bulbs = ['#ff4455', '#ffd86b', '#6bd3ff', '#ff9ad9', '#8aff9a'];
    const tiers = [[430, 560, 150], [430, 520, 118], [430, 485, 88]]; // base-center x, y, half-width
    t += `<rect x="421" y="640" width="18" height="40" fill="#4a2c18"/>`;
    [[430, 680, 118, 110], [430, 600, 96, 100], [430, 530, 70, 90]].forEach(([cx, by, hw, hh], i) => { t += `<path d="M${cx - hw} ${by} L${cx} ${by - hh} L${cx + hw} ${by}Z" fill="${['#0d4a2c', '#10573a', '#146b45'][i]}"/><path d="M${cx - hw} ${by} Q${cx} ${by - 14} ${cx + hw} ${by}" fill="#f4f8ff" opacity=".85"/>`; });
    for (let i = 0; i < 26; i++) { const y = 470 + r() * 205, w = (y - 450) * .5, x = 430 + (r() - .5) * w * 1.5; t += `<circle class="bulb" cx="${x | 0}" cy="${y | 0}" r="5" fill="${bulbs[i % 5]}" style="animation-delay:${(r() * 3).toFixed(1)}s"/>`; }
    t += `<polygon class="star" points="430,420 436,440 457,440 440,452 446,473 430,460 414,473 420,452 403,440 424,440" fill="#ffe27a"/>`;
    // presents under the tree
    const gf = (gx, gy, w, h, c1, c2) => `<rect x="${gx}" y="${gy}" width="${w}" height="${h}" fill="${c1}"/><rect x="${gx + w / 2 - 3}" y="${gy}" width="6" height="${h}" fill="${c2}"/><rect x="${gx}" y="${gy + h / 2 - 3}" width="${w}" height="6" fill="${c2}" opacity=".85"/><path d="M${gx + w / 2} ${gy} q-12 -12 -3 -14 q8 0 3 14 q-5 -14 3 -14 q9 2 -3 14Z" fill="${c2}"/>`;
    t += gf(372, 650, 34, 30, '#d62839', '#ffd86b') + gf(452, 658, 28, 22, '#2a63c4', '#fff') + gf(404, 662, 24, 18, '#17753f', '#ffd86b');
    // string lights + wreath on the cabin
    let cl = ''; for (let i = 0; i < 11; i++) { const px = 134 + i * 20, py = 696 - Math.abs(i - 5.5) * 0 + Math.sin(i) * 0 - (i < 5.5 ? i * 11 : (11 - i) * 11) * .5 + 0; cl += `<circle class="bulb" cx="${px}" cy="${py + 12}" r="4" fill="${bulbs[i % 5]}" style="animation-delay:${(i % 5) * .4}s"/>`; }
    svgEl.insertAdjacentHTML('beforeend', `<g class="tree" transform="translate(0 40)">${t}</g><g transform="translate(0 0)">${cl}<g transform="translate(239 757)"><circle r="12" fill="none" stroke="#1d7a46" stroke-width="6"/><circle cx="-8" cy="-2" r="2.5" fill="#d62839"/><circle cx="7" cy="5" r="2.5" fill="#d62839"/><path d="M-6 12 l6 -3 l6 3 l-6 6Z" fill="#d62839"/></g></g>`);
  }
  document.addEventListener('ez-theme', e => show(e.detail.id));
  const init = (document.body.className.match(/theme-(\w+)/) || [])[1]; show(init || 'aizen');
  window.Scenes = { show };
})();
