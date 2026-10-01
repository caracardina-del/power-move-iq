# Master Audit Ledger (140 items)

Status key: VERIFIED (tested) · PARTIAL (some code, not complete) · OPEN (not started). Never mark VERIFIED without a test.
Baseline commit 0d265bcba90c55a67e409ab490fa709df09a1c82. Data snapshot: schema pmiq_backup_20261001 (migration 0006), counts verified. Auth users NOT in snapshot.

| # | Item | Status | Evidence / notes |
|---|---|---|---|
| 1 | Preserve production and user data | PARTIAL | DB snapshot verified for 12 app tables; Auth user export not made; no publish; no records deleted. |
| 2 | Repair the broken unpublished build | VERIFIED | Build OK; tsgo clean after fixing pricing Link search param; no runtime page errors on 15 routes. |
| 3 | Verify every existing route | VERIFIED | Playwright: 13 routes 200, unknown route and missing Move 404 (2026-10-01 preview). |
| 4 | Remove the fake 90-Move generator | PARTIAL | Library now reads canonical catalog; legacy generator still used by Today/Home/analysis. |
| 5 | Build 90 genuinely distinct canonical Moves | PARTIAL | 18 of 90 authored (categories 1-3), status in_review, no human reviewer claimed. |
| 6 | Define a coherent 90-Move taxonomy | VERIFIED | 15 categories x 6; situations/goals independent tags (taxonomy.ts). |
| 7 | Fix the “10 principles × 6 domains” contradiction | PARTIAL | product-facts.ts holds structure wording; old copy elsewhere not yet swept. |
| 8 | Create one canonical source of Move truth | PARTIAL | src/content/moves/catalog.ts is canonical; DB moves table still legacy. |
| 9 | Move content out of an anonymous frontend array | PARTIAL | Content in versioned modules, served via server functions; no CMS/DB table yet. |
| 10 | Add content versioning | PARTIAL | version/status/owner/reviewer fields present; no history storage. |
| 11 | Add editorial validation | VERIFIED | scripts/validate-moves.ts: 18 parsed, 0 errors. |
| 12 | Add duplicate detection | VERIFIED | Exact + near-duplicate (title/principle/script) checks in validateCatalog. |
| 13 | Support Move retirement safely | PARTIAL | retired/replacedBy fields + validator pending check; no redirect UI. |
| 14 | Add permanent Move routes | VERIFIED | /library/$slug renders; bad slug returns 404. |
| 15 | Make Library cards functional | VERIFIED | Cards are links to detail pages. |
| 16 | Build the full Move page | PARTIAL | Full page with all fields; Pro fields gated server-side (getMoveFull). Pro unlock not browser-tested. |
| 17 | Add Move actions | PARTIAL | Share + copy script done; save/add-to-plan not yet. |
| 18 | Add full-text search | PARTIAL | Search over title/summary/principle/tags/example/opening line; Playwright q=silence loads. |
| 19 | Add useful filters | PARTIAL | Category/situation/goal/risk/access filters, URL-persisted; channel/relationship not exposed. |
| 20 | Add sorting | PARTIAL | Number and A-Z sort. |
| 21 | Add Library navigation aids | PARTIAL | Result count, clear filters, breadcrumb. |
| 22 | Refine the situation taxonomy | OPEN | |
| 23 | Add goal selection | OPEN | |
| 24 | Improve classification | OPEN | |
| 25 | Use progressive context questions | OPEN | |
| 26 | Add “Help me frame it” | OPEN | |
| 27 | Ground every recommendation in a real Move | OPEN | |
| 28 | Separate canonical content from personalization | OPEN | |
| 29 | Add “View original Move” | OPEN | |
| 30 | Support alternative Move selection | OPEN | |
| 31 | Prevent invented Move references | OPEN | |
| 32 | Convert recommendations into client-owned plans | OPEN | |
| 33 | Add editing controls | OPEN | |
| 34 | Preserve the original | OPEN | |
| 35 | Add robust draft behavior | OPEN | |
| 36 | Add version history | OPEN | |
| 37 | Make scripts individually actionable | OPEN | |
| 38 | Add tone selection | OPEN | |
| 39 | Add channel selection | OPEN | |
| 40 | Add length selection | OPEN | |
| 41 | Preserve customized scripts | OPEN | |
| 42 | Put the primary answer first | OPEN | |
| 43 | Add a persistent “Your Move” summary | OPEN | |
| 44 | Preserve rich analysis while improving readability | OPEN | |
| 45 | Make secondary information collapsible | OPEN | |
| 46 | Improve the content hierarchy | OPEN | |
| 47 | Separate saved-content types | OPEN | |
| 48 | Add a case lifecycle | OPEN | |
| 49 | Add Saved organization controls | OPEN | |
| 50 | Add safer previews | OPEN | |
| 51 | Add clear record actions | OPEN | |
| 52 | Protect user ownership and isolation | OPEN | |
| 53 | Expand outcome capture | OPEN | |
| 54 | Connect outcomes to the correct records | OPEN | |
| 55 | Add responsible personalization | OPEN | |
| 56 | Give the user control over memory | OPEN | |
| 57 | Surface useful learning | OPEN | |
| 58 | Add animated three-dot thinking states | OPEN | |
| 59 | Use accurate status language | OPEN | |
| 60 | Prevent duplicate operations | OPEN | |
| 61 | Add success and failure feedback | OPEN | |
| 62 | Respect reduced motion | OPEN | |
| 63 | Make important boxes permanently visible | OPEN | |
| 64 | Define complete component states | OPEN | |
| 65 | Use emphasis according to importance | OPEN | |
| 66 | Improve dark-mode readability | OPEN | |
| 67 | Replace the incomplete two-section homepage | OPEN | |
| 68 | Rework the hero | OPEN | |
| 69 | Reduce the oversized decorative owl | OPEN | |
| 70 | Add an above-the-fold product demonstration | OPEN | |
| 71 | Integrate the situation form into the hero story | OPEN | |
| 72 | Replace flat example buttons with Situation Cards | OPEN | |
| 73 | Add a “What the system sees” section | OPEN | |
| 74 | Add a five-part output section | OPEN | |
| 75 | Add a 90-Move Library showcase | OPEN | |
| 76 | Add Power Move IQ versus generic AI | OPEN | |
| 77 | Add an intentional “How it works” sequence | OPEN | |
| 78 | Add an editable Move Plan demonstration | OPEN | |
| 79 | Add Countermoves and Second Move demonstration | OPEN | |
| 80 | Add Outcome Memory to the homepage | OPEN | |
| 81 | Add realistic use-case stories | OPEN | |
| 82 | Add trust and methodology | OPEN | |
| 83 | Add Free versus Pro clarity | OPEN | |
| 84 | Add a proper final call-to-action section | OPEN | |
| 85 | Improve homepage visual rhythm | OPEN | |
| 86 | Refine homepage typography | OPEN | |
| 87 | Add purposeful homepage motion | OPEN | |
| 88 | Improve homepage calls to action | OPEN | |
| 89 | Create separate signed-out and signed-in homepage states | OPEN | |
| 90 | Improve homepage/header navigation | OPEN | |
| 91 | Design responsive compositions | OPEN | |
| 92 | Detect high-stakes situations | OPEN | |
| 93 | Route dangerous situations safely | OPEN | |
| 94 | Set professional-advice boundaries | OPEN | |
| 95 | Add ethical boundaries to Moves | PARTIAL | Every Move has an ethicalBoundary; validator enforces fuller text for medium/high risk. |
| 96 | Add privacy-first display behavior | OPEN | |
| 97 | Add user data controls | OPEN | |
| 98 | Add deletion safeguards | OPEN | |
| 99 | Define one entitlement matrix | PARTIAL | ENTITLEMENTS matrix in product-facts.ts; not yet consumed by UI. |
| 100 | Decide the actual free-analysis promise | OPEN | |
| 101 | Reconcile Library access | PARTIAL | Free Moves fully public; Pro Move execution guidance returned only after server tier check. |
| 102 | Upgrade old limited cases | OPEN | |
| 103 | Define post-subscription access | OPEN | |
| 104 | Prevent entitlement bypass | OPEN | |
| 105 | Establish one source of truth for product facts | PARTIAL | product-facts.ts created. |
| 106 | Update all marketing and product surfaces | OPEN | |
| 107 | Remove unsupported claims | OPEN | |
| 108 | Connect Today to canonical Moves | OPEN | |
| 109 | Avoid random repetition | OPEN | |
| 110 | Connect Today to client work | OPEN | |
| 111 | Inventory legacy records | OPEN | |
| 112 | Map legacy Moves carefully | OPEN | |
| 113 | Backfill required metadata | OPEN | |
| 114 | Make migration safe and repeatable | OPEN | |
| 115 | Design every important system state | OPEN | |
| 116 | Preserve work during failures | OPEN | |
| 117 | Add sensible timeouts | OPEN | |
| 118 | Make the full product keyboard-accessible | OPEN | |
| 119 | Add visible focus treatment | OPEN | |
| 120 | Add semantic structure | OPEN | |
| 121 | Add accessible processing feedback | OPEN | |
| 122 | Meet visual accessibility requirements | OPEN | |
| 123 | Test all major breakpoints | OPEN | |
| 124 | Repair mobile analysis usability | OPEN | |
| 125 | Repair mobile Saved usability | OPEN | |
| 126 | Repair mobile editing/versioning | OPEN | |
| 127 | Add safe product events | OPEN | |
| 128 | Exclude sensitive content from analytics | OPEN | |
| 129 | Catalog integrity tests | PARTIAL | Integrity validator runnable; full 90 catalog pending. |
| 130 | Recommendation tests | OPEN | |
| 131 | Move Plan tests | OPEN | |
| 132 | Saved workspace tests | OPEN | |
| 133 | Outcome Memory tests | OPEN | |
| 134 | Entitlement tests | OPEN | |
| 135 | Safety tests | OPEN | |
| 136 | Privacy and security tests | OPEN | |
| 137 | Loading and failure tests | OPEN | |
| 138 | Visual and accessibility tests | OPEN | |
| 139 | Homepage acceptance tests | OPEN | |
| 140 | Final release gate | OPEN | |
