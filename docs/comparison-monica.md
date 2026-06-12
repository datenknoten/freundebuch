# Comparison: Freundebuch vs. Monica

**Version:** 1.1
**Date:** 12.06.2026
**Status:** Active

---

## 1. Why This Document Exists

[Monica](https://github.com/monicahq/monica) is the best-known open-source personal CRM and occupies the same space as Freundebuch. Knowing where we're ahead, where we're behind, and where we're simply different helps us prioritize the roadmap and explain to potential users why Freundebuch exists at all.

This is a living document - update it when either project ships something significant.

---

## 2. Monica at a Glance

Monica is a PHP/Laravel + Vue application backed by MySQL (SQLite and PostgreSQL also work), licensed under AGPL-3.0 - same license as us. It's self-hostable via Docker for free, with a hosted SaaS option at $9/month.

The crucial context: **Monica is currently two products - and both have stopped moving.**

- **Monica v4** - the original app, stable and feature-rich, but frozen since its last release (v4.1.2, May 2024). It is still the "latest" stable release.
- **Monica v5 "Chandler"** - a from-scratch rewrite, in beta since June 2023. The newest tag of any kind is v5.0.0-beta.5 (April 2025); three years of beta with no stable release in sight. It introduces a new "vaults" data model and a journaling focus, but launched missing several v4 features that are only partially backfilled.

As of June 2026 the project is **effectively dormant**: the last commit to `main` was August 30, 2025 - over nine months of zero activity - with no official announcement, no shutdown notice, and no new maintainer. The last official blog post is still "Chandler is in beta" from June 2023. Telling detail: founder Régis Freyd's own successor project, [peopleOS](https://github.com/djaiss/peopleOS) ("the spiritual successor to Monica"), was archived on August 31, 2025 - one day after Monica's last commit. The hosted SaaS at monicahq.com remains live at unchanged pricing ($9/month, free tier capped at 10 contacts), and the repo is not archived, but nothing is being developed.

There is **no automated migration path from v4 to v5**, and the maintainers said one would likely not come - community threads explicitly warn that upgrading means data loss. Monica's users are caught between a stable dead end and an unfinished, now-unmaintained rewrite.

Sources (all re-verified 2026-06-12): [project update (#6626)](https://github.com/monicahq/monica/issues/6626), [v4 vs v5 discussion (#7321)](https://github.com/monicahq/monica/discussions/7321), [vaults docs](https://docs.monicahq.com/vaults/introduction), [releases](https://github.com/monicahq/monica/releases), [commit history](https://github.com/monicahq/monica/commits/main), [pricing](https://www.monicahq.com/pricing).

---

## 3. Where Freundebuch Is Ahead

| Area | Freundebuch | Monica |
|---|---|---|
| **Collectives with auto-relationships** | Adding a member to a family, company, or club with a role automatically creates relationships to the other members based on type-specific rules | Manual relationship linking only - no equivalent concept |
| **CardDAV sync depth** | vCard 4.0 with custom extensions for met info, interests, and social profiles; per-device app passwords | CardDAV exists but is more basic; Chandler's CalDAV (calendar) support was merged to `main` in August 2025 and has never appeared in a tagged release |
| **Met info as first-class data** | How/where/when/context of meeting someone, synced via vCard | A shallower "how you met" field |
| **Professional history** | Full employment history as a sub-resource (positions, companies, dates) | A job title and company snapshot |
| **Modern authentication** | Passkeys/WebAuthn via Better Auth, app-specific passwords | Standard Laravel session auth |
| **Geospatial features** | PostGIS-backed address autocomplete (OpenStreetMap/Overpass), maps via Leaflet | Plain address strings |
| **AI integration** | Built-in MCP server for AI assistant access | None (explicitly no AI integrations, as a privacy stance) |
| **Development momentum** | Weekly releases, semantic-release automation, strict TypeScript, type-safe SQL via PgTyped | Stalled: no commits since August 2025, no release since April 2025, v4 frozen since May 2024 |
| **No version schism** | One codebase with continuous migrations | v4/v5 split with no migration path |

---

## 4. Where Monica Is Ahead (Our Gaps)

Everything in this list is something Monica shipped years ago and we have only planned - or not planned at all.

| Feature | Monica | Freundebuch status |
|---|---|---|
| **Reminders & stay-in-touch** | Set a contact frequency per person, get reminded automatically; logging a call resets the timer | Epic 3, not started. **Our most critical gap** - without it we're an address book with history, not a relationship tool |
| **Notes per contact** | Shipped | Epic 15, planned |
| **Journal / diary** | Chandler's flagship feature - entries tag contacts and build a life timeline | No equivalent planned (deliberate, see §6) |
| **Gift tracking** | Gifts given or planned, with status | Only "gift" as an encounter type |
| **Debt tracking** | Money owed or lent per contact | No equivalent |
| **Tasks per contact** | Shipped | No equivalent |
| **Life events timeline** | Shipped (v4), being rebuilt in v5 | Partial overlap with Epic 8 (Activity Timeline), not started |
| **Pets & food preferences** | Small but well-loved fields | No equivalent |
| **Import/export** | vCard import/export, documented REST API | Epic 7, not started |
| **Vaults (v5)** | Private data containers shareable per-vault; even account admins can't see vaults they're not a member of | Epic 16 (Multi-User Workspaces) is similar but planned; theirs is shipped (in beta) |
| **Hosted SaaS** | $9/month for people who don't want to self-host | Self-host only (hosted version is a stated goal in [concept.md](./concept.md)) |
| **Maturity & community** | Around since 2017, large ecosystem, extensive docs and third-party guides | Young project |

---

## 5. Different, Not Better or Worse

- **Philosophy:** Freundebuch leans into the warm German "Freundebuch" tradition - encounters are first-class history objects and the language is personal ("Friend", "Circle", "Collective"). Monica v5 is repositioning toward "documenting your life" with the journal at the center.
- **License:** Both AGPL-3.0.
- **Database:** PostgreSQL + PostGIS vs. MySQL-primary.
- **Localization:** We ship German and English; Monica supports more languages.
- **Frontend:** SvelteKit with SSR vs. Vue + Inertia.js.

---

## 6. Strategic Takeaways

1. **Close the reminders gap first.** Stay-in-touch reminders are the feature that turns an address book into a relationship tool, and the feature Monica users will expect on day one. Epic 3 should be high priority.
2. **The migration opening is real - and wider than before.** Monica v4 users are orphaned, and with all development stopped since August 2025 the rewrite will not rescue them. vCard import (Epic 7) plus a dedicated Monica importer would be a direct funnel - Monica's documented REST API makes extracting their data straightforward.
3. **Don't chase the journal.** Chandler bet on journaling, which drifts toward diary-app territory. Our encounter model plus collectives is a more distinct position.
4. **Lead with collectives.** Nothing in Monica auto-derives relationships from group membership. It's our clearest differentiator and worth featuring prominently in any "why Freundebuch" messaging.
5. **Self-service friend pages (Epic 13) stay unique.** Monica has nothing comparable - friends filling in their own pages fits the Freundebuch tradition perfectly and no competitor offers it.
