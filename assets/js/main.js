/* ==========================================================================
   Sahya — site scripts (vanilla JS, no dependencies)
   ========================================================================== */

/* ---------- Store settings: edit these ---------- */
const SAHYA = {
  // WhatsApp number with country code, digits only (e.g. "919876543210").
  whatsappNumber: "91XXXXXXXXXX",
  // Prices in rupees per size. Set a size to null to show it as unavailable.
  prices: { "250": null, "500": null, "1000": null },
  currency: "₹",
};

document.documentElement.classList.remove("no-js");

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Header: shadow after scroll ---------- */
  const header = $(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const toggle = $(".menu-toggle");
  const menu = $("#mobile-menu");
  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      $(".icon-menu", toggle).hidden = open;
      $(".icon-close", toggle).hidden = !open;
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Background videos (hero, honey band) ----------
     Each <video data-desktop data-mobile> loads when it nears the screen and fades in once
     it can play. If the file is missing, the photo / animation underneath stays. */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const startVideo = (video) => {
    const isDesktop = window.matchMedia("(min-width: 900px)").matches;
    const sources = (isDesktop ? [video.dataset.desktop] : [video.dataset.mobile, video.dataset.desktop]).filter(Boolean);
    let i = 0;
    const tryNext = () => {
      if (i >= sources.length) { video.remove(); return; }
      video.src = sources[i++];
      video.load();
    };
    video.addEventListener("error", tryNext);
    video.addEventListener("canplay", () => {
      video.play().then(() => {
        video.classList.add("is-playing");
        if (video.parentElement) video.parentElement.classList.add("has-video");
      }).catch(() => {});
    }, { once: true });
    tryNext();
  };
  const videos = $$("video[data-desktop]");
  if (reduceMotion || saveData) {
    videos.forEach((v) => v.remove());
  } else if ("IntersectionObserver" in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { vio.unobserve(e.target); startVideo(e.target); } });
    }, { rootMargin: "400px 0px" });
    videos.forEach((v) => vio.observe(v));
  } else {
    videos.forEach(startVideo);
  }

  /* ---------- Honey drips (canvas animation in the honey band) ---------- */
  const honeyDrips = (canvas) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const BAND = 30;            // depth of the honey layer at the top (px)
    const GRAVITY = 1100;       // px/s² for falling drops
    let w = 0, h = 0, drips = [], drops = [], t = 0, last = 0, raf = 0, visible = false;
    const rand = (a, b) => a + Math.random() * (b - a);

    const newDrip = (x, initial) => {
      const small = w < 600;
      const max = rand(30, small ? 70 : 105);
      return {
        x, max,
        r: rand(8, 13) * (small ? 0.8 : 1),
        len: initial ? rand(0, max * 0.9) : rand(0, 4),
        speed: rand(4, 10),
        wait: initial ? 0 : rand(0.4, 2.5),   // pause before a new drip starts to grow
      };
    };

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = w < 600 ? 56 : 92;
      const n = Math.max(5, Math.floor(w / gap));
      drips = [];
      for (let i = 0; i < n; i++) {
        drips.push(newDrip((i + 0.5) * (w / n) + rand(-gap * 0.22, gap * 0.22), true));
      }
      drops = [];
    };

    const honeyFill = () => {
      const g = ctx.createLinearGradient(0, 0, 0, Math.max(h, 1));
      g.addColorStop(0, "#CC820E");
      g.addColorStop(0.3, "#BD7408");
      g.addColorStop(1, "#A56005");
      return g;
    };

    const bandEdge = (x) => BAND + Math.sin(x * 0.018 + t * 0.9) * 2.2 + Math.sin(x * 0.041 - t * 0.6) * 1.2;

    const drawBand = () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      for (let x = w; x >= 0; x -= 8) ctx.lineTo(x, bandEdge(x));
      ctx.closePath();
      ctx.fill();
    };

    const drawDrip = (d) => {
      const p = Math.min(1, d.len / d.max);
      const R = d.r * (0.6 + 0.55 * p);              // bulb swells as it fills
      const neck = Math.max(R * (0.9 - 0.45 * p), 2.5); // neck thins before it breaks
      const y0 = bandEdge(d.x) - 3;
      const yb = y0 + 3 + d.len;
      const x = d.x;
      ctx.beginPath();
      ctx.moveTo(x - R * 3, y0);
      ctx.quadraticCurveTo(x - R * 1.1, y0 + 2, x - neck, y0 + 3 + d.len * 0.5);
      ctx.quadraticCurveTo(x - R * 1.05, yb - R * 1.2, x - R, yb);
      ctx.arc(x, yb, R, Math.PI, 0, true);
      ctx.quadraticCurveTo(x + R * 1.05, yb - R * 1.2, x + neck, y0 + 3 + d.len * 0.5);
      ctx.quadraticCurveTo(x + R * 1.1, y0 + 2, x + R * 3, y0);
      ctx.closePath();
      ctx.fill();
      return { x, yb, R };
    };

    const drawShine = (x, y, R) => {
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "rgba(255, 238, 196, .6)";
      ctx.beginPath();
      ctx.ellipse(x - R * 0.4, y - R * 0.28, R * 0.34, R * 0.18, -0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 238, 196, .25)";
      ctx.beginPath();
      ctx.ellipse(x + R * 0.45, y + R * 0.35, R * 0.14, R * 0.08, -0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now; t += dt;

      // update
      drips.forEach((d, i) => {
        if (d.wait > 0) { d.wait -= dt; return; }
        d.len += d.speed * dt * (0.35 + 1.4 * Math.pow(d.len / d.max, 2)); // slow, then heavier and faster
        if (d.len >= d.max) {
          const R = d.r * 1.15;
          drops.push({ x: d.x, y: bandEdge(d.x) + d.len, r: R, vy: 40 });
          drips[i] = newDrip(d.x, false);
        }
      });
      drops.forEach((p) => { p.vy += GRAVITY * dt; p.y += p.vy * dt; });
      drops = drops.filter((p) => p.y - p.r * 3 < h);

      // draw
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = honeyFill();
      ctx.shadowColor = "rgba(90, 50, 0, .28)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      drawBand();
      const bulbs = drips.map(drawDrip);
      drops.forEach((p) => {
        const stretch = 1 + Math.min(p.vy / 1600, 0.7);
        ctx.globalAlpha = Math.max(0, Math.min(1, (h - p.y) / (h * 0.35)));
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * 0.85, p.r * stretch, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      ctx.shadowColor = "transparent";
      // glossy highlights
      ctx.fillStyle = "rgba(255, 226, 160, .35)";
      ctx.fillRect(0, 4, w, 2.5);
      ctx.fillStyle = "rgba(255, 226, 160, .14)";
      ctx.fillRect(0, 9, w, 5);
      bulbs.forEach((b) => drawShine(b.x, b.yb, b.R));
      drops.forEach((p) => drawShine(p.x, p.y, p.r));
      ctx.fillStyle = honeyFill();

      if (visible && !reduceMotion) raf = requestAnimationFrame(frame);
    };

    layout();
    frame(performance.now());
    if (reduceMotion) return;

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => { layout(); if (!visible) frame(performance.now()); }).observe(canvas);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) { last = 0; raf = requestAnimationFrame(frame); }
      }).observe(canvas);
    } else {
      visible = true; raf = requestAnimationFrame(frame);
    }
  };
  $$(".cta__honey").forEach(honeyDrips);

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- WhatsApp links ---------- */
  const waLink = (text) => `https://wa.me/${SAHYA.whatsappNumber}?text=${encodeURIComponent(text)}`;
  $$("[data-whatsapp]").forEach((a) => {
    a.href = waLink(a.dataset.whatsapp || "Hi Sahya, I would like to order Wild Honey.");
    a.target = "_blank";
    a.rel = "noopener";
  });

  /* ---------- Cart (simple, stored in this browser) ---------- */
  const CART_KEY = "sahya-cart";
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
  };
  const writeCart = (items) => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* storage blocked */ }
  };
  const renderCartCount = () => {
    const count = readCart().reduce((n, item) => n + item.qty, 0);
    $$(".cart-count").forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
    });
  };
  renderCartCount();

  /* ---------- Toast ---------- */
  const toast = $(".toast");
  let toastTimer;
  const showToast = (message) => {
    if (!toast) return;
    $(".toast__text", toast).textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  };

  /* ---------- Price display ---------- */
  const formatPrice = (size) => {
    const p = SAHYA.prices[size];
    return typeof p === "number" ? `${SAHYA.currency}${p.toLocaleString("en-IN")}` : "Price on request";
  };
  $$("[data-price]").forEach((el) => { el.textContent = formatPrice(el.dataset.price); });

  /* ---------- Product page ---------- */
  const product = $("[data-product]");
  if (!product) return;

  const state = { size: "250", qty: 1 };
  const sizeButtons = $$(".size", product);
  const priceEl = $("[data-live-price]", product);
  const qtyEl = $("[data-qty]", product);
  const orderWa = $("[data-order-whatsapp]", product);

  const sizeLabel = () => {
    const btn = sizeButtons.find((b) => b.dataset.size === state.size);
    return btn ? btn.dataset.label : `${state.size} ml`;
  };

  const update = () => {
    sizeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.size === state.size)));
    if (priceEl) priceEl.textContent = formatPrice(state.size);
    if (qtyEl) qtyEl.textContent = state.qty;
    if (orderWa) {
      orderWa.href = waLink(`Hi Sahya, I would like to order ${state.qty} × Wild Honey (${sizeLabel()}).`);
    }
  };

  sizeButtons.forEach((b) => b.addEventListener("click", () => { state.size = b.dataset.size; update(); }));
  const dec = $("[data-qty-dec]", product);
  const inc = $("[data-qty-inc]", product);
  if (dec) dec.addEventListener("click", () => { state.qty = Math.max(1, state.qty - 1); update(); });
  if (inc) inc.addEventListener("click", () => { state.qty = Math.min(20, state.qty + 1); update(); });

  const addBtn = $("[data-add-to-cart]", product);
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const items = readCart();
      const existing = items.find((i) => i.size === state.size);
      if (existing) existing.qty += state.qty; else items.push({ id: "wild-honey", size: state.size, qty: state.qty });
      writeCart(items);
      renderCartCount();
      showToast(`Added ${state.qty} × Wild Honey (${sizeLabel()}) to your cart`);
    });
  }

  /* Gallery */
  const mainImg = $(".gallery__main img", product);
  $$(".thumb", product).forEach((thumb) => {
    thumb.addEventListener("click", () => {
      $$(".thumb", product).forEach((t) => t.setAttribute("aria-pressed", "false"));
      thumb.setAttribute("aria-pressed", "true");
      mainImg.classList.add("is-fading");
      setTimeout(() => {
        mainImg.src = thumb.dataset.src;
        mainImg.alt = thumb.dataset.alt;
        mainImg.className = thumb.dataset.kind === "jar" ? "is-jar" : "is-photo";
      }, 180);
    });
  });
  if (mainImg) mainImg.addEventListener("load", () => mainImg.classList.remove("is-fading"));

  update();
})();
