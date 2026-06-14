# Product

## Register

product

## Users

People who want to maintain real relationships, not manage leads. Individuals and families/households sharing one address book. They're not salespeople and not power-CRM users — they're someone who wants to remember a friend's kid's name, when they last caught up, and to get a nudge before a birthday slips by. Context of use: personal time, often on a phone, low-pressure. The job to be done: keep meaningful connections from quietly fading. Self-hosters and privacy-conscious users are a core constituency (Docker, CalDAV/CardDAV, no lock-in).

## Product Purpose

Freundebuch is a digital friendship book for adults — the grown-up version of the childhood German tradition. It turns a plain address book into a relationship tool: rich friend "pages" (how you met, interests, important dates, notes), encounter/timeline tracking, reminders to reach out, circles & tags for organization, and standards-based sync (vCard, iCalendar, CalDAV/CardDAV) so data stays portable and yours. Success = people feel it helps them stay in touch and remember what matters, while keeping full control of their data. Explicitly not a CRM, not a sales tool, not a social network.

## Brand Personality

Warm, human, professional yet fun — "a helpful friend who knows their stuff," not enterprise software. Three words: **warm, personal, trustworthy.** Voice talks to a person ("you"), never a "user"; says Friend not Contact, Circle not Group, catch up not "interaction." Emotional goals: the feeling of opening a well-loved book — warmth, recognition, gentle care — never the cold efficiency of business software. Copy is concise and friendly ("Added to your Freundebuch!" over "Contact created successfully.").

## Anti-references

- **CRMs / sales tools** (Salesforce, HubSpot, pipeline/lead/touchpoint UIs) — the exact thing this is not.
- **Cold enterprise SaaS** — dense data grids, clinical language, dashboard-metric template.
- **Social networks** — feeds, follower counts, engagement-maximizing patterns.
- **Generic AI product slop** — identical icon-heading-text card grids, gray-on-tinted-white low-contrast body text, tiny tracked uppercase eyebrows on every section, side-stripe accent borders, gradient text.

## Design Principles

1. **Relationships over data.** Every screen asks "does this help maintain a real connection?" — favor context and story over raw fields.
2. **Warmth is the differentiator.** It should feel like a well-loved book, not enterprise software — carried by typography, language, and restraint, not decoration.
3. **Privacy first, visibly.** Self-hostable, standards-based, no telemetry; the design should never imply data leaves the user's control.
4. **Simplicity over features.** Do a few things beautifully. Progressive disclosure of advanced power; the common path stays calm and obvious.
5. **Intuitive without a manual.** Mobile-first, clear hierarchy, helpful human error messages; no tutorial required to get started.

## Accessibility & Inclusion

WCAG 2.1 AA target. Body text ≥4.5:1, large text ≥3:1 — verify the forest green and sage against light backgrounds, and avoid muted-gray body text on tinted near-white. Visible keyboard focus rings (`focus-visible`) on all interactive elements; icons conveying meaning get alt/labels. Honor `prefers-reduced-motion` with crossfade/instant fallbacks. Passwordless passkey (WebAuthn) auth supports inclusive sign-in. Mobile-first responsive; test heading copy at every breakpoint for overflow.
