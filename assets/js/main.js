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
