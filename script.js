// ==========================================================
// script.js — vanilla JS, no dependencies
// Background: full-page neural-network canvas + animated
// diagonal light shafts matching the photo's window light.
// Plus: scroll progress, typing, nav, fade-in, counters.
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- Footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ==========================================================
     SCROLL PROGRESS BAR
  ========================================================== */
  const progressBar = document.getElementById("scrollProgress");
  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", updateScrollProgress, { passive: true });

  /* ==========================================================
     FULL-PAGE BACKGROUND CANVAS
     · Animated diagonal light shafts (matching window light
       angle in the profile photo — ~30° from vertical)
     · Neural-network: warm amber nodes + connecting lines
  ========================================================== */
  const bgCanvas = document.getElementById("bgCanvas");
  if (bgCanvas) {
    const ctx = bgCanvas.getContext("2d");
    let W, H;

    function resize() {
      W = bgCanvas.width  = window.innerWidth;
      H = bgCanvas.height = window.innerHeight;
    }

    // ---- Light shafts ----------------------------------------
    // Three diagonal beams at the same angle as the window light
    // in the profile photo.  Each breathes slowly in opacity.
    const SHAFT_ANGLE_DEG = 30;        // degrees from vertical
    const SHAFT_ANGLE_RAD = SHAFT_ANGLE_DEG * Math.PI / 180;

    const shafts = [
      { xRatio: 0.06, halfW: 90,  baseAlpha: 0.055, phase: 0,             speed: 0.00028 },
      { xRatio: 0.38, halfW: 60,  baseAlpha: 0.040, phase: Math.PI * 0.6, speed: 0.00022 },
      { xRatio: 0.68, halfW: 110, baseAlpha: 0.048, phase: Math.PI * 1.3, speed: 0.00031 },
    ];

    function drawShafts(t) {
      ctx.save();
      shafts.forEach(s => {
        const alpha = s.baseAlpha + Math.sin(t * s.speed + s.phase) * s.baseAlpha * 0.65;
        const cx = W * s.xRatio;

        // Rotate canvas around the shaft's centre point then draw
        // a vertical-gradient rectangle — after rotation it becomes
        // the diagonal beam.
        ctx.save();
        ctx.translate(cx, H * 0.5);
        ctx.rotate(SHAFT_ANGLE_RAD);

        const halfH = Math.sqrt(W * W + H * H) * 0.6; // long enough
        const grad = ctx.createLinearGradient(-s.halfW, 0, s.halfW, 0);
        grad.addColorStop(0,    "rgba(209,163,92,0)");
        grad.addColorStop(0.35, `rgba(209,163,92,${(alpha * 0.7).toFixed(4)})`);
        grad.addColorStop(0.5,  `rgba(243,220,155,${alpha.toFixed(4)})`);
        grad.addColorStop(0.65, `rgba(209,163,92,${(alpha * 0.7).toFixed(4)})`);
        grad.addColorStop(1,    "rgba(209,163,92,0)");

        ctx.fillStyle = grad;
        ctx.fillRect(-s.halfW, -halfH, s.halfW * 2, halfH * 2);
        ctx.restore();
      });
      ctx.restore();
    }

    // ---- Neural network nodes --------------------------------
    const NODE_COUNT = 68;
    const CONNECT_DIST = 145;
    let nodes = [];

    class Node {
      constructor() { this.init(); }
      init() {
        this.x  = Math.random() * W;
        this.y  = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.22;
        this.vy = (Math.random() - 0.5) * 0.22;
        this.r  = Math.random() * 1.8 + 0.8;
        this.baseAlpha = Math.random() * 0.38 + 0.12;
        this.pulse = Math.random() * Math.PI * 2;
        this.pulseSpeed = Math.random() * 0.012 + 0.004;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0) { this.x = 0; this.vx *= -1; }
        if (this.x > W) { this.x = W; this.vx *= -1; }
        if (this.y < 0) { this.y = 0; this.vy *= -1; }
        if (this.y > H) { this.y = H; this.vy *= -1; }
        this.pulse += this.pulseSpeed;
      }
      alpha() { return this.baseAlpha + Math.sin(this.pulse) * 0.1; }
    }

    function buildNodes() {
      nodes = Array.from({ length: NODE_COUNT }, () => new Node());
    }

    function drawNetwork() {
      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const a = (1 - d / CONNECT_DIST) * 0.16;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.strokeStyle = "#d1a35c";
            ctx.lineWidth   = 0.55;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      // Nodes
      nodes.forEach(n => {
        ctx.save();
        ctx.globalAlpha = n.alpha();
        // Soft glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3.5);
        grad.addColorStop(0,   "rgba(243,220,155,0.9)");
        grad.addColorStop(0.4, "rgba(209,163,92,0.5)");
        grad.addColorStop(1,   "rgba(209,163,92,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3.5, 0, Math.PI * 2);
        ctx.fill();
        // Core dot
        ctx.globalAlpha = n.alpha() * 1.4;
        ctx.fillStyle = "#d1a35c";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // ---- Main animation loop --------------------------------
    let tick = 0;
    function animate() {
      ctx.clearRect(0, 0, W, H);
      tick++;
      drawShafts(tick);
      nodes.forEach(n => n.update());
      drawNetwork();
      requestAnimationFrame(animate);
    }

    resize();
    buildNodes();
    animate();

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); buildNodes(); }, 120);
    });
  }

  /* ==========================================================
     TYPING EFFECT
  ========================================================== */
  const typedTitleEl = document.getElementById("typedTitle");
  const phrases = [
    "Aspiring Software Engineer",
    "AI & Data Science Student",
    "Builder of ML-powered tools",
    "Computer Vision Enthusiast"
  ];
  let phraseIndex = 0, charIndex = 0, deleting = false;

  function typeLoop() {
    const current = phrases[phraseIndex];
    if (!deleting) {
      charIndex++;
      typedTitleEl.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) { deleting = true; setTimeout(typeLoop, 1600); return; }
    } else {
      charIndex--;
      typedTitleEl.textContent = current.slice(0, charIndex);
      if (charIndex === 0) { deleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; }
    }
    setTimeout(typeLoop, deleting ? 38 : 62);
  }
  typeLoop();

  /* ==========================================================
     MOBILE NAV
  ========================================================== */
  const navToggle  = document.getElementById("navToggle");
  const navLinksEl = document.getElementById("navLinks");

  navToggle.addEventListener("click", () => {
    const open = navLinksEl.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinksEl.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      navLinksEl.classList.remove("open");
      navToggle.classList.remove("open");
    });
  });

  /* ==========================================================
     SCROLL-SPY
  ========================================================== */
  const sections   = document.querySelectorAll("section[id]");
  const navLinkEls = document.querySelectorAll(".nav-link");

  function setActiveLink() {
    let currentId = sections[0].id;
    const scrollPos = window.scrollY + 150;
    sections.forEach(s => { if (scrollPos >= s.offsetTop) currentId = s.id; });
    navLinkEls.forEach(l => l.classList.toggle("active", l.dataset.section === currentId));
  }
  window.addEventListener("scroll", setActiveLink, { passive: true });
  setActiveLink();

  /* ==========================================================
     NAVBAR SHRINK
  ========================================================== */
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY > 20;
    navbar.classList.toggle("scrolled", scrolled);
    navbar.style.boxShadow = scrolled ? "0 4px 28px rgba(0,0,0,0.50)" : "none";
  }, { passive: true });

  /* ==========================================================
     FADE-IN ON SCROLL
  ========================================================== */
  const faders = document.querySelectorAll(".fade-in");
  const bars   = document.querySelectorAll(".bar-fill");

  const fadeObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        entry.target.querySelectorAll(".bar-fill").forEach(b => b.classList.add("animated"));
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );
  faders.forEach(el => fadeObserver.observe(el));

  const barsObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("animated");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );
  bars.forEach(bar => barsObserver.observe(bar));

  /* ==========================================================
     ANIMATED COUNTERS
  ========================================================== */
  function animateCounter(el) {
    const target   = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const duration = 1800;
    const t0 = performance.now();

    function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = decimals > 0
        ? (target * eased).toFixed(decimals)
        : Math.round(target * eased).toString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counterObs = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll("[data-count]").forEach(el => counterObs.observe(el));

  /* ==========================================================
     COPY EMAIL ON CLICK
  ========================================================== */
  const emailCard = document.getElementById("emailCard");
  if (emailCard && navigator.clipboard) {
    emailCard.addEventListener("click", e => {
      e.preventDefault();
      navigator.clipboard.writeText("hanirohini06@gmail.com").then(() => {
        const hint = emailCard.querySelector(".contact-hint");
        if (!hint) return;
        const orig = hint.textContent;
        hint.textContent = "✓ copied!";
        setTimeout(() => { hint.textContent = orig; }, 2000);
      });
    });
  }

  /* ==========================================================
     STAGGERED CARD ENTRANCES
  ========================================================== */
  function stagger(containerSel, childSel, delay = 80) {
    const c = document.querySelector(containerSel);
    if (!c) return;
    c.querySelectorAll(childSel).forEach((el, i) => {
      el.style.transitionDelay = `${i * delay}ms`;
    });
  }
  stagger(".projects-grid", ".project-card");
  stagger(".skills-grid",   ".skill-card");

  /* ==========================================================
     HERO MOUSE PARALLAX (desktop only)
  ========================================================== */
  const heroSection = document.getElementById("home");
  if (heroSection && window.matchMedia("(min-width: 860px)").matches) {
    heroSection.addEventListener("mousemove", e => {
      const r  = heroSection.getBoundingClientRect();
      const dx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
      const dy = (e.clientY - r.top   - r.height / 2) / (r.height / 2);
      const frame = heroSection.querySelector(".hero-photo-frame");
      if (frame) frame.style.transform = `scale(1) translate(${dx * 7}px, ${dy * 5}px)`;
    });
    heroSection.addEventListener("mouseleave", () => {
      const frame = heroSection.querySelector(".hero-photo-frame");
      if (frame) frame.style.transform = "";
    });
  }

});
