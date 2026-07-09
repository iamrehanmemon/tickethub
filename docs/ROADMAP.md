# Ticket Hub Power Pages Portal — Cleanup & Modernization Roadmap

## Context

This is a Power Pages (Dataverse) portal, live in production, built over time by multiple developers without a shared standard. A full survey of the codebase confirmed the user's concerns are real and specific:

- **No single branding/theming source of truth.** `web-files/portalbasictheme.css` (792 lines) is a *Microsoft-generated* file — its own header says it gets overwritten whenever someone uses the Site Styling admin panel, so it cannot be hand-edited as a long-term source of truth. On top of it sit two more competing, hand-authored files: `theme.css` (1,853 lines, 141 hardcoded hex occurrences, zero CSS variables) and `style.css` (227 lines, a "soft UI" reset built with heavy `!important` overrides). Beyond that, 16 of 42 Liquid web-templates embed their *own* inline `<style>` blocks (27 total), and hex colors are hardcoded across 30+ files. There are effectively 4-5 competing styling mechanisms with no precedence rules.
- **Real code duplication**, not just structural repetition:
  - JS: `Submit-Ticket` (981 lines) and `View-Ticket` (1,910 lines) each independently define the same helper functions (`showLoader`, `hideLoader`, `populateDropdown`, `loadMultiSelect`, `filterDropdown`, `addAttachmentField`, `removeAttachmentField`, `setupCategoryToggle`) with zero sharing. Several list-view JS files (`IT-CPG-and-Other-Tickets`, `Legal-Portal-List`, etc., ~52 lines each) are exact duplicates.
  - Liquid: the "ESSD guidance" banner block is byte-identical across the HR/Finance/WPS metadata web-templates. More broadly, the large metadata templates (HR-Metadata 1,442 lines, Finance-Metadata 1,441 lines — diffed at ~64% structural overlap) were clearly cloned from one another and diverged, rather than sharing partials.
- **Excess scrolling** traces directly to that clone-and-diverge pattern: each metadata template repeats its own `p-4`/`mb-5`-heavy field-row and step-section markup instead of one shared, density-tuned partial.
- **No build tooling exists** (no package.json/webpack/vite), and none should be force-fit — Power Pages deploys raw files as-is via `pac pages upload`, so any fix must work within that deployment model.
- **No git repository exists at the repo root today.** This is itself a risk: there is currently no way to diff, review, or roll back a change to a production site.
- Some leftover cruft is still live in the tree: `web-pages/test-page-2-deleted`, `advanced-forms/ticket-submission-2`, a `DEVDEBUG` web-template (813 lines), near-duplicate canned-responses templates, and one folder name using a Unicode en-dash instead of a hyphen.

The user is (rightly) hesitant to touch a live production site. They've confirmed: they can clone this into their own personal tenant to use as a safe staging environment, they want git initialized now as the first step, and for this round they want **the roadmap delivered for team review — no pilot implementation yet.**

The goal stated by the user: reduce duplication, establish one real branding/theming mechanism, tighten layouts to cut scrolling, and reach a "modern UI" polish level associated with React-grade frontends — achieved through server-rendered Liquid/CSS/JS, not by migrating off Power Pages.

## Recommended Approach: Explicit Non-Goal First

**Do not migrate to React or any SPA framework.** The platform's value (Dataverse-bound forms, built-in validation/permissions) comes from staying server-rendered. The pain points described (duplication, scrolling, inconsistent branding, "boxy" feel) are CSS/Liquid/light-JS problems, solvable without a framework migration. "Modern UI" should be read as a polish/consistency bar — design tokens, componentized partials, tighter density, CSS micro-interactions — not literal React adoption.

## Phase 0 — Safety Net (do this first, before any visual/functional change)

1. **Initialize git at the repo root now** and commit the current production state as the baseline. This alone makes every future change diffable and revertible — zero risk, highest leverage.
2. **Stand up the personal-tenant staging environment** the user already has access to: clone the current solution there via `pac pages download` / `pac pages upload` so every subsequent phase can be visually verified before touching prod.
3. **Manual visual QA checklist** (no new tooling needed yet): before/after full-page screenshots of Home, Submit-Ticket, Track-Ticket, View-Ticket, Team, Analytics, plus one example each of HR/Finance/WPS/IT metadata templates. Automated visual-diff tooling (e.g. Percy) is an optional later add, not a blocker.
4. **Branch/PR discipline** even without CI: `main` = current prod state, one feature branch per phase, QA on staging tenant, merge, then `pac pages upload` to prod, then tag the deployed commit for a known rollback point.
5. **Round-trip validation**: confirm `pac pages download` → repo diff → `pac pages upload` is a no-op before relying on it for real changes.

## Phase 1 — Design Token Foundation

Create a new file, `web-files/brand-tokens.css` (+ matching `.webfile.yml`), as the real source of truth going forward. Do **not** build on `portalbasictheme.css`'s `--portalThemeColor*` variables — that file is regenerated by the Site Styling admin panel and explicitly warns against manual edits.

- Define namespaced tokens on `:root`: `--brand-color-primary`, `--brand-color-surface`, `--brand-space-1..8`, `--brand-radius-sm/md/lg`, `--brand-shadow-sm/md`, `--brand-font-family` — seeded from the most-repeated of the 28 hardcoded hex values already in use, so this phase starts as a zero-visual-diff refactor.
- Load `brand-tokens.css` before `theme.css`/`style.css`. If Power Pages doesn't allow controlling `web-files` load order by filename, add an explicit `<link>` in `web-templates/header/Header.webtemplate.source.html`, which already carries two external stylesheet links (Google Fonts, Bootstrap Icons) — a proven, safe pattern in this codebase.
- Migrate hardcoded hex in `theme.css`/`style.css` to `var(--brand-*)` incrementally, one semantic color group at a time, each independently diffable. Extend to the 6 per-page `custom_css.css` files and the 27 inline `<style>` blocks opportunistically as those files are touched for other reasons — not as a forced sweep.
- Document the new precedence (`brand-tokens.css` canonical, `portalbasictheme.css` legacy/admin-panel-only, `theme.css`/`style.css` consumers of tokens) in a short `docs/theming.md`.

## Phase 2 — JS De-duplication

No bundler exists and none should be introduced. A single shared, site-wide `<script>` file matches Power Pages' raw-file deployment model.

- New `web-files/site-common.js` (+ `.webfile.yml`) holding the confirmed-duplicated helpers from `Submit-Ticket` and `View-Ticket`.
- Load once in `Header.webtemplate.source.html` (or `Footer`, if DOM-readiness requires it), before per-page scripts.
- Migration order, lowest risk first: (1) the four ~52-line near-identical list JS files, (2) then Submit-Ticket/View-Ticket helpers one function at a time, starting with purely visual ones (`showLoader`/`hideLoader`) and ending with `setupCategoryToggle` last — verify its two implementations are truly identical before treating it as a duplicate, not just similarly named.
- Leave old per-page code commented out for one deploy cycle per function as a fast revert path.

## Phase 3 — Liquid Template De-duplication / Componentization

Start from the **already-confirmed, byte-identical ESSD guidance banner** in `Ticketing-System---HR-Metadata`, `...Finance-Metadata`, and `...WPS-Metadata`:

1. Extract it to a new partial (e.g. `web-templates/ticketing-system---essd-guidance-banner/`) and replace all 3 inline copies with `{% include %}`. This is a proven zero-visual-diff change touching 3 templates at once — the ideal trust-building first move.
2. For the larger metadata templates (HR vs Finance at ~64% structural overlap), use a two-tier strategy:
   - **Tier 1 (do first):** extract small, verbatim-identical sub-partials without conditional branching — the field-row wrapper (label + input + validation), the shared "step section" fieldset.
   - **Tier 2 (defer):** collapsing HR/Finance/WPS/etc into one parametrized template is technically possible via Liquid `{% include %}` + `{% case %}`, but raises blast radius per change substantially. Recommend stopping at Tier 1 until the team has a full deploy cycle of confidence with the partial pattern.
3. Roll the same approach out later to Approvals-Section, MetaData-Update, Legal-Case, Canned-Responses-PreSubmission, and Customer-Onboarding-Departments-Sections as separate, later batches — not in the same pass.

This phase carries the highest risk in the roadmap (affects form rendering/submission, not just visuals). Each template family should be its own commit/PR with full end-to-end submission testing, not just visual comparison.

## Phase 4 — Layout Density / Reduce Scrolling

- Replace the copy-pasted `p-4`/`mb-5` spacing in metadata templates with the Phase 1 spacing tokens, ideally baked into the Phase 3 shared "step section" partial rather than swept separately.
- Evaluate Bootstrap's native accordion/collapse (already loaded, no new JS needed) for long metadata sections that aren't always all needed at once — scope per template with explicit sign-off on which sections are safe to collapse (risk: hiding required fields).
- Defer header/global layout compactness until after metadata-template density work is validated — header changes are site-wide and carry higher blast radius.
- Measure scroll-height before/after per template on the staging tenant as a concrete improvement metric.

## Phase 5 — Modern UI Polish

Sequenced last, after Phases 1-4 are validated:

1. Reconcile `style.css`'s `!important`-heavy soft-UI overrides with `theme.css`'s hardcoded overrides, both now consuming Phase 1 tokens — a natural point to fix specificity instead of relying on `!important`.
2. CSS-only transitions/micro-interactions: hover/focus transitions on buttons/cards/inputs, elevation-on-hover (extending `style.css`'s existing shadow direction), visible focus states for accessibility.
3. Confirm the already-loaded Poppins font is applied consistently via `--brand-font-family` everywhere, not just some templates.
4. Progressive-enhancement JS (loader-on-submit, double-submit prevention) is optional, lowest priority, and should never intercept Dataverse's own form validation/submission handling — do this only after a track record of safe changes from earlier phases.

## Cleanup: Investigate-Then-Remove (never blind-delete on a production repo)

| Artifact | Action |
|---|---|
| `web-pages/test-page`, `web-pages/test-page-2-deleted` | Check nav/weblink-sets and any inbound references before removing. |
| `advanced-forms/ticket-submission-2` | Diff against `ticket-submission`; confirm neither is referenced by a live page first. |
| `web-templates/devdebug` (813 lines) | Grep repo-wide for `{% include %}` references; if unused/unreferenced in prod nav, remove. |
| `ticketing-system---canned-responses` vs `...-presubmission` | Diff; consolidate via Phase 3 partials rather than deleting if both are actually referenced. |
| `web-templates/starlinks-–-access-not-enabled` (en-dash in name) | Liquid includes are name-based — check all references before any rename; do as its own isolated, revertible change. |
| "ticketing-system" vs "ticket-system" naming inconsistency | Cosmetic; fold into a later rename pass only, same reference-checking discipline. |

Each cleanup item gets its own isolated, revertible commit — never bundled with functional changes.

## Sequencing Summary

Phase 0 (git + staging tenant) → Phase 1 (tokens) → Phase 2 (JS de-dup) → Phase 3 (Liquid componentization, ESSD banner first) → Phase 4 (density) → Phase 5 (polish) → cleanup items interleaved wherever their investigation is cheap. No pilot rollout is being executed in this round — this document is for team review; a concrete pilot (e.g. the HR-Metadata family, since it's part of the proven ESSD-banner trio) can be scheduled as a follow-up once the roadmap is approved.

## Verification

Since this round produces no code changes, "verification" here means: circulate this roadmap for team sign-off, then when implementation begins, verify each phase on the personal-tenant staging clone (`pac pages download`/`upload` round trip) using the manual visual QA checklist above before any `pac pages upload` to production, plus end-to-end form-submission testing for any change touching Phase 2 or Phase 3 (JS/Liquid, not just CSS).
