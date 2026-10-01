<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Canonical Move content lives in src/content/moves/* and is validated by `bun ./scripts/validate-moves.ts`; only *.server.ts modules import the catalog so Pro guidance never ships to the browser.
- Product numbers and the Free/Pro entitlement matrix come from src/lib/product-facts.ts; UI copy reads from it rather than hard-coding counts.
