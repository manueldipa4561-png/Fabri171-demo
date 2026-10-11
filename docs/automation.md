# Automation: calendar sync and WhatsApp

## Overview

```
guest ──► site ──POST /api/bookings──► server ──► data/db.json
                                          │
                  ┌───────────────────────┼────────────────────────┐
                  ▼                       ▼                        ▼
      /ical/<room>.ics        WhatsApp scheduler        host console (/gestione.html)
   (what Booking.com reads)  (confirmation, 2 days      bookings · sync · outbox · planning
                              before, check-in day,
   Booking.com ◄── reads ───  thank-you, host alerts)
        │
        └─ its own reservations ─► /mock/booking/<room>.ics (demo) or the real iCal link
                                    read by the server every 30 s ─► blocks the site
```

All times are Europe/Rome. State lives in one JSON file (`data/db.json`, git-ignored), written through a queue so two requests never overwrite each other.

## Calendar sync

**Export.** `GET /ical/<room>.ics?exclude=Booking.com` returns all active bookings of that room as all-day events titled `Reserved` (no names), except those that came from the excluded channel, so a channel never reads its own reservations back. Optional `ICAL_TOKEN` in `.env` makes `?token=` mandatory.

**Import.** Every 30 seconds (and on "Sincronizza ora") each configured channel feed is fetched and merged:

| Event in the feed | What happens |
| --- | --- |
| new reservation | stored as a channel booking (`OTA-xxxxx`), blocks the site |
| dates changed | the booking is updated |
| future reservation disappeared | marked cancelled (past ones just age out) |
| overlaps one of our bookings | stored with `conflict: true`, WhatsApp alert to the host |

If one room's feed fails, the others still import and the error is shown in the console. Date-time events are reduced to their date and recurrence rules are ignored (Booking.com, Airbnb and PMS exports are all-day).

**Demo mode.** With no `CHANNEL_FEEDS_JSON`, a built-in mock Booking.com serves its own reservations and *reads our calendar only every few minutes or on demand*. That reproduces the real risk: book on the site, then use "Prova il portale" to reserve the same dates on the mock before it re-reads, and the conflict appears.

**Going live.**

1. Host this app somewhere with HTTPS (not built here), set `ALLOW_REMOTE=1`, `ADMIN_TOKEN` and `ICAL_TOKEN`.
2. In the Booking.com extranet open the calendar section and use the sync option to import our link for each room (copy it from the console), and export Booking.com's link for each room.
3. Put Booking.com's export links in `.env`:
   `CHANNEL_FEEDS_JSON={"booking":{"name":"Booking.com","feeds":{"economy":"https://…","triple":"https://…","quad":"https://…"}}}`
4. Booking.com reads our feed on its own schedule (observed 1 to 4 hours). For instant two-way sync use a channel manager that talks to Booking.com's API; this server can sit behind it as the source of direct bookings.

## WhatsApp messages

| When | Template | To |
| --- | --- | --- |
| right after the booking | `fbr_booking_confirmed` | guest (if opted in) |
| right after the booking | `fbr_host_new_booking` | host |
| 2 days before, 10:00 | `fbr_pre_arrival` | guest |
| arrival day, 09:00 | `fbr_checkin_day` | guest |
| check-out day, 11:30 | `fbr_checkout_thanks` | guest |
| a channel booking clashes | `fbr_host_conflict` | host |

Messages whose time has already passed when the booking is made are skipped. Cancelling a booking cancels its pending guest messages.

**Opt-in.** The booking form has two answers with no default: WhatsApp or email only. Only an explicit WhatsApp choice schedules guest messages.

**Demo mode** (no credentials): messages are written to the outbox and shown in the console as conversations. The demo clock ("+1 giorno", "+1 settimana") makes the scheduled ones fire. Seeded demo guests carry obviously fake numbers and are flagged so they can never be sent, even with real credentials.

**Going live.**

1. Create a WhatsApp Business account and a number in Meta's Business Platform; get the phone number ID and a permanent token.
2. Submit the templates below (category **utility**) for approval, in Italian and English.
3. Put `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` and `WHATSAPP_API_VERSION` (see Meta's changelog) in `.env`. All three are required; otherwise the server stays in demo mode.
4. Failed sends are retried (3 attempts, 1 minute apart) and then shown as "non inviato" with the error; they are never dropped silently.

Pricing: a utility template sent inside an open 24-hour window is free, outside it is charged per message by country; check Meta's current rate card.

### Templates to submit

Variables are positional. Each text starts and ends with words, as Meta requires.

**fbr_booking_confirmed** ({{1}} name, {{2}} code, {{3}} property, {{4}} rooms, {{5}} check-in date, {{6}} check-out date, {{7}} check-in window)
- it: Ciao {{1}}, la tua prenotazione {{2}} a {{3}} è confermata: {{4}}, arrivo {{5}}, partenza {{6}}. Check-in dalle {{7}}. Due giorni prima dell'arrivo ti scriviamo qui con tutte le istruzioni.
- en: Hi {{1}}, your booking {{2}} at {{3}} is confirmed: {{4}}, arriving {{5}}, leaving {{6}}. Check-in {{7}}. Two days before you arrive we will message you here with all the details.

**fbr_pre_arrival** ({{1}} name, {{2}} property, {{3}} address, {{4}} window, {{5}} access text, {{6}} map link)
- it: Ciao {{1}}, manca poco! Ti aspettiamo da {{2}}, {{3}}. Check-in {{4}}. {{5}} Rispondi a questo messaggio con il tuo orario di arrivo, così troviamo tutto pronto. Mappa: {{6}} A presto!
- en: Hi {{1}}, almost there! We look forward to welcoming you at {{2}}, {{3}}. Check-in {{4}}. {{5}} Reply to this message with your arrival time so everything is ready. Map: {{6}} See you soon!

**fbr_checkin_day** ({{1}} name, {{2}} window, {{3}} address, {{4}} access text)
- it: Buongiorno {{1}}, oggi è il giorno! Check-in {{2}} in {{3}}. {{4}} Il Wi-Fi è gratuito in tutta la struttura. Buon viaggio!
- en: Good morning {{1}}, today is the day! Check-in {{2}} at {{3}}. {{4}} Wi-Fi is free throughout the property. Safe travels!

**fbr_checkout_thanks** ({{1}} name, {{2}} property, {{3}} review link)
- it: Grazie {{1}}, è stato un piacere averti da {{2}}! Se ti sei trovato bene, una recensione ci aiuta molto: {{3}}. La prossima volta prenota direttamente dal nostro sito.
- en: Thank you {{1}}, it was a pleasure having you at {{2}}! If you enjoyed your stay, a review helps us a lot: {{3}}. Next time, book directly on our website.

**fbr_host_new_booking** ({{1}} code, {{2}} guest, {{3}} rooms, {{4}} check-in, {{5}} check-out, {{6}} total, {{7}} phone)
- it: Nuova prenotazione diretta {{1}}: {{2}}, {{3}}, dal {{4}} al {{5}}, {{6}}. Zero commissioni. Telefono ospite: {{7}}.
- en: New direct booking {{1}}: {{2}}, {{3}}, {{4}} to {{5}}, {{6}}. No commission. Guest phone: {{7}}.

**fbr_host_conflict** ({{1}} rooms, {{2}} from, {{3}} to, {{4}} channel, {{5}} other)
- it: ATTENZIONE: doppia prenotazione in {{1}} dal {{2}} al {{3}} ({{4}} e {{5}}). Chiudi le date sul portale o contatta l'ospite.
- en: WARNING: double booking in {{1}} from {{2}} to {{3}} ({{4}} and {{5}}). Close the dates on the portal or contact the guest.

`metaText(kind, lang)` in `assets/js/api/whatsapp.js` prints these from the source, so the file and Meta never drift. Meta reviews templates itself and may ask for edits: change `assets/js/api/templates.js`, never the approved text in one place only.

## API

Public: `GET /api/availability` (dates only), `POST /api/bookings`, `GET /ical/<room>.ics`.
Admin (needs `x-admin-token` when `ALLOW_REMOTE=1`): `GET /api/admin/bookings|channels|outbox`, `POST /api/admin/sync`, `POST /api/admin/bookings/<code>/cancel`, `POST /api/admin/demo/clock|reset`, `POST /api/admin/mock/reserve|pull`.
Errors: `422 {error:"invalid", fields:{…}}` for validation, `403` for foreign hosts and origins, `415/400/413` for malformed bodies.

## Limits to know

- One JSON file and one process: fine for a demo, not for two instances.
- No payment, no email sending, no inbound WhatsApp handling (guest replies are not read by the server).
- Door codes: Fabrì 171 has a host who meets the guest, so none are sent. A self check-in property would add a smart-lock integration.
