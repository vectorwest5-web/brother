/* حالت «فقط مشاهده» برای هاست‌های ثابت مثل GitHub Pages: وقتی سرور پایتون نیست، درخواست‌های /api/ از static-data.json جواب داده می‌شوند. */
(() => {
  const realFetch = window.fetch.bind(window); let mode = null, data = null;
  const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } });
  const ok = () => { try { return sessionStorage.getItem('ez_static_ok') === '1'; } catch { return false; } };
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const probe = async () => {
    if (mode) return mode;
    try { const r = await realFetch('api/session', { cache: 'no-store' }); if (r.ok && (r.headers.get('content-type') || '').includes('json')) return (mode = 'server'); } catch (e) {}
    try { const r = await realFetch('static-data.json', { cache: 'no-cache' }); if (r.ok) { data = await r.json(); return (mode = 'static'); } } catch (e) {}
    return (mode = 'server');
  };
  window.fetch = async function (input, opts) {
    const url = typeof input === 'string' ? input : (input && input.url) || '', i = url.indexOf('/api/');
    if (i < 0) return realFetch(input, opts);
    if ((await probe()) === 'server') return realFetch(input, opts);
    const p = url.slice(i).split('?')[0], post = opts && /post/i.test(opts.method || '');
    if (p === '/api/config-public') return json({ person_name: data.person_name });
    if (p === '/api/session') return json({ logged_in: ok(), admin: false });
    if (p === '/api/login' && post) {
      let d = {}; try { d = JSON.parse(opts.body || '{}'); } catch (e) {}
      if (await sha(String(d.name || '').trim().toLowerCase() + '|' + (d.birthdate || '')) === data.hash) { try { sessionStorage.setItem('ez_static_ok', '1'); } catch (e) {} return json({ ok: true }); }
      return json({ error: 'نام یا تاریخ تولد درست نیست.' }, 401);
    }
    if (post) return json({ error: 'این نسخه‌ی آنلاین فقط برای مشاهده است.' }, 403);
    if (!ok()) return json({ error: 'ابتدا وارد شو.' }, 401);
    if (p === '/api/content') return json(data.content);
    if (p === '/api/music') return json(data.music);
    if (p === '/api/videos') return json(data.videos);
    if (p === '/api/cards') return json(data.cards);
    if (p === '/api/profile') return json(data.profile);
    const m = p.match(/^\/api\/kv\/([a-z]+)$/); if (m) return json(data.kv[m[1]] || {});
    return json({ error: 'پیدا نشد.' }, 404);
  };
})();
