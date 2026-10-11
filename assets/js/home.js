// Fabrì 171 home: language, rooms, price calculator, quick-book form and the scroll scenes.
// Motion is GSAP + ScrollTrigger + Lenis from the CDN; without them (or with reduced motion) the page shows its end state.
import { initSite, reducedMotion } from "./site.js";
import { ROOMS, PROPERTY, REVIEWS, GALLERY, roomById } from "./data.js";
import { addDays, fmtEuro, quote, todayISO } from "./engine.js";
import { HOME } from "./home-i18n.js";

window.__home = true;
initSite();

const LANG_KEY = "fabri171.lang";
const QUICK_LEAD_DAYS = 14;
const QUICK_NIGHTS = 2;
const PRICE_BASE_DATE = "2027-01-04"; // any date: the demo rates do not depend on the season
const SCORE_KEYS = ["location", "comfort", "staff", "cleanliness", "value", "wifi"];
const SCORE_LABEL = { location: "rvLocation", comfort: "rvComfort", staff: "rvStaff", cleanliness: "rvClean", value: "rvValue", wifi: "rvWifi" };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function h(tag, props = {}, ...children) {
  const { style, ...rest } = props;
  const el = Object.assign(document.createElement(tag), rest);
  Object.entries(style ?? {}).forEach(([k, v]) => el.style.setProperty(k, v));
  el.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

// ---------- language
const params = new URLSearchParams(location.search);
let lang = (() => {
  const q = params.get("lang");
  if (q === "en" || q === "it") return q;
  try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "it"; } catch { return "it"; } // preference is optional
})();
const t = (key, vars = {}) => (HOME[lang][key] ?? HOME.it[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
const locale = () => (lang === "en" ? "en-GB" : "it-IT");
const bookUrl = (extra = {}) => `prenota.html?${new URLSearchParams({ ...extra, lang })}`;

function splitWords() {
  const el = $("[data-words]");
  const words = el.textContent.trim().split(/\s+/);
  el.replaceChildren(...words.flatMap((w, i) => (i < words.length - 1 ? [h("span", { className: "word", textContent: w }), " "] : [h("span", { className: "word", textContent: w })])));
}

function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t("title");
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml))); // dictionary strings only, never user input
  $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  const toggle = $("[data-lang-toggle]");
  toggle.textContent = t("langSwitch");
  toggle.lang = lang === "en" ? "it" : "en";
  const burger = $(".nav__burger");
  Object.assign(burger.dataset, { open: t("menuOpen"), close: t("menuClose") });
  $('input[name="lang"]').value = lang;
  $("[data-map]").href = PROPERTY.mapsUrl;
  splitWords();
  renderRooms();
  renderGallery();
  renderMarquee();
  renderScores();
  renderCalc();
}

$("[data-lang-toggle]").addEventListener("click", () => {
  lang = lang === "en" ? "it" : "en";
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* the language stays for this visit only */ }
  const url = new URL(location.href);
  url.searchParams.set("lang", lang);
  history.replaceState(null, "", url);
  applyStatic();
  buildDynamicMotion();
  window.ScrollTrigger?.refresh();
});

// ---------- rooms (from data.js)
function renderRooms() {
  const roomText = (room) => (lang === "en" ? room.en : room);
  $("[data-rooms]").replaceChildren(...ROOMS.map((room, i) => {
    const one = quote(room, PRICE_BASE_DATE, addDays(PRICE_BASE_DATE, 1));
    const text = roomText(room);
    const name = h("h3", { className: "room__name", textContent: room.name });
    const img = h("img", {
      src: `assets/img/${room.images[0]}-1600.jpg`, srcset: `assets/img/${room.images[0]}-800.jpg 800w, assets/img/${room.images[0]}-1600.jpg 1600w`,
      sizes: "(max-width: 800px) 90vw, 50vw", alt: lang === "en" ? "Photo from the property's public listing" : "Foto dalla scheda pubblica della struttura", loading: "lazy", decoding: "async",
    });
    // decorative link to the same page as the button below: hidden from keyboard and screen readers
    const photo = h("a", { className: "room__img", href: bookUrl({ camera: room.id, adulti: String(room.guests) }), tabIndex: -1, ariaHidden: "true" }, img);
    photo.dataset.cursor = t("rmCursor");
    return h("article", { className: "room", style: { "--room": room.color, "--i": String(i) } },
      photo,
      h("div", { className: "room__body" },
        h("div", {}, h("p", { className: "eyebrow room__type", textContent: `${text.type} · ${text.bed}` }), name, h("p", { className: "room__blurb", textContent: text.blurb })),
        h("div", { className: "room__foot" },
          h("ul", { className: "room__feat" }, ...text.features.map((f) => h("li", { textContent: f }))),
          h("div", { className: "room__price" }, h("b", { textContent: t("rmFrom", { rate: fmtEuro(one.total) }) }), h("small", { textContent: `${t("rmPortal", { portal: fmtEuro(one.portal) })} · ${t("rmUpTo", { n: room.guests })}` })),
          h("a", { className: "btn btn--thread", href: bookUrl({ camera: room.id, adulti: String(room.guests) }) }, h("span", { textContent: t("rmBook") }), h("span", { ariaHidden: "true", textContent: "→" })))));
  }));
}

// ---------- details gallery: real photos, each with its true aspect ratio so nothing jumps while loading
function renderGallery() {
  $("[data-gallery-track]").replaceChildren(...GALLERY.map((p) => {
    const caption = p[lang];
    const img = h("img", {
      src: `assets/img/${p.id}-1600.jpg`, srcset: `assets/img/${p.id}-800.jpg 800w, assets/img/${p.id}-1600.jpg 1600w`,
      sizes: "(max-width: 800px) 80vw, 45vw", width: p.w, height: p.h, alt: caption, loading: "lazy", decoding: "async", draggable: false,
    });
    return h("figure", { className: "gal", style: { "--ar": String(p.w / p.h) } }, img, h("figcaption", { textContent: caption }));
  }));
}

// ---------- marquee: two identical groups, the scene slides the track by half its width
function renderMarquee() {
  const group = () => h("span", { className: "marquee__group" }, ...["mq1", "mq2", "mq3", "mq4", "mq5"].flatMap((key) => [t(key), h("i", { textContent: "171" })]));
  $("[data-marquee]").replaceChildren(group(), group());
}

// ---------- reviews (scores from data.js, quotes from REVIEWS)
function renderScores() {
  const { ratings } = PROPERTY;
  $("[data-scores]").replaceChildren(...SCORE_KEYS.map((key) => {
    const bar = h("i", { style: { "--v": String(ratings[key] / 10) } });
    bar.dataset.v = String(ratings[key] / 10);
    return h("li", { className: "score" }, h("span", { textContent: t(SCORE_LABEL[key]) }),
      h("b", { textContent: ratings[key].toLocaleString(locale(), { minimumFractionDigits: 1 }) }), h("span", { className: "score__bar" }, bar));
  }));
  $("[data-quotes]").replaceChildren(...REVIEWS.map((r) =>
    h("li", { className: "quote" }, h("p", { textContent: `“${r.text}”` }), h("footer", { textContent: `${r.who} · ${r.from} · Booking.com` }))));
}

// ---------- price calculator: the numbers come from the same engine the booking page uses
function renderCalc() {
  const form = $("[data-calc]");
  const select = $("[data-calc-room]", form);
  const range = $("[data-calc-nights]", form);
  const previous = select.value;
  select.replaceChildren(...ROOMS.map((r) => h("option", { value: r.id, textContent: `${r.name} · ${t("rmUpTo", { n: r.guests })}` })));
  if (previous) select.value = previous;
  const show = (animate) => {
    const room = roomById(select.value);
    const nights = Number(range.value);
    const q = quote(room, PRICE_BASE_DATE, addDays(PRICE_BASE_DATE, nights));
    $("[data-calc-n]", form).textContent = String(nights);
    $("[data-calc-portal]", form).textContent = fmtEuro(q.portal);
    $("[data-calc-save]", form).textContent = fmtEuro(q.saving);
    const direct = $("[data-calc-direct]", form);
    const { gsap } = window;
    if (animate && gsap && !reducedMotion) {
      const counter = { v: Number(direct.dataset.value ?? q.total) };
      gsap.to(counter, { v: q.total, duration: 0.6, ease: "power2.out", onUpdate: () => (direct.textContent = fmtEuro(Math.round(counter.v))) });
    } else direct.textContent = fmtEuro(q.total);
    direct.dataset.value = String(q.total);
    $("[data-calc-book]", form).href = bookUrl({ camera: room.id, adulti: String(room.guests) });
  };
  form.oninput = () => show(true);
  form.onsubmit = (e) => e.preventDefault();
  show(false);
}

// ---------- quick-book form: native date inputs, sensible defaults
function initQuickBook() {
  const form = $("[data-quick]");
  const [arrival, departure] = [form.elements.arrivo, form.elements.partenza];
  const today = todayISO();
  arrival.min = today;
  arrival.value = addDays(today, QUICK_LEAD_DAYS);
  const sync = () => {
    departure.min = addDays(arrival.value || today, 1);
    if (!departure.value || departure.value <= arrival.value) departure.value = addDays(arrival.value, QUICK_NIGHTS);
  };
  arrival.addEventListener("change", sync);
  sync();
}

// ---------- motion
const motionOk = () => window.gsap && window.ScrollTrigger && !reducedMotion;
const state = { statement: null, rooms: [], bars: [] };

function doorScene({ gsap }) {
  // intro: the three numerals draw themselves, uncovering the room through them
  const strokes = $$(".door__num path");
  gsap.set(strokes, { strokeDashoffset: 1 });
  gsap.to(strokes, { strokeDashoffset: 0, duration: 1.5, stagger: 0.22, ease: "power2.inOut", delay: 0.15 });
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: "[data-door]", start: "top top", end: "+=170%", scrub: 0.7, pin: ".door__stage", anticipatePin: 1,
      onUpdate: (self) => document.body.classList.toggle("is-revealed", self.progress > 0.85),
    },
  });
  // small start zoom on phones: scaling a photo up is what makes it look soft
  const startZoom = matchMedia("(max-width: 800px)").matches ? 1.05 : 1.22;
  tl.fromTo(".door__photo", { scale: startZoom }, { scale: 1, duration: 1.2 }, 0)
    // zoom into the bar of the 7: the cut-out grows until the whole screen is the room
    .to(".door__num", { scale: 46, svgOrigin: "810 287", ease: "power3.in", duration: 1.2 }, 0)
    .to(".door__intro", { opacity: 0, y: -20, duration: 0.2 }, 0)
    .fromTo(".door__shade", { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.7)
    .fromTo(".door__reveal > *", { y: 36, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.3 }, 0.78);
}

function lengthNear(path, total, x, y) {
  let best = { d: Infinity, at: 0 };
  for (let i = 0; i <= 600; i++) {
    const at = (total * i) / 600;
    const p = path.getPointAtLength(at);
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < best.d) best = { d, at };
  }
  return best.at;
}

function routeScene({ ScrollTrigger }) {
  const path = $(".map__path");
  const total = path.getTotalLength();
  path.style.strokeDasharray = String(total);
  path.style.strokeDashoffset = String(total);
  const stops = $$("[data-node]").map((g) => {
    const [x, y] = g.dataset.node.split(" ").map(Number);
    return { g, at: lengthNear(path, total, x, y) / total };
  });
  const steps = $$("[data-route-step]");
  const marker = $(".map__marker");
  const draw = (progress) => {
    const p = Math.min(1, Math.max(0, (progress - 0.04) / 0.92)); // short pauses at both ends
    path.style.strokeDashoffset = String(total * (1 - p));
    const point = path.getPointAtLength(total * p);
    marker.setAttribute("cx", point.x);
    marker.setAttribute("cy", point.y);
    const reached = stops.map((s) => p >= s.at - 0.001);
    const here = reached.lastIndexOf(true);
    stops.forEach((s, i) => s.g.classList.toggle("is-on", reached[i]));
    steps.forEach((s, i) => { s.classList.toggle("is-on", reached[i]); s.classList.toggle("is-here", i === here); });
  };
  ScrollTrigger.create({ trigger: "[data-route]", start: "top top", end: "+=320%", scrub: true, pin: ".route__pin", onUpdate: (self) => draw(self.progress) });
  draw(0);
}

// desktop: the pinned strip slides sideways with the scroll; on phones (and without motion) it is a swipeable row
function galleryScene({ gsap }) {
  const track = $("[data-gallery-track]");
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  const SCROLL_PER_PIXEL = 0.55; // the strip glides faster than the page scrolls, so nine photos do not take six screens
  gsap.matchMedia().add("(min-width: 801px)", () => {
    gsap.to(track, { x: () => -distance(), ease: "none", scrollTrigger: { trigger: ".gallery", start: "top top", end: () => `+=${Math.round(distance() * SCROLL_PER_PIXEL)}`, pin: ".gallery__pin", scrub: 0.5, invalidateOnRefresh: true } });
  });
}

function chatScene({ ScrollTrigger }) {
  const bubbles = $$("[data-bubble]");
  const steps = $$("[data-chat-step]");
  const show = (n) => {
    bubbles.forEach((b) => b.classList.toggle("is-on", Number(b.dataset.bubble) <= n));
    steps.forEach((s, i) => s.classList.toggle("is-on", i < n));
  };
  ScrollTrigger.create({ trigger: "[data-chat]", start: "top top", end: "+=280%", pin: ".chat__pin", scrub: true, onUpdate: (self) => show(Math.min(4, Math.floor(self.progress * 4) + 1)) });
  show(1);
}

// scenes that depend on text rendered from data (rooms, scores, statement): rebuilt on language change
function buildDynamicMotion() {
  if (!motionOk()) return;
  const { gsap } = window;
  state.statement?.scrollTrigger?.kill();
  state.statement?.kill();
  state.statement = gsap.fromTo(".word", { opacity: 0.16 }, {
    opacity: 1, stagger: 0.12, ease: "none",
    scrollTrigger: { trigger: ".statement", start: "top 70%", end: "bottom 62%", scrub: true },
  });
  state.rooms.forEach((tween) => { tween.scrollTrigger?.kill(); tween.kill(); });
  const cards = $$(".room");
  state.rooms = [];
  if (matchMedia("(min-width: 801px)").matches) {
    cards.forEach((card, i) => {
      // the photo drifts inside its frame while the card passes
      state.rooms.push(gsap.fromTo($("img", card), { yPercent: -8, scale: 1.2 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true } }));
      const next = cards[i + 1];
      if (!next) return;
      state.rooms.push(gsap.to(card, { scale: 0.94, ease: "none", scrollTrigger: { trigger: next, start: "top 75%", end: "top 25%", scrub: true } }));
    });
  }
  state.bars.forEach((tween) => { tween.scrollTrigger?.kill(); tween.kill(); });
  state.bars = $$(".score__bar i").map((bar) =>
    gsap.fromTo(bar, { scaleX: 0 }, { scaleX: Number(bar.dataset.v), duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: bar, start: "top 92%", once: true } }));
}

function initMotion() {
  if (!motionOk()) {
    document.documentElement.classList.add("no-gsap"); // end state, no pinned scenes
    return;
  }
  const libs = { gsap: window.gsap, ScrollTrigger: window.ScrollTrigger };
  doorScene(libs);
  routeScene(libs);
  galleryScene(libs);
  chatScene(libs);
  // headings rise into place once, the marquee slides with the scroll
  $$(".display").filter((el) => !el.closest(".door")).forEach((el) =>
    libs.gsap.from(el, { y: 48, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } }));
  libs.gsap.to("[data-marquee]", { xPercent: -50, ease: "none", scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: 0.6 } });
  buildDynamicMotion();
  const refresh = () => libs.ScrollTrigger.refresh();
  document.fonts?.ready.then(refresh);
  addEventListener("load", refresh);
}

applyStatic();
initQuickBook();
initMotion();
