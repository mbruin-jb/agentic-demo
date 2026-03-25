/* ─────────────────────────────────────────────────────────────────────────────
   Agentic Coding Skills — Canvas Scroll Showcase
   Frontend-Nate engine: Lenis + GSAP ScrollTrigger + Canvas frame animation
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);

  /* ── Config ────────────────────────────────────────────────────────────── */
  const FRAME_COUNT = 96;
  const FRAME_SPEED = 2.0; // Animation completes by ~55% scroll
  const IMAGE_SCALE = 0.88; // Padded cover mode

  /* ── Lenis ─────────────────────────────────────────────────────────────── */
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ── DOM ────────────────────────────────────────────────────────────────── */
  const scrollContainer = document.getElementById('scroll-container');
  const heroSection = document.getElementById('hero');
  const canvasWrap = document.getElementById('canvas-wrap');
  const canvas = document.getElementById('scroll-canvas');
  const ctx = canvas.getContext('2d');
  const darkOverlay = document.getElementById('dark-overlay');
  const progressBar = document.getElementById('progress-bar');
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loader-fill');
  const contentSections = document.querySelectorAll(
    '.section-content, .section-gallery, .section-marquee, .section-stats, .section-cta'
  );

  /* ── Frame loading ─────────────────────────────────────────────────────── */
  const frames = [];
  let currentFrame = -1;
  let bgColor = '#0A0F1C';

  function loadFrames() {
    let loaded = 0;
    return new Promise((resolve) => {
      for (let i = 1; i <= FRAME_COUNT; i++) {
        const img = new Image();
        img.onload = () => {
          loaded++;
          loaderFill.style.width = ((loaded / FRAME_COUNT) * 100) + '%';
          if (loaded === FRAME_COUNT) resolve();
        };
        img.onerror = () => {
          loaded++;
          if (loaded === FRAME_COUNT) resolve();
        };
        img.src = `scroll-frames/frame_${String(i).padStart(4, '0')}.jpg`;
        frames[i - 1] = img;
      }
    });
  }

  /* ── Canvas rendering (full cover, high-DPI) ────────────────────── */
  let canvasDPR = 1;

  function resizeCanvas() {
    canvasDPR = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * canvasDPR;
    canvas.height = window.innerHeight * canvasDPR;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    if (currentFrame >= 0) drawFrame(currentFrame);
  }

  function drawFrame(index) {
    const img = frames[index];
    if (!img || !img.complete) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    // Full cover — no padding, fill entire viewport
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ── Hero entrance ─────────────────────────────────────────────────── */
  function animateHeroEntrance() {
    const tl = gsap.timeline({ delay: 0.15 });
    tl.to('.hero-label', { opacity: 1, duration: 0.5, ease: 'power2.out' })
      .to('.hero-word', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12 }, '-=0.3')
      .to('.hero-sub', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3')
      .to('.hero-scroll-hint', { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.2');
  }

  /* ── Hero exit + canvas circle-wipe reveal ─────────────────────────── */
  function initHeroAndCanvas() {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        progressBar.style.width = (p * 100) + '%';

        // Hero fades out fast
        heroSection.style.opacity = Math.max(0, 1 - p * 15);
        heroSection.style.pointerEvents = p > 0.06 ? 'none' : 'auto';

        // Canvas circle-wipe reveal
        const wipeProgress = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
        const radius = wipeProgress * 75;
        canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;

        // Frame animation (accelerated: completes by ~55% scroll)
        const accelerated = Math.min(p * FRAME_SPEED, 1);
        const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
        if (index !== currentFrame && index >= 0) {
          currentFrame = index;
          requestAnimationFrame(() => drawFrame(currentFrame));
        }
      }
    });
  }

  /* ── Section visibility ────────────────────────────────────────────── */
  function initSections() {
    contentSections.forEach(section => {
      const enter = parseFloat(section.dataset.enter) / 100;
      const leave = parseFloat(section.dataset.leave) / 100;
      const persist = section.dataset.persist === 'true';
      const animType = section.dataset.animation;
      const children = section.querySelectorAll(
        '.section-label, .section-heading, .section-body, .section-note, .cta-heading, .cta-body, .cta-platforms, .stat, .gallery-img, .code-block, .app-tags'
      );

      gsap.set(children, { opacity: 0 });
      let hasAnimated = false;

      ScrollTrigger.create({
        trigger: scrollContainer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          const fadeIn = 0.025;
          const fadeOut = 0.025;
          let opacity = 0;

          if (p >= enter - fadeIn && p <= enter) opacity = (p - (enter - fadeIn)) / fadeIn;
          else if (p > enter && p < leave) opacity = 1;
          else if (p >= leave && p <= leave + fadeOut) opacity = persist ? 1 : 1 - ((p - leave) / fadeOut);
          else if (p > leave + fadeOut && persist) opacity = 1;

          section.style.opacity = opacity;
          section.classList.toggle('visible', opacity > 0.1);

          if (opacity > 0.5 && !hasAnimated && children.length > 0) {
            hasAnimated = true;
            animateChildren(children, animType);
          }
        }
      });
    });
  }

  function animateChildren(children, type) {
    const fromProps = {
      'fade-up': { y: 50 }, 'slide-left': { x: -80 }, 'slide-right': { x: 80 },
      'scale-up': { scale: 0.85 }, 'rotate-in': { y: 40, rotation: 3 },
      'stagger-up': { y: 60 }, 'clip-reveal': { clipPath: 'inset(100% 0 0 0)' }
    };
    const timing = {
      'fade-up': { duration: 0.9, ease: 'power3.out', stagger: 0.12 },
      'slide-left': { duration: 0.9, ease: 'power3.out', stagger: 0.14 },
      'slide-right': { duration: 0.9, ease: 'power3.out', stagger: 0.14 },
      'scale-up': { duration: 1.0, ease: 'power2.out', stagger: 0.12 },
      'rotate-in': { duration: 0.9, ease: 'power3.out', stagger: 0.1 },
      'stagger-up': { duration: 0.8, ease: 'power3.out', stagger: 0.1 },
      'clip-reveal': { duration: 1.2, ease: 'power4.inOut', stagger: 0.15 }
    };
    const from = { opacity: 0, ...(fromProps[type] || fromProps['fade-up']) };
    const to = { opacity: 1, y: 0, x: 0, scale: 1, rotation: 0, clipPath: 'inset(0% 0 0 0)', ...(timing[type] || timing['fade-up']) };
    gsap.fromTo(children, from, to);
  }

  /* ── Dark overlay for stats ────────────────────────────────────────── */
  function initDarkOverlay() {
    const enter = 0.76, leave = 0.89, fadeRange = 0.04;
    ScrollTrigger.create({
      trigger: scrollContainer, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let o = 0;
        if (p >= enter - fadeRange && p <= enter) o = 0.9 * ((p - (enter - fadeRange)) / fadeRange);
        else if (p > enter && p < leave) o = 0.9;
        else if (p >= leave && p <= leave + fadeRange) o = 0.9 * (1 - ((p - leave) / fadeRange));
        darkOverlay.style.opacity = o;
      }
    });
  }

  /* ── Counters ──────────────────────────────────────────────────────── */
  function initCounters() {
    document.querySelectorAll('.stat-number').forEach(el => { el.textContent = '0'; el._counted = false; });
    ScrollTrigger.create({
      trigger: scrollContainer, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        if (self.progress > 0.78 && self.progress < 0.90) {
          document.querySelectorAll('.stat-number').forEach(el => {
            if (el._counted) return;
            el._counted = true;
            const target = parseInt(el.dataset.value);
            const obj = { val: 0 };
            gsap.to(obj, {
              val: target, duration: 2, ease: 'power1.out',
              onUpdate: () => { el.textContent = Math.round(obj.val); }
            });
          });
        }
      }
    });
  }

  /* ── Marquees ──────────────────────────────────────────────────────── */
  function initMarquees() {
    document.querySelectorAll('.marquee-wrap').forEach(el => {
      const speed = parseFloat(el.dataset.scrollSpeed) || -25;
      const text = el.querySelector('.marquee-text');
      text.textContent = text.textContent.repeat(4);
      gsap.to(text, {
        xPercent: speed, ease: 'none',
        scrollTrigger: { trigger: scrollContainer, start: 'top top', end: 'bottom bottom', scrub: true }
      });
    });
  }

  /* ── Boot ──────────────────────────────────────────────────────────── */
  async function boot() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    await loadFrames();
    loader.classList.add('done');

    // Draw first frame
    if (frames[0]) { currentFrame = 0; drawFrame(0); }

    animateHeroEntrance();
    initHeroAndCanvas();
    initSections();
    initDarkOverlay();
    initCounters();
    initMarquees();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
