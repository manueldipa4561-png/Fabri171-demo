# Research and decisions: Fabrì 171

Read on 11 October 2026. Every number below comes from a public page; nothing is invented.

## The property

| Fact | Value | Source |
| --- | --- | --- |
| Address | Via Nicola Fabrizi 171, scala C, Pescara | [hotels-in-it](https://www.hotels-in-it.com/en/h/fabri171.html) |
| Rooms on Booking.com | Economy Double or Twin (1 full bed); Comfort Triple (1 king + 1 sofa bed, or 2 twin + 1 sofa bed); Quadruple (1 king + 2 sofa beds, or 2 twin + 2 sofa beds) | [Booking.com](https://www.booking.com/hotel/it/fabri-171.html) |
| Check-in / out | 14:00 to 23:00 (photo ID and credit card required) / by 10:00 | Booking.com |
| Location | 250 m from the Lungomare, 4-minute walk to the beach, about 800 m from the station, 2 minutes from Piazza della Rinascita, about 0.9 km from Ponte del Mare | Booking.com, hotels-in-it, a guest review |
| Scores (Booking.com) | Location 9.5, Comfort 8.9, Cleanliness 8.8, Staff 8.7, Value 8.6, Facilities 8.6, Wi-Fi 9.0 | Booking.com |
| Other scores | 8.5 from 385 reviews (aggregator); Expedia 8.6; Tripadvisor 3.2/5 from 9 reviews, ranked 31 of 39 | [hotels-in-it](https://www.hotels-in-it.com/en/h/fabri171.html), [Expedia](https://www.expedia.com/Pescara-Hotels-Fabri-171.h42513532.Hotel-Information), [Tripadvisor](https://www.tripadvisor.com/Hotel_Review-g187770-d17580951-Reviews-Fabri_171-Pescara_Province_of_Pescara_Abruzzo.html) |
| Policies | non-smoking, no parties, pets on request (charges may apply), cot free on request, no extra beds, cash accepted | Booking.com |

The photos on the listings show cream linen, dark cushions, woven rattan trays with coffee and croissants, patterned cement tiles in blue and ochre, amber woven lamps and taupe plaster walls. That became the palette and the image prompts.

## What guests say, and what the site does about it

| Finding | Source | Decision |
| --- | --- | --- |
| Location is the strongest point (9.5) and guests list station, square, beach and promenade | Booking.com reviews | Rating chip in the hero, a walkthrough that draws the route |
| "Easy check in through WhatsApp discussion" | Booking.com review (UK) | The WhatsApp journey is the memorable scene, and it runs for real in the server |
| "Difficulty communication with host in checking in", no one to open at 16:30, no English | Tripadvisor, August 2025 | Arrival-time request 2 days before, "message us at 10 minutes" flow, a host alert on every booking, English everywhere (site, booking, messages) |
| Broken shower doors, air conditioning not cooling, lift out of order | Tripadvisor, July 2024 (one review) | Not something a website can fix; listed for the owner, not hidden or contradicted on the site |
| Value 8.6 is the lowest category | Booking.com | Direct price about 10% under the portals, shown with the real engine in the calculator |

## Booking fees

Booking.com's commission in Italy is commonly quoted at about 15% of the booking value, up to 22% for non-refundable rates ([Lodgify guide](https://www.lodgify.com/it/risorse/guida-proprietari-booking/costi-commissioni-booking/), third-party). The Italian competition authority opened an investigation into Booking.com's preferred-partner programmes in April 2026 ([ANSA](https://www.ansa.it/english/news/business/2026/04/22/italian-antitrust-opens-investigation-into-booking.com_2203a8ce-a3d8-4f3b-8df2-5bf12ac4c718.html)). The demo uses 15% as an estimate and says so.

## Calendar sync: what is true and what is not

- Booking.com offers iCal export and import under the calendar section ("Sync calendars"), but availability varies by region and property type, and there is no official statement of how often it reads a feed. Third parties observe about every 1 to 4 hours ([Bookingmood](https://www.bookingmood.com/en-US/blog/ical-feeds-and-syncing), [Properly guide](https://help.getproperly.com/en/articles/5856290-booking-com)).
- Consequence: iCal alone cannot guarantee zero double bookings. The server makes the gap visible and safe (conflict flag + WhatsApp alert) and the docs recommend a channel manager with Booking.com's connectivity API for instant sync.
- Imported channel reservations carry no guest data in iCal, so the console shows "Ospite Booking.com" and an estimated amount.

## WhatsApp: rules that shaped the build

- Messages the business starts must use a **Meta-approved template**; free text works only inside the 24-hour window after the guest writes. A utility template sent inside an open window is free, outside it is charged per message, with rates per country ([Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)). Exact Italian rates were not found in the sources read: check Meta's rate card.
- Meta rejects templates that start or end with a variable, so every template begins and ends with words (a test enforces it).
- Guests must opt in: the booking form has no pre-selected answer, and guest messages are only scheduled after an explicit "WhatsApp" choice.

## Design inspiration

Looked at on Awwwards (hotel category, October 2026) and Godly:

- **Palazzo Sogni** (Awwwards): the hero is one small physical object (a doorbell) in a flat colour field, with line-drawn arch frames. Took the idea of a hero made from a single object of the address: the door number.
- **Lingers** (Awwwards): oversized ghosted lettering that appears on scroll. Took the idea of numerals as architecture; the closing section has a giant outlined 171.
- **Spring/Summer** and **Tatem** (Godly): large type that resolves as you scroll, and a calm dark scene with one product shown step by step. Took the word-by-word reveal and the pinned phone.

## Technical decisions

- No framework and no build step: the pages are ES modules, the server has no dependencies. One engine file is shared by browser and server so a price or rule can never differ between the two.
- Availability is counted in seats because the rooms sleep 2, 3 and 4; a party is matched to whichever rooms have enough free seats.
- GSAP + ScrollTrigger for pinned scenes, Lenis for smooth scroll; both from a CDN with pinned versions and a fallback to the static end state.
- The "171" zoom is an SVG mask with hand-built numerals rather than a font, so the point we zoom into is guaranteed to be solid.
- The route is a schematic, not a map: stops light up where the line passes them (computed from the path geometry), distances are from the property's door.
