# Fabrì 171 · Guest house · Pescara (demo)

Demo of a direct-booking website for **Fabrì 171** (Via Nicola Fabrizi 171, scala C, Pescara). The property sells almost only through Booking.com. This demo shows the owner a site with Awwwards/Godly-level scroll animation and, behind it, a **real local booking system**: direct bookings that block the same dates on Booking.com, Booking.com reservations that block the site, and WhatsApp messages that run by themselves.

> Everything runs on `localhost` only. Nothing is deployed, no real WhatsApp message is sent, no payment is taken. Photos come from the property's public listings (hotels-in-it and Booking.com) and are used for this demo; which photo shows which room type is a placeholder.

## Run it

Needs Node 22+ (tested on Node 24). No dependencies, no build step.

```bash
npm start        # http://localhost:4171
npm test         # 49 tests: engine, iCal, WhatsApp, channel sync, HTTP security
```

| URL | What it is |
| --- | --- |
| `/` | Home: a "171" door you zoom through, a route that draws itself, stacking rooms, a price calculator and a pinned phone that plays the WhatsApp journey. Italian / English. |
| `/prenota.html` | Booking in 4 steps (Italian / English): guests and live calendar → rooms (several at once, by seats) → details with an explicit WhatsApp or email choice → confirmation with `.ics`. Accepts `?arrivo=YYYY-MM-DD&partenza=YYYY-MM-DD&adulti=1-9&camera=economy\|triple\|quad&lang=it\|en`. |
| `/gestione.html` | Host console: KPIs (including commissions saved), channel sync, a Booking.com simulator, WhatsApp outbox with a demo clock, 21-day planning board, bookings table. |

## What the automation does

1. **Fees.** Booking portals keep roughly 15% of each booking (estimates run from 15% to 22%). A booking made on the site is stored here, priced about 10% under the portals (a proposal), and paid at the property or by bank transfer: no portal commission and no card fees.
2. **The booking app updates by itself.** Two-way iCal sync: the site publishes one calendar per room (`/ical/<room>.ics?exclude=Booking.com`), and reads the channel's calendars every 30 seconds. A direct booking blocks the dates on Booking.com the next time Booking.com reads our feed; a Booking.com reservation is imported and blocks the site. **iCal is not instant** (portals read feeds every 1 to 4 hours), so a double booking is possible in that window: the server detects it, flags the booking in the console and sends the host a WhatsApp alert. The simulator in the console lets you reproduce exactly that.
3. **WhatsApp messages.** Each direct booking schedules: confirmation (now), instructions (2 days before, 10:00 Rome), check-in day (09:00), thank-you with review link (check-out day, 11:30) and an alert to the host. Guest messages go out only after an explicit WhatsApp choice on the booking form. In demo mode they are written to the outbox shown in the console; with WhatsApp Cloud API credentials in `.env` they are sent as approved utility templates.

How it works and how to go live: [docs/automation.md](docs/automation.md). Research and decisions: [docs/ricerca.md](docs/ricerca.md).

## Structure

```
index.html · prenota.html · gestione.html
assets/
  css/base.css      tokens, type, buttons, nav, footer
  css/home.css      home scenes
  css/booking.css   booking page, planning board, tables
  css/admin.css     host console panels and WhatsApp conversations
  js/data.js        property, rooms, reviews (one place to edit content)
  js/engine.js      pure booking logic shared by browser and server (availability, seats, prices, validation, dates)
  js/store.js       browser client for the API
  js/home.js        home: language, rooms, calculator, GSAP scenes
  js/booking.js     booking flow          js/booking-i18n.js  its copy (IT/EN)
  js/admin.js       host console          js/home-i18n.js     home copy (IT/EN)
  js/site.js        Lenis, nav, menu, contacts, WhatsApp links
  img/              JPEG renditions (800 px and native size) of the listing photos: hero, rooms, details gallery
server/
  index.mjs         entry point (timers: WhatsApp tick, channel sync, mock pull)
  app.mjs           HTTP server and routes, security checks
  db.mjs            JSON-file storage with a write queue
  ics.mjs           iCal build and parse
  channels.mjs      channel config, export, import (reconcile), mock Booking.com
  whatsapp.mjs      scheduling, Cloud API payloads, delivery with retries
  templates.mjs     message copy (IT/EN) and the check-in text
  seed.mjs          deterministic demo data
tests/              node --test
docs/               ricerca.md, automation.md
```

Libraries (CDN, pinned): GSAP 3.13.0 with ScrollTrigger, Lenis 1.1.13. Fonts: Fraunces, Instrument Sans, DM Mono (Google Fonts). If the CDNs do not respond, or the visitor prefers reduced motion, the home shows its end state with no pinned scenes.

## Design concept

- **The address is the brand.** The number 171 is the hero: a window cut out of the page onto the room. Scrolling zooms through the bar of the 7 until the room fills the screen.
- **Tiles.** The room photos show Mediterranean cement tiles in blue and ochre: that is the palette (linen, rattan honey, Adriatic blue, terracotta) and the pattern on the closing section.
- **Location is the argument.** Booking.com guests rate the location 9.5, so the route scene draws the walk from the station to the sea through the door.
- **Reception is WhatsApp.** The most common complaint in the public reviews is arrival communication, so the pinned phone shows the whole message journey.

## Security notes

The server listens on `127.0.0.1` only, rejects requests whose `Host` is not localhost, blocks cross-origin writes, requires `application/json`, caps bodies at 64 KB, serves only the three pages and `/assets/`, and builds bookings from whitelisted fields. The public calendar endpoint returns dates only, never guest data. `ALLOW_REMOTE=1` refuses to start without `ADMIN_TOKEN`. This is a demo: before real use add HTTPS, a real database, authentication for `/gestione.html`, rate limiting and a privacy policy.

## To complete with the owner before going live

- [ ] Phone, WhatsApp, email: one place, `PROPERTY` in `assets/js/data.js` (placeholders today; **the WhatsApp buttons point to a fake number**).
- [ ] Room inventory: the demo assumes **one unit per room type** (Economy, Comfort Triple, Quadruple). Real counts and room names.
- [ ] Real rates, a cancellation policy, the direct-booking discount (10% is a proposal) and the portal prices used for comparison.
- [ ] The check-in procedure written in the WhatsApp messages (a host meets the guest, with the guest's "I'm 10 minutes away" message) is a demo proposal.
- [ ] Rating: category scores are from the Booking.com listing (October 2026); the overall 8.5 from 385 reviews comes from an aggregator that mirrors it. Verify on the live listing.
- [ ] Permission to quote the four guest reviews, or collect new ones directly.
- [ ] Photos: the site uses photos from the public listings for the demo. Get the owner's permission or official photos, and tell me which photo shows which room (the room cards use three listing photos as placeholders).
- [ ] Policies shown on the site: pets on request, free cot, non-smoking, tourist tax, ID and card at check-in.
- [ ] WhatsApp Business account, number, Meta-approved templates (texts in `docs/automation.md`), privacy notice for the WhatsApp opt-in.
- [ ] Booking.com: check that "Sync calendars" (iCal) is available for this property and region; paste the export links from the console. For instant sync use a channel manager with Booking.com's connectivity API.
- [ ] Payment: online deposit (Stripe) is not built; today it is pay at the property or bank transfer.
- [ ] Legal pages (privacy, cookies, terms) and the Italian tourist-registration duties (Alloggiati Web) are out of scope.

## Identification data (public listings)

CIN IT068028B4IGCFTBHB · Check-in 14:00 to 23:00 (photo ID and credit card at check-in) · Check-out by 10:00 · Booking.com location score 9.5.

---
Design and development: Punto Due Studio. Photos: the property's public listings.
