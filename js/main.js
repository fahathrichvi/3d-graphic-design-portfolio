/* =========================================================
   FAHATH — UI interactions
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.body.classList.add('loading');
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Loader ---------- */
  const loader = $('#loader');
  const pctEl = $('#loaderPct');
  let pct = 0, sceneReady = false, loaderDone = false;
  const minTime = performance.now() + 1400;

  const tick = () => {
    const target = sceneReady ? 100 : 88;
    pct += (target - pct) * (sceneReady ? 0.18 : 0.04);
    pctEl.textContent = Math.round(pct);
    if (sceneReady && pct > 99.4 && performance.now() > minTime) return finishLoader();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    pctEl.textContent = 100;
    loader.classList.add('done');
    document.body.classList.remove('loading');
    setTimeout(() => $$('.hero [data-reveal]').forEach((el, i) => {
      el.style.setProperty('--d', `${i * 0.08}s`);
      el.classList.add('in');
    }), 150);
  }
  window.addEventListener('scene-ready', () => { sceneReady = true; });
  setTimeout(() => { sceneReady = true; }, 5000); // never block on a slow CDN

  /* ---------- Reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      if (e.target.closest('.hero') && !loaderDone) return;
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  // stagger siblings inside grids
  $$('.services__grid, .work__grid, .timeline, .about__cols').forEach((grid) => {
    $$('[data-reveal]', grid).forEach((el, i) => el.style.setProperty('--d', `${(i % 4) * 0.08}s`));
  });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  /* ---------- Counters ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, start = performance.now(), dur = 1600;
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Hero word rotator ---------- */
  const rot = $('#rotator');
  const words = ['move', 'glow', 'sell', 'inspire', 'speak'];
  let wi = 0;
  if (rot && !reduceMotion) {
    setInterval(() => {
      rot.classList.add('out');
      setTimeout(() => {
        wi = (wi + 1) % words.length;
        rot.firstElementChild.textContent = words[wi];
        rot.classList.remove('out');
        rot.classList.add('pre');
        rot.offsetWidth; // reflow
        rot.classList.remove('pre');
      }, 550);
    }, 2600);
  }

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('#navLinks a').forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
  }));

  const links = $$('#navLinks a');
  const sectIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectIO.observe(s));

  /* ---------- Scroll progress ---------- */
  const bar = $('#progressBar');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    bar.style.transform = `scaleX(${p})`;
    nav.classList.toggle('scrolled', scrollY > 30);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Cursor ---------- */
  if (finePointer && !reduceMotion) {
    const cursor = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const loop = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('hover', !!e.target.closest('a, button, .card, .filter, select, .tool'));
    });
  }

  /* ---------- 3D tilt ---------- */
  if (finePointer && !reduceMotion) {
    $$('.tilt').forEach((el) => {
      if (el.classList.contains('card')) el.insertAdjacentHTML('beforeend', '<span class="card__glare"></span>');
      const max = el.classList.contains('card') ? 8 : 6;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transition = 'transform .1s linear';
        el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateZ(0)`;
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
        el.style.setProperty('--gx', `${x * 100}%`);
        el.style.setProperty('--gy', `${y * 100}%`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)';
        el.style.transform = '';
      });
    });

    /* magnetic buttons */
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Work filter ---------- */
  const cards = $$('.card');
  $$('.filter').forEach((btn) => btn.addEventListener('click', () => {
    $$('.filter').forEach((b) => b.classList.toggle('active', b === btn));
    const f = btn.dataset.filter;
    cards.forEach((c) => {
      const show = f === 'all' || c.dataset.cat === f;
      c.classList.toggle('hide', !show);
      if (show) { c.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('in'))); }
    });
  }));

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox'), lbMedia = $('#lbMedia');
  const openLB = (card) => {
    const media = $('.card__media', card);
    lbMedia.className = `lightbox__media ${[...media.classList].filter((c) => c.startsWith('art-')).join(' ')}`;
    lbMedia.innerHTML = '';
    const img = $('img', media);
    if (img) lbMedia.appendChild(Object.assign(new Image(), { src: img.src, alt: $('h3', card).textContent }));
    else lbMedia.innerHTML = `<span class="card__glyph">${$('.card__glyph', media).textContent}</span>`;
    $('#lbCat').textContent = $('figcaption small', card).textContent;
    $('#lbTitle').textContent = $('h3', card).textContent;
    $('#lbDesc').textContent = card.dataset.desc || '';
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeLB = () => {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  cards.forEach((c) => c.addEventListener('click', () => openLB(c)));
  $('#lbClose').addEventListener('click', closeLB);
  $('#lbCta').addEventListener('click', closeLB);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLB(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLB(); });

  /* ---------- Contact form (mailto) ---------- */
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    const subject = `New project enquiry — ${d.get('service')}`;
    const body = `Hi Fahath,\n\n${d.get('message')}\n\n— ${d.get('name')}\n${d.get('email')}`;
    location.href = `mailto:fahathrichvi7@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const note = $('#formNote');
    note.textContent = 'Thank you! Your email app should open now.';
    note.classList.add('ok');
  });
})();
