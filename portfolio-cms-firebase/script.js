/* ============================================================
   MOHAMED AYAS — PORTFOLIO SCRIPT
   Loads live content from Firestore (via cms-content.js), renders
   every dynamic section, then wires up all interactivity.
   No external libraries beyond the Firebase SDK.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. UTILITIES
  --------------------------------------------------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Escape user-authored admin content before dropping it into innerHTML.
  const esc = (str) => String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initThemeToggle();
    initCustomCursor();
    initNav();

    const data = (window.CMS_READY ? window.CMS_READY : Promise.resolve(null));
    data.then((content) => {
      renderFromData(content || {});

      initSmoothAnchors();
      initTypingHero();
      initScrollReveals();
      initCounters();
      initSkillBars();
      initPortfolioFilter();
      initPortfolioModal();
      initTestimonialSlider();
      initContactForm();
      initBackToTop();
      $('#year') && ($('#year').textContent = new Date().getFullYear());
    });
  });

  /* ---------------------------------------------------------
     1. LOADING SCREEN
  --------------------------------------------------------- */
  function initLoader() {
    const loader = $('#loader');
    if (!loader) return;
    const hide = () => loader.classList.add('loaded');
    window.addEventListener('load', () => setTimeout(hide, 400));
    // Safety net in case 'load' is delayed by slow assets
    setTimeout(hide, 2500);
  }

  /* ---------------------------------------------------------
     2. DARK / LIGHT MODE TOGGLE
  --------------------------------------------------------- */
  function initThemeToggle() {
    const toggle = $('#themeToggle');
    const root = document.documentElement;
    const saved = localStorageGet('ayas-theme');

    if (saved === 'light') root.setAttribute('data-theme', 'light');

    toggle && toggle.addEventListener('click', () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) {
        root.removeAttribute('data-theme');
        localStorageSet('ayas-theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
        localStorageSet('ayas-theme', 'light');
      }
    });
  }

  // Guarded localStorage helpers (works in normal browser context;
  // fails silently in sandboxed/private contexts rather than throwing)
  function localStorageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function localStorageSet(key, val) {
    try { window.localStorage.setItem(key, val); } catch (e) { /* no-op */ }
  }

  /* ---------------------------------------------------------
     3. CUSTOM CURSOR DOT (decorative, desktop only)
  --------------------------------------------------------- */
  function initCustomCursor() {
    const dot = $('#cursorDot');
    if (!dot || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    window.addEventListener('mousemove', (e) => {
      dot.style.opacity = '1';
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
    });

    $$('a, button, .portfolio-card, .skill-card').forEach((el) => {
      el.addEventListener('mouseenter', () => dot.style.transform = 'translate(-50%,-50%) scale(2.2)');
      el.addEventListener('mouseleave', () => dot.style.transform = 'translate(-50%,-50%) scale(1)');
    });
  }

  /* ---------------------------------------------------------
     4. STICKY NAV + ACTIVE LINK + MOBILE BURGER
  --------------------------------------------------------- */
  function initNav() {
    const nav = $('#nav');
    const burger = $('#navBurger');
    const links = $('#navLinks');
    const navLinkEls = $$('.nav-link');
    const sections = $$('main section[id]');

    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 30);
      updateBackToTop();
      updateActiveLink();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    burger && burger.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    navLinkEls.forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });

    function updateActiveLink() {
      let current = sections[0];
      const offset = 140;
      sections.forEach((sec) => {
        if (window.scrollY + offset >= sec.offsetTop) current = sec;
      });
      navLinkEls.forEach((link) => {
        link.classList.toggle('active-link', current && link.getAttribute('href') === '#' + current.id);
      });
    }
  }

  /* ---------------------------------------------------------
     5. SMOOTH SCROLL FOR ANCHOR LINKS (CSS handles most of it;
        this adds a header-offset correction)
  --------------------------------------------------------- */
  function initSmoothAnchors() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (id.length < 2) return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.pageYOffset - 84;
        window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------------------------------------------------------
     6. TYPING ANIMATION (hero accent word cycles)
  --------------------------------------------------------- */
  function initTypingHero() {
    const el = $('.hero-title-accent');
    if (!el || prefersReducedMotion) return;

    const words = ['Growth', 'Strategy', 'Engagement', 'Revenue'];
    let wordIndex = 0;
    let charIndex = words[0].length;
    let deleting = false;

    function tick() {
      const word = words[wordIndex];
      if (!deleting) {
        charIndex++;
        if (charIndex > word.length) {
          deleting = true;
          setTimeout(tick, 1800);
          return;
        }
      } else {
        charIndex--;
        if (charIndex < 1) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          setTimeout(tick, 400);
          return;
        }
      }
      el.textContent = word.slice(0, charIndex);
      setTimeout(tick, deleting ? 55 : 95);
    }
    setTimeout(tick, 2600); // let the page-load sequence settle first
  }

  /* ---------------------------------------------------------
     7. SCROLL REVEAL ANIMATIONS
  --------------------------------------------------------- */
  function initScrollReveals() {
    const targets = $$(
      '.section-head, .about-photo, .about-content, .skill-card, .tool-badge, .service-card, ' +
      '.portfolio-card, .timeline-item, .contact-info, .contact-form, .achievement-card'
    );
    targets.forEach((el) => el.classList.add('reveal'));

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // simple stagger within a grid based on DOM order
          const delay = Math.min(Array.prototype.indexOf.call(entry.target.parentNode.children, entry.target), 6) * 70;
          setTimeout(() => entry.target.classList.add('in'), delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    targets.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     8. ANIMATED COUNTERS (hero stats + achievements)
  --------------------------------------------------------- */
  function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length) return;

    const animate = (el) => {
      const target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (prefersReducedMotion) { el.textContent = target; return; }

      const duration = 1400;
      const start = performance.now();

      function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = target;
      }
      requestAnimationFrame(frame);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animate);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach((c) => observer.observe(c));
  }

  /* ---------------------------------------------------------
     9. ANIMATED SKILL PERCENTAGE BARS
  --------------------------------------------------------- */
  function initSkillBars() {
    const bars = $$('.skill-bar-fill');
    if (!bars.length) return;

    const fill = (bar) => { bar.style.width = bar.getAttribute('data-width') + '%'; };

    if (!('IntersectionObserver' in window)) {
      bars.forEach(fill);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          fill(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    bars.forEach((b) => observer.observe(b));
  }

  /* ---------------------------------------------------------
     10. PORTFOLIO FILTERING
  --------------------------------------------------------- */
  function initPortfolioFilter() {
    const buttons = $$('.filter-btn');
    const cards = $$('.portfolio-card');
    if (!buttons.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        const filter = btn.getAttribute('data-filter');
        cards.forEach((card) => {
          const match = filter === 'all' || card.getAttribute('data-category') === filter;
          card.classList.toggle('hide', !match);
        });
      });
    });
  }

  /* ---------------------------------------------------------
     11. PORTFOLIO PROJECT MODAL
  --------------------------------------------------------- */
  function initPortfolioModal() {
    const overlay = $('#modalOverlay');
    const closeBtn = $('#modalClose');
    const titleEl = $('#modalTitle');
    const descEl = $('#modalDesc');
    const tagEl = $('#modalTag');
    const tagsWrap = $('#modalTags');
    if (!overlay) return;

    $$('.portfolio-card').forEach((card) => {
      card.addEventListener('click', () => {
        titleEl.textContent = card.getAttribute('data-title') || '';
        descEl.textContent = card.getAttribute('data-desc') || '';
        const category = card.getAttribute('data-category') || '';
        tagEl.textContent = category.charAt(0).toUpperCase() + category.slice(1);

        tagsWrap.innerHTML = '';
        (card.getAttribute('data-tags') || '').split(',').forEach((tag) => {
          tag = tag.trim();
          if (!tag) return;
          const span = document.createElement('span');
          span.textContent = tag;
          tagsWrap.appendChild(span);
        });

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    const close = () => {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    };
    closeBtn && closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---------------------------------------------------------
     12. TESTIMONIAL SLIDER
  --------------------------------------------------------- */
  function initTestimonialSlider() {
    const track = $('#testimonialTrack');
    const dotsWrap = $('#testimonialDots');
    if (!track) return;

    const slides = $$('.testimonial-slide', track);
    if (!slides.length) return;
    let index = 0;
    let timer;

    dotsWrap.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', 'Show testimonial ' + (i + 1));
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = $$('button', dotsWrap);

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle('active', di === index));
    }

    function next() { goTo(index + 1); }

    function startAuto() {
      if (prefersReducedMotion || slides.length < 2) return;
      stopAuto();
      timer = setInterval(next, 5500);
    }
    function stopAuto() { if (timer) clearInterval(timer); }

    const slider = $('.testimonial-slider');
    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);

    startAuto();
  }

  /* ---------------------------------------------------------
     13. CONTACT FORM VALIDATION (client-side only — no backend)
  --------------------------------------------------------- */
  function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;
    const successMsg = $('#formSuccess');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      $$('.form-field', form).forEach((field) => {
        const input = $('input, textarea', field);
        if (!input) return;
        let fieldValid = input.value.trim().length > 1;
        if (input.type === 'email') {
          fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        }
        field.classList.toggle('error', !fieldValid);
        if (!fieldValid) valid = false;
      });

      if (!valid) {
        successMsg.classList.remove('show');
        return;
      }

      successMsg.classList.add('show');
      form.reset();
      $$('.form-field', form).forEach((f) => f.classList.remove('error'));

      setTimeout(() => successMsg.classList.remove('show'), 6000);
    });

    // Clear error state as the user types
    $$('input, textarea', form).forEach((input) => {
      input.addEventListener('input', () => {
        const field = input.closest('.form-field');
        if (field) field.classList.remove('error');
      });
    });
  }

  /* ---------------------------------------------------------
     14. BACK TO TOP BUTTON
  --------------------------------------------------------- */
  function initBackToTop() {
    const btn = $('#backToTop');
    if (!btn) return;
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  function updateBackToTop() {
    const btn = $('#backToTop');
    if (!btn) return;
    btn.classList.toggle('show', window.scrollY > 600);
  }

  /* ---------------------------------------------------------
     15. ICONS — small inline-SVG library keyed by name, reused
         across dynamically rendered services / portfolio / tools
  --------------------------------------------------------- */
  const ICONS = {
    strategy:  '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    meta:      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16"/>',
    search:    '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    social:    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-3.2M8.6 13.4l6.8 3.2"/>',
    design:    '<path d="M3 3h18v14H3zM3 21h18M8 17l-2 4M16 17l2 4"/>',
    video:     '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 9l5-3v12l-5-3"/>',
    webdesign: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="7" cy="6.5" r=".6" fill="currentColor" stroke="none"/>',
    webdev:    '<path d="M8 9l-5 3 5 3M16 9l5 3-5 3M13 5l-2 14"/>',
    leadgen:   '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    consult:   '<path d="M21 11.5a8.5 8.5 0 11-3.8-7.1L21 6"/><path d="M21 4v4h-4"/>',
    marketing: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    web:       '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
    sparkle:   '<path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
    squares:   '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'
  };
  const SERVICE_ICON_ORDER = ['strategy', 'meta', 'search', 'social', 'design', 'video', 'webdesign', 'webdev', 'leadgen', 'consult'];
  const PORTFOLIO_ICON_BY_CATEGORY = { marketing: 'marketing', design: 'sparkle', web: 'web', video: 'video' };
  const SOCIAL_ICONS = {
    linkedin: '<path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/>',
    facebook: '<path d="M22 12a10 10 0 10-11.56 9.87v-6.98H7.9v-2.89h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.89h-2.34v6.98A10 10 0 0022 12z"/>',
    instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
    whatsapp: '<path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.2-.6.9-.8 1-.1.2-.3.2-.5.1-1.4-.7-2.4-1.3-3.3-2.9-.1-.2-.1-.4.1-.6.2-.2.4-.5.6-.8.1-.2.1-.4 0-.6-.1-.2-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.2-.7.4-.7.7-1 1.5-1 2.5.1 1.1.6 2.2 1.4 3.2 1.6 2 3.5 3.2 5.8 3.8.6.1 1.2.1 1.6 0 .6-.1 1.6-.7 1.9-1.3.3-.6.3-1.2.2-1.3-.1-.2-.3-.2-.5-.3zM12 2a10 10 0 00-8.6 15.1L2 22l5.1-1.3A10 10 0 1012 2z"/>',
    behance:  '<path d="M9.5 12.3c.8-.4 1.3-1.1 1.3-2.1 0-1.9-1.4-2.7-3.1-2.7H2v10.9h5.9c1.9 0 3.6-1 3.6-3 0-1.4-.7-2.6-2-3.1zM4.3 9.2h2.6c.7 0 1.4.3 1.4 1.1 0 .8-.5 1.2-1.4 1.2H4.3V9.2zm2.9 7.4H4.3v-2.7h2.9c.9 0 1.6.4 1.6 1.3 0 .9-.7 1.4-1.6 1.4zM21.9 13.8c0-2.5-1.4-4.6-4.1-4.6-2.6 0-4.4 2-4.4 4.5 0 2.7 1.9 4.5 4.5 4.5 1.6 0 3-.7 3.7-2.1l-1.9-.6c-.3.6-.9 1-1.7 1-1.1 0-1.9-.7-2-1.9h5.9c0-.3 0-.6 0-.8zm-5.8-.9c.2-1 .9-1.6 1.8-1.6.9 0 1.5.7 1.6 1.6h-3.4zM13.6 7.4h5v1.1h-5z"/>'
  };

  /* ---------------------------------------------------------
     16. RENDER — builds every dynamic section from the content
         object loaded by cms-content.js (window.CMS_READY)
  --------------------------------------------------------- */
  function renderFromData(data) {
    renderSiteMeta(data.site);
    renderHeroStats(data.hero);
    renderSkills(data.skills);
    renderTools(data.tools);
    renderServices(data.services);
    renderPortfolio(data.portfolio);
    renderExperience(data.experience);
    renderTestimonials(data.testimonials);
    renderAchievements(data.achievements);
    renderContact(data.site, data.social);
    renderFooterSocial(data.social);
  }

  function renderSiteMeta(site) {
    if (!site) return;
    $$('.nav-logo-text').forEach((el) => el.textContent = site.name || el.textContent);
  }

  function renderHeroStats(hero) {
    const wrap = $('#heroStats');
    if (!wrap || !hero || !Array.isArray(hero.stats)) return;
    wrap.innerHTML = hero.stats.map((s) => `
      <div class="stat-card">
        <span class="stat-number" data-count="${Number(s.count) || 0}">0</span><span class="stat-suffix">${esc(s.suffix || '+')}</span>
        <span class="stat-label">${esc(s.label)}</span>
      </div>`).join('');
  }

  function renderSkills(skills) {
    const wrap = $('#skillsGrid');
    if (!wrap || !Array.isArray(skills)) return;
    wrap.innerHTML = skills.map((s) => `
      <div class="skill-card">
        <div class="skill-top"><span class="skill-name">${esc(s.name)}</span><span class="skill-pct">${Number(s.pct) || 0}%</span></div>
        <div class="skill-bar"><span class="skill-bar-fill" data-width="${Number(s.pct) || 0}"></span></div>
      </div>`).join('');
  }

  function renderTools(tools) {
    const wrap = $('#toolsGrid');
    if (!wrap || !Array.isArray(tools)) return;
    wrap.innerHTML = tools.map((t) => `
      <div class="tool-badge" data-category="${esc(t.category || '')}">
        <span class="tool-name">${esc(t.name)}</span>
        <span class="tool-category">${esc(t.category || '')}</span>
      </div>`).join('');
  }

  function renderServices(services) {
    const wrap = $('#servicesGrid');
    if (!wrap || !Array.isArray(services)) return;
    wrap.innerHTML = services.map((s, i) => {
      const iconKey = s.icon || SERVICE_ICON_ORDER[i % SERVICE_ICON_ORDER.length];
      const path = ICONS[iconKey] || ICONS.sparkle;
      return `
      <article class="service-card">
        <div class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${path}</svg></div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.desc)}</p>
      </article>`;
    }).join('');
  }

  function renderPortfolio(portfolio) {
    const wrap = $('#portfolioGrid');
    if (!wrap || !Array.isArray(portfolio)) return;
    wrap.innerHTML = portfolio.map((p) => {
      const cat = p.category || 'marketing';
      const tagLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
      let thumb;
      if (p.image) {
        thumb = `
          <div class="portfolio-thumb thumb-photo">
            <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">
            <span class="portfolio-thumb-overlay" aria-hidden="true"></span>
            <span class="portfolio-play-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </span>
          </div>`;
      } else {
        const iconKey = PORTFOLIO_ICON_BY_CATEGORY[cat] || 'sparkle';
        thumb = `
          <div class="portfolio-thumb thumb-${esc(cat)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${ICONS[iconKey]}</svg>
          </div>`;
      }
      return `
      <article class="portfolio-card" data-category="${esc(cat)}"
        data-title="${esc(p.title)}"
        data-desc="${esc(p.desc)}"
        data-tags="${esc(p.tags)}">
        ${thumb}
        <div class="portfolio-info">
          <span class="portfolio-tag">${esc(tagLabel)}</span>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.cardText || p.desc)}</p>
        </div>
      </article>`;
    }).join('');
  }

  function renderExperience(experience) {
    const wrap = $('#experienceTimeline');
    if (!wrap || !Array.isArray(experience)) return;
    wrap.innerHTML = experience.map((e) => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <span class="timeline-period">${esc(e.period)}</span>
          <h3>${esc(e.title)}</h3>
          ${e.org ? `<p class="timeline-org">${esc(e.org)}</p>` : ''}
          <p>${esc(e.desc)}</p>
        </div>
      </div>`).join('');
  }

  function renderTestimonials(testimonials) {
    const track = $('#testimonialTrack');
    if (!track || !Array.isArray(testimonials)) return;
    track.innerHTML = testimonials.map((t) => `
      <div class="testimonial-slide">
        <p class="testimonial-quote">${esc(t.quote)}</p>
        <div class="testimonial-author"><strong>${esc(t.author)}</strong><span>${esc(t.org)}</span></div>
      </div>`).join('');
  }

  function renderAchievements(achievements) {
    const wrap = $('#achievementsGrid');
    if (!wrap || !Array.isArray(achievements)) return;
    wrap.innerHTML = achievements.map((a) => `
      <div class="achievement-card">
        <span class="achievement-number" data-count="${Number(a.count) || 0}">0</span><span class="stat-suffix">${esc(a.suffix || '+')}</span>
        <span class="achievement-label">${esc(a.label)}</span>
      </div>`).join('');
  }

  function renderContact(site, social) {
    if (site) {
      const emailRow = $('#contactEmailRow');
      if (emailRow) {
        emailRow.setAttribute('href', 'mailto:' + site.email);
        const val = $('.contact-row-value', emailRow); if (val) val.textContent = site.email;
      }
      const phoneRow = $('#contactPhoneRow');
      if (phoneRow) {
        phoneRow.setAttribute('href', 'tel:' + (site.phoneHref || site.phone));
        const val = $('.contact-row-value', phoneRow); if (val) val.textContent = site.phone;
      }
      const locVal = $('#contactLocationValue');
      if (locVal) locVal.textContent = site.location;
    }
    renderSocialInto('#contactSocialRow', social);
  }

  function renderFooterSocial(social) {
    renderSocialInto('#footerSocialLinks', social, true);
  }

  function renderSocialInto(selector, social, asTextLinks) {
    const wrap = $(selector);
    if (!wrap || !social) return;
    const order = ['linkedin', 'facebook', 'instagram', 'whatsapp', 'behance'];
    wrap.innerHTML = order
      .filter((key) => social[key])
      .map((key) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        if (asTextLinks) {
          return `<a href="${esc(social[key])}" target="_blank" rel="noopener">${label}</a>`;
        }
        return `<a href="${esc(social[key])}" class="social-icon" aria-label="${label}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor">${SOCIAL_ICONS[key] || ''}</svg>
        </a>`;
      }).join('');
  }

})();
