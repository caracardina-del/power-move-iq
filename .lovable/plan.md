# Power Move IQ MVP

## Build
- Replace the blank project with a mobile-first editorial app using near-black, warm ivory, antique-gold rules, serif headlines, restrained motion, and a reserved approved-owl slot.
- Add shared desktop navigation and mobile bottom navigation for Today, Analyze, Library, Saved, About, and Account.
- Build the complete public and signed-in experience: homepage, situation prompts, analysis form, eight-part MOVE IQ result, Daily Move, 90-move library, Weekly Strategy Lens, Saved Cases, Outcome Memory, pricing/paywall, account, authentication, About, Privacy, and Terms.
- Include polished populated, empty, loading, and error states plus original demonstration cases and moves.

## Accounts and persistence
- Enable email/password and Google sign-in with minimal profile creation and no extra onboarding.
- Create secure user-owned records for profiles, analyses, chosen moves, outcomes, favorites, streaks, and preferences.
- Keep roles in a separate protected role table, defaulting new accounts to user.
- Seed the 90-move public library and examples directly in the database migration so the app is inspectable immediately.

## Functional behavior
- Persist signed-in users’ analyses, saved cases, outcomes, favorite moves, and streak progress.
- Let guests inspect the seeded experience and sample result; require sign-in for personal persistence.
- Implement free/pro entitlement checks and the requested pricing/paywall presentation. Payment activation remains the only external setup item and no credentials will be invented.

## Technical details
- Use the existing TanStack Start and Tailwind v4 structure with semantic design tokens.
- Use Lovable Cloud authentication and row-level access policies for every user-owned table.
- Use separate, metadata-complete routes for each major screen and legal page.
- Validate the finished app in desktop and mobile viewports, including navigation and the core analysis flow.
