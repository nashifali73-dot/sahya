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

  /* ---------- Carousel (arrows, dots, swipe) ---------- */
  $$("[data-carousel]").forEach((carousel) => {
    const section = carousel.closest("section") || document;
    const track = $("[data-carousel-track]", carousel);
    const prev = $("[data-carousel-prev]", section);
    const next = $("[data-carousel-next]", section);
    const dotsWrap = $("[data-carousel-dots]", section);
    if (!track) return;
    const pageWidth = () => track.clientWidth;
    const pages = () => Math.max(1, Math.round(track.scrollWidth / pageWidth()));
    const renderDots = () => {
      if (!dotsWrap) return;
      const n = pages();
      if (dotsWrap.children.length !== n) dotsWrap.innerHTML = "<span></span>".repeat(n);
      const i = Math.min(n - 1, Math.round(track.scrollLeft / pageWidth()));
      Array.from(dotsWrap.children).forEach((d, k) => d.classList.toggle("is-active", k === i));
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
      renderDots();
    };
    if (prev) prev.addEventListener("click", () => track.scrollBy({ left: -pageWidth(), behavior: "smooth" }));
    if (next) next.addEventListener("click", () => track.scrollBy({ left: pageWidth(), behavior: "smooth" }));
    track.addEventListener("scroll", () => window.requestAnimationFrame(update), { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  /* ---------- "See it in real life" videos ---------- */
  const reelThumbs = $$(".reel-thumb");
  const modal = $(".reel-modal");
  if (reelThumbs.length) {
    // Desktop: silent preview while hovering a thumbnail
    const canHover = window.matchMedia("(hover: hover)").matches;
    if (canHover && !reduceMotion && !saveData) {
      reelThumbs.forEach((t) => {
        const v = $("video", t);
        t.addEventListener("mouseenter", () => {
          if (!v.src) v.src = t.dataset.src;
          v.play().then(() => t.classList.add("is-previewing")).catch(() => {});
        });
        t.addEventListener("mouseleave", () => { v.pause(); t.classList.remove("is-previewing"); });
      });
    }

    // Pop-up player
    if (modal && typeof modal.showModal === "function") {
      const mv = $("video", modal);
      const cap = $(".reel-modal__caption", modal);
      let current = 0;
      const show = (i) => {
        current = (i + reelThumbs.length) % reelThumbs.length;
        const t = reelThumbs[current];
        mv.poster = t.dataset.poster;
        mv.src = t.dataset.src;
        cap.textContent = t.dataset.caption;
        mv.play().catch(() => {});
      };
      reelThumbs.forEach((t, i) => t.addEventListener("click", () => {
        $$("video", t).forEach((v) => v.pause());
        modal.showModal();
        show(i);
      }));
      $("[data-reel-prev]", modal).addEventListener("click", () => show(current - 1));
      $("[data-reel-next]", modal).addEventListener("click", () => show(current + 1));
      $("[data-reel-close]", modal).addEventListener("click", () => modal.close());
      modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
      modal.addEventListener("close", () => { mv.pause(); mv.removeAttribute("src"); mv.load(); });
      modal.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") show(current + 1);
        if (e.key === "ArrowLeft") show(current - 1);
      });
    }
  }

  /* ---------- Quick add (reel cards) ---------- */
  $$("[data-quick-add]").forEach((btn) => btn.addEventListener("click", () => {
    const items = readCart();
    const existing = items.find((i) => i.size === "250" && (i.bundle || 1) === 1);
    if (existing) existing.qty += 1; else items.push({ id: "wild-honey", size: "250", bundle: 1, qty: 1 });
    writeCart(items);
    renderCartCount();
    showToast("Added 1 × Wild Honey (250 ml) to your cart");
  }));

  /* ---------- Product page ---------- */
  const product = $("[data-product]");
  if (!product) return;

  const bundleButtons = $$(".bundle", product);
  const startBundle = bundleButtons.find((b) => b.getAttribute("aria-pressed") === "true");
  const state = {
    size: "250", qty: 1,
    bundle: startBundle ? Number(startBundle.dataset.bundle) : 1,
    off: startBundle ? Number(startBundle.dataset.off) : 0,
  };
  const sizeButtons = $$(".size", product);
  const priceEl = $("[data-live-price]", product);
  const qtyEl = $("[data-qty]", product);
  const orderWa = $("[data-order-whatsapp]", product);

  const sizeLabel = () => {
    const btn = sizeButtons.find((b) => b.dataset.size === state.size);
    return btn ? btn.dataset.label : `${state.size} ml`;
  };

  const orderText = () => {
    const what = state.bundle > 1
      ? `${state.qty} × ${state.bundle}-jar bundle of Wild Honey (${sizeLabel()}, ${state.off}% off)`
      : `${state.qty} × Wild Honey (${sizeLabel()})`;
    return what;
  };

  const money = (n) => `${SAHYA.currency}${Math.round(n).toLocaleString("en-IN")}`;
  const renderBundles = () => {
    const unit = SAHYA.prices[state.size];
    bundleButtons.forEach((b) => {
      const n = Number(b.dataset.bundle);
      const off = Number(b.dataset.off);
      b.setAttribute("aria-pressed", String(n === state.bundle));
      const totalEl = $("[data-bundle-total]", b);
      const eachEl = $("[data-bundle-each]", b);
      const saveEl = $("[data-bundle-save]", b);
      if (typeof unit === "number") {
        const full = unit * n;
        const total = full * (1 - off / 100);
        totalEl.innerHTML = money(total);
        eachEl.textContent = n === 1 ? "per jar" : `${money(total / n)} per jar`;
        saveEl.textContent = off ? `You save ${money(full - total)}` : "Regular price";
      }
    });
  };

  const update = () => {
    sizeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.size === state.size)));
    if (priceEl) priceEl.textContent = formatPrice(state.size);
    if (qtyEl) qtyEl.textContent = state.qty;
    renderBundles();
    if (orderWa) orderWa.href = waLink(`Hi Sahya, I would like to order ${orderText()}.`);
  };

  bundleButtons.forEach((b) => b.addEventListener("click", () => {
    state.bundle = Number(b.dataset.bundle);
    state.off = Number(b.dataset.off);
    update();
  }));

  sizeButtons.forEach((b) => b.addEventListener("click", () => { state.size = b.dataset.size; update(); }));
  const dec = $("[data-qty-dec]", product);
  const inc = $("[data-qty-inc]", product);
  if (dec) dec.addEventListener("click", () => { state.qty = Math.max(1, state.qty - 1); update(); });
  if (inc) inc.addEventListener("click", () => { state.qty = Math.min(20, state.qty + 1); update(); });

  const addBtn = $("[data-add-to-cart]", product);
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const items = readCart();
      const existing = items.find((i) => i.size === state.size && (i.bundle || 1) === state.bundle);
      if (existing) existing.qty += state.qty * state.bundle;
      else items.push({ id: "wild-honey", size: state.size, bundle: state.bundle, off: state.off, qty: state.qty * state.bundle });
      writeCart(items);
      renderCartCount();
      showToast(`Added ${orderText()} to your cart`);
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
