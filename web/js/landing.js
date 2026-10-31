/* OQIM AI — landing interaktivligi */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const burger = $('.nav-burger');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- parallax (hero qatlamlari) ---------- */
  const layers = $$('[data-parallax]');
  if (!reduce && layers.length) {
    let ticking = false;
    const update = () => {
      const y = Math.min(scrollY, innerHeight * 1.2);
      layers.forEach(l => { l.style.transform = `translate3d(0, ${y * parseFloat(l.dataset.parallax)}px, 0)`; });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
  }

  /* ---------- soat ---------- */
  const clock = $('#clock');
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('uz-UZ', { hour12: false, timeZone: 'Asia/Tashkent' }); };
  tick(); setInterval(tick, 1000);

  /* ---------- dashboard: chorraha demo ----------
     Notebookdagi muhit qoidalari: kelish Poisson(8)/Poisson(6),
     harakatlar 8/15 mashina o‘tkazadi, mukofot = 10 − 0.5·jami − 0.3·|NS−EW| */
  const poisson = l => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  const ACTIONS = [[8, 0], [0, 8], [15, 0], [0, 15]];
  const LABELS = ['NS · qisqa yashil', 'EW · qisqa yashil', 'NS · uzun yashil', 'EW · uzun yashil'];
  const reward = (ns, ew) => 10 - 0.5 * (ns + ew) - 0.3 * Math.abs(ns - ew);
  let ns = 21, ew = 9;

  const qRows = $$('#qvals > div');
  const sig = $('#sig');
  const events = $('#events');
  const EVENT_POOL = [
    ['g', 'A-12 fazasi almashdi'], ['r', 'Chorsu: zona aniqlandi'], ['a', 'Tez yordam marshruti'],
    ['g', 'Oybek: navbat kamaydi'], ['r', 'Bunyodkor: zichlik oshdi'], ['g', 'Yashil to‘lqin yakunlandi'],
    ['a', 'GPS: yangi qurilma ulandi'], ['g', 'Minor: faza optimallashdi']
  ];
  let evI = 3;

  function cycle() {
    ns += poisson(8); ew += poisson(6);
    // har harakat uchun bir qadam oldinga baho (Q ning soddalashtirilgan ko‘rinishi)
    const q = ACTIONS.map(([a, b]) => {
      const n = Math.max(0, ns - a), e = Math.max(0, ew - b);
      return reward(n, e) + 0.99 * reward(n + 8, e + 6) * .5;
    });
    const best = q.indexOf(Math.max(...q));
    const lo = Math.min(...q), hi = Math.max(...q);
    qRows.forEach((r, i) => {
      r.classList.toggle('best', i === best);
      $('b', r).style.width = `${18 + 82 * (q[i] - lo) / (hi - lo || 1)}%`;
      $('em', r).textContent = q[i].toFixed(1);
    });
    $('#stateVec').textContent = `[${(ns / 50).toFixed(2)}, ${(ew / 50).toFixed(2)}, ${((Date.now() / 2000 | 0) % 10 / 10).toFixed(1)}]`;
    $('#decision').textContent = LABELS[best];
    sig.dataset.phase = best % 2 === 0 ? 'ns' : 'ew';

    $('#qNS').textContent = ns; $('#qEW').textContent = ew;
    $('#barNS').style.width = `${Math.min(100, ns / 50 * 100)}%`;
    $('#barEW').style.width = `${Math.min(100, ew / 50 * 100)}%`;

    const [a, b] = ACTIONS[best];
    ns = Math.max(0, ns - a); ew = Math.max(0, ew - b);

    if (Math.random() < .5) {
      const [c, t] = EVENT_POOL[evI++ % EVENT_POOL.length];
      const li = document.createElement('li');
      li.innerHTML = `<i class="${c}"></i>${t}`;
      events.prepend(li);
      while (events.children.length > 3) events.lastElementChild.remove();
    }
  }
  cycle();
  setInterval(cycle, 2200);

  /* ---------- statistik sanagichlar ---------- */
  const fmt = n => n.toLocaleString('ru-RU').replace(/,/g, ' ');
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      const t0 = performance.now(), dur = reduce ? 0 : 1600;
      const step = now => {
        const k = dur ? Math.min(1, (now - t0) / dur) : 1;
        el.textContent = pre + fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Q-bar tile ---------- */
  const tileBars = $$('#tileQ > div');
  setInterval(() => {
    const h = tileBars.map(() => 20 + Math.random() * 50);
    const best = Math.floor(Math.random() * 4);
    h[best] = 82 + Math.random() * 12;
    tileBars.forEach((d, i) => { d.classList.toggle('best', i === best); $('i', d).style.setProperty('--h', h[i] + '%'); });
  }, 2600);

  /* ---------- DBSCAN tile (haqiqiy DBSCAN, brauzerda) ---------- */
  const cv = $('#dbscan');
  if (cv) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    let pts = [];
    const seed = () => {
      pts = [];
      const centers = [[W * .28, H * .38, 22], [W * .7, H * .62, 26], [W * .55, H * .25, 14]];
      centers.forEach(([cx, cy, s]) => { for (let i = 0; i < 38; i++) pts.push({ x: cx + gauss() * s, y: cy + gauss() * s, vx: 0, vy: 0 }); });
      for (let i = 0; i < 70; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0 });
      pts.forEach(p => { p.vx = (Math.random() - .5) * .35; p.vy = (Math.random() - .5) * .35; });
    };
    const dbscan = (eps, minPts) => {
      const lab = new Array(pts.length).fill(undefined);
      const nb = i => pts.reduce((a, p, j) => ((p.x - pts[i].x) ** 2 + (p.y - pts[i].y) ** 2 <= eps * eps && a.push(j), a), []);
      let c = 0;
      for (let i = 0; i < pts.length; i++) {
        if (lab[i] !== undefined) continue;
        const n = nb(i);
        if (n.length < minPts) { lab[i] = -1; continue; }
        lab[i] = c;
        const q = [...n];
        while (q.length) {
          const j = q.pop();
          if (lab[j] === -1) lab[j] = c;
          if (lab[j] !== undefined) continue;
          lab[j] = c;
          const n2 = nb(j);
          if (n2.length >= minPts) q.push(...n2);
        }
        c++;
      }
      return lab;
    };
    const COLORS = ['#e5534b', '#f2a07b', '#f0a43a'];
    let frame = 0, labels = [];
    seed();
    const draw = () => {
      if (frame % 20 === 0) labels = dbscan(30, 7);
      ctx.clearRect(0, 0, W, H);
      const groups = {};
      pts.forEach((p, i) => { if (labels[i] >= 0) (groups[labels[i]] ||= []).push(p); });
      Object.entries(groups).forEach(([k, g]) => {
        const cx = g.reduce((s, p) => s + p.x, 0) / g.length, cy = g.reduce((s, p) => s + p.y, 0) / g.length;
        const r = Math.max(...g.map(p => Math.hypot(p.x - cx, p.y - cy))) + 14;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0, COLORS[k % 3] + '33'); grd.addColorStop(1, COLORS[k % 3] + '00');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      });
      pts.forEach((p, i) => {
        ctx.fillStyle = labels[i] >= 0 ? COLORS[labels[i] % 3] : 'rgba(244,239,233,.28)';
        ctx.beginPath(); ctx.arc(p.x, p.y, labels[i] >= 0 ? 3.2 : 2.2, 0, 7); ctx.fill();
        if (!reduce) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
        }
      });
      frame++;
      if (!reduce) requestAnimationFrame(draw);
    };
    draw();
  }

  /* ---------- epsilon grafigi ---------- */
  const line = $('#epsLine'), dot = $('#epsDot'), epsVal = $('#epsVal');
  if (line) {
    const X = ep => 40 + ep / 500 * 410;
    const Y = e => 190 - e * 170;
    const eps = ep => Math.max(0.01, Math.pow(0.99, ep));
    const path = upTo => {
      let d = '';
      for (let ep = 0; ep <= upTo; ep++) d += (ep ? 'L' : 'M') + X(ep).toFixed(1) + ' ' + Y(eps(ep)).toFixed(1);
      return d;
    };
    const play = () => {
      const t0 = performance.now(), dur = reduce ? 1 : 3200;
      const step = now => {
        const k = Math.min(1, (now - t0) / dur), ep = Math.round(k * 500);
        line.setAttribute('d', path(ep));
        dot.setAttribute('cx', X(ep)); dot.setAttribute('cy', Y(eps(ep)));
        epsVal.textContent = `ep ${ep} · ε = ${eps(ep).toFixed(3)}`;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const eio = new IntersectionObserver(es => { if (es[0].isIntersecting) { play(); eio.disconnect(); } }, { threshold: .5 });
    eio.observe($('#epsChart'));
  }
})();
