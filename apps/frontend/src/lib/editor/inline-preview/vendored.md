# Vendored: atomic-editor inline-preview engine

These files are a partial vendor of [`@atomic-editor/editor`][repo] — the
React-free CodeMirror 6 extensions that power Obsidian-style inline markdown
live-preview. We vendor rather than depend on the npm package because it is
pre-1.0, single-maintainer, and declares `react`/`react-dom` as **required**
peer dependencies (only its `AtomicCodeMirrorEditor.tsx` uses React; the engine
below does not). Vendoring keeps React out of the bundle and gives us a frozen,
reviewable copy.

[repo]: https://github.com/kenforthewin/atomic-editor

## Source

- Repo: `github.com/kenforthewin/atomic-editor`
- Pinned commit: `26f75e76491e3f9dd698ea91ab91efd5a5e84080`
- License: MIT (see `./LICENSE`)

## Files

| File | Upstream path | Notes |
|---|---|---|
| `inline-preview.ts` | `src/inline-preview.ts` | core live-preview decorations |
| `tree-progress.ts` | `src/tree-progress.ts` | incremental-parse progress plugin (dep of above) |
| `atomic-theme.ts` | `src/atomic-theme.ts` | **modified**: `dark:true`→`false` |
| `edit-helpers.ts` | `src/edit-helpers.ts` | emphasis-pair + code-fence input handlers |
| `inline-preview.css` | `src/styles/inline-preview.css` | unmodified |
| `index.ts` | — | local barrel, not from upstream (no React re-exports) |

**Not vendored:** `AtomicCodeMirrorEditor.tsx` (React), upstream `index.ts`
(barrel), `table-widget.ts`, `image-blocks.ts`, `wiki-links.ts`,
`code-languages.ts` — not needed for encounter notes.

## Local modifications

All local edits are marked with `FB:` comments. Currently:
- `atomic-theme.ts`: flipped `{ dark: true }` → `{ dark: false }` (app is light-only).

Theming is done entirely through `--atomic-editor-*` CSS variables, set on the
editor host by `../markdown-editor.svelte` — the vendored files are otherwise
verbatim.

## Re-syncing

Diff against upstream at the pinned commit, then bump the commit hash here and
in the file headers:

```
curl -fsSL https://raw.githubusercontent.com/kenforthewin/atomic-editor/<sha>/src/inline-preview.ts | diff - inline-preview.ts
```
