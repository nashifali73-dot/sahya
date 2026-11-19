# Sahya — Kerala Wild Forest Honey

Website for **Sahya Wild Honey**: wild forest honey from the Western Ghats of Kerala.

Plain **HTML, CSS and JavaScript**. No frameworks, no build step. Open `index.html` in a browser, or host the folder on any static host.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home: photo hero, highlights, why Sahya, featured product, forest-to-jar steps, our name, FAQ |
| `shop.html` | Product page: gallery, size, quantity, add to cart, order on WhatsApp, details |
| `about.html` | Our story, three promises, where it comes from |

Every page is responsive: one layout for phones, one for tablets and desktops (breakpoint at 900px).

## Folder structure

```
assets/
  css/style.css      all styles (design tokens at the top)
  js/main.js         menu, scroll effects, cart, product options, WhatsApp links
  img/               photos, jar, favicon, social share image
index.html
shop.html
about.html
```

## Things to edit before launch

1. **WhatsApp number and prices**: top of `assets/js/main.js`

   ```js
   const SAHYA = {
     whatsappNumber: "91XXXXXXXXXX",            // country code + number, digits only
     prices: { "250": null, "500": null, "1000": null }, // e.g. "250": 399
   };
   ```

   While a price is `null` the site shows "Price on request".
2. **Sizes**: in `shop.html`, remove `disabled` from the 500 ml / 1 kg buttons when you sell them.
3. **Footer**: email, Instagram link and FSSAI licence number (search for `XXXXXXXX` in each HTML file).
4. **Our story**: the two paragraphs and the founder quote in `about.html` (marked `EDIT`).

## Hero video (optional)

To replace the hero photo with a looping video, put the file at `assets/video/hero.mp4` and follow the comment inside `.hero__media` in `index.html` / `about.html`. Keep it short (8–10 s), muted, under 5 MB.

## The cart

"Add to cart" saves items in the visitor's browser (localStorage) and updates the cart badge. It does not take payments yet. Connect a checkout (Razorpay, Shopify Buy Button, etc.) when you are ready, or keep WhatsApp ordering.

## Publish with GitHub Pages

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, then pick `main` and `/ (root)`. The site goes live at `https://<username>.github.io/sahya/`.

## Fonts

[Inter Tight](https://fonts.google.com/specimen/Inter+Tight) for headings and [Inter](https://fonts.google.com/specimen/Inter) for text, loaded from Google Fonts.
