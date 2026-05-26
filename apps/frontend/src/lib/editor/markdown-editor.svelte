<script lang="ts">
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { Compartment, EditorState, Transaction } from '@codemirror/state';
import { placeholder as cmPlaceholder, EditorView, keymap } from '@codemirror/view';
import { onDestroy, onMount } from 'svelte';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { createI18n } from '$lib/i18n/index.js';
import {
  atomicEditorTheme,
  atomicMarkdownSyntax,
  extendEmphasisPair,
  inlinePreview,
} from './inline-preview';
import './inline-preview/inline-preview.css';
import { mentionAutocomplete } from './mentions';

interface Props {
  /** Raw markdown — the source of truth. Two-way bound. */
  value?: string;
  /** Accessible label text for the editor content. Ignored if `labelledBy` is set. */
  ariaLabel?: string;
  /** ID of an element labelling the editor (wins over `ariaLabel`). */
  labelledBy?: string;
  /** Placeholder shown while the document is empty. */
  placeholder?: string;
  /** Disables editing (mirrors the textarea's `disabled`). */
  disabled?: boolean;
  /** Enables `@`-mention autocomplete across friends, collectives, encounters. */
  mentions?: boolean;
}

let {
  value = $bindable(''),
  ariaLabel = 'Notes',
  labelledBy = '',
  placeholder = '',
  disabled = false,
  mentions = true,
}: Props = $props();

const i18n = createI18n();

let host: HTMLDivElement;
let view: EditorView | undefined;

// Compartments let us reconfigure these after mount when the corresponding
// props change (e.g. the user switches language while the form is open) —
// extensions baked into EditorState.create are otherwise fixed at construction.
const editableConf = new Compartment();
const placeholderConf = new Compartment();
const attrsConf = new Compartment();
const mentionsConf = new Compartment();

function placeholderExt(text: string) {
  return text ? cmPlaceholder(text) : [];
}
function attrsExt(forId: string, label: string) {
  return EditorView.contentAttributes.of(
    forId ? { 'aria-labelledby': forId } : { 'aria-label': label },
  );
}

// FB: the vendored atomic theme targets full-page editors (height:100%,
// 40vh bottom padding, internal scroll). For an inline form field we want
// the editor to grow with its content up to a cap. Added after
// atomicEditorTheme so these rules win on conflict.
const inlineFieldTheme = EditorView.theme({
  '&': { height: 'auto' },
  '.cm-scroller': { overflow: 'auto', maxHeight: '50vh' },
  '.cm-content': { paddingBottom: '0.5rem', minHeight: '4.5rem' },
});

// Open links from the editor only for safe schemes — the URL comes straight
// from note markdown, so reject javascript:/data: etc. before window.open.
const SAFE_LINK_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

// Allowlist of in-app route prefixes that should route through SvelteKit's
// client router (in-tab, no full reload). Limited to the entity-detail routes
// that `@`-mentions can target. Any other same-origin path — `/api/...`,
// auth endpoints, file downloads — falls through to the new-tab `window.open`
// so we don't trash unsaved form state or break server-served responses.
const APP_ROUTE_PREFIXES = ['/friends/', '/collectives/', '/encounters/', '/circles'];
function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}

function openSafeLink(url: string): void {
  try {
    const parsed = new URL(url, window.location.href);
    // Same-origin link to a known app route (e.g. an `@`-mention target like
    // /friends/{id}) — navigate in-app so the user stays in the SPA.
    if (parsed.origin === window.location.origin && isAppRoute(parsed.pathname)) {
      goto(parsed.pathname + parsed.search + parsed.hash);
      return;
    }
    if (!SAFE_LINK_SCHEMES.includes(parsed.protocol)) return;
    window.open(parsed.href, '_blank', 'noopener,noreferrer');
  } catch {
    // Malformed URL — ignore rather than open anything.
  }
}

// Localized kind labels for the mention dropdown, read once at mount. An
// in-place language switch won't relabel an open editor's list — acceptable,
// since the list is transient and forms are typically opened fresh.
function mentionExtension() {
  if (!mentions) return [];
  const t = get(i18n).t;
  return mentionAutocomplete({
    friend: t('shortcuts.help.friend'),
    collective: t('shortcuts.help.collective'),
    encounter: t('shortcuts.help.encounter'),
  });
}

onMount(() => {
  view = new EditorView({
    parent: host,
    state: EditorState.create({
      doc: value,
      extensions: [
        history(),
        // Mentions before the default keymap so its completion keybindings
        // (Enter / arrows / Esc) take precedence while the list is open.
        // Compartment lets the `mentions` prop toggle the extension after
        // mount, matching the placeholder/editable/attrs pattern below.
        mentionsConf.of(mentionExtension()),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        inlinePreview({ onLinkClick: openSafeLink }),
        extendEmphasisPair,
        atomicMarkdownSyntax,
        atomicEditorTheme,
        inlineFieldTheme,
        EditorView.lineWrapping,
        placeholderConf.of(placeholderExt(placeholder)),
        editableConf.of(EditorView.editable.of(!disabled)),
        attrsConf.of(attrsExt(labelledBy, ariaLabel)),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) value = u.state.doc.toString();
        }),
      ],
    }),
  });
});

// Mirror a disabled <textarea>: actually toggle CM editability (the CSS
// pointer-events guard alone wouldn't block keyboard input on a focused
// editor). Blur on disable so a focused editor releases the caret.
$effect(() => {
  if (!view) return;
  view.dispatch({ effects: editableConf.reconfigure(EditorView.editable.of(!disabled)) });
  if (disabled && view.hasFocus) view.contentDOM.blur();
});

// Keep the (translatable) placeholder and label attributes live when the
// props change — e.g. an in-place language switch.
$effect(() => {
  view?.dispatch({ effects: placeholderConf.reconfigure(placeholderExt(placeholder)) });
});
$effect(() => {
  view?.dispatch({ effects: attrsConf.reconfigure(attrsExt(labelledBy, ariaLabel)) });
});
$effect(() => {
  view?.dispatch({ effects: mentionsConf.reconfigure(mentionExtension()) });
});

// Reconcile external value changes (e.g. switching edit target) without
// clobbering the cursor or looping back through the update listener.
$effect(() => {
  if (view && value !== view.state.doc.toString()) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      // An external swap isn't the user's edit — keep it out of undo history
      // so Ctrl-Z doesn't jump back to the previous document's content.
      annotations: Transaction.addToHistory.of(false),
    });
  }
});

onDestroy(() => view?.destroy());
</script>

<div
  bind:this={host}
  class="fb-md-editor atomic-cm-editor"
  class:fb-md-editor--disabled={disabled}
></div>

<style>
/* Design-system palette for the vendored engine. All colors flow through
 * the engine's `--atomic-editor-*` variables; set them on the host and they
 * inherit into the CodeMirror DOM. :global because the CM nodes are created
 * at runtime, outside this component's scoped markup. */
:global(.fb-md-editor) {
  --atomic-editor-font: var(--font-body);
  --atomic-editor-font-mono: ui-monospace, "SF Mono", Menlo, monospace;
  --atomic-editor-body-size: 0.875rem;
  --atomic-editor-body-leading: 1.7;
  --atomic-editor-measure: 100%;

  --atomic-editor-fg: #374151;
  --atomic-editor-fg-muted: #6b7280;
  --atomic-editor-fg-faint: #9ca3af;
  --atomic-editor-bg: #ffffff;
  --atomic-editor-bg-surface: #f9fafb;
  --atomic-editor-bg-panel: #f3f4f6;
  --atomic-editor-border: #d1d5db;
  --atomic-editor-code-bg: #f3f4f6;

  --atomic-editor-accent: #2d5016;
  --atomic-editor-accent-bright: #2d5016;
  --atomic-editor-accent-soft: #8b9d83;
  --atomic-editor-link: #2d5016;
  --atomic-editor-link-hover: #3a6b1e;
  --atomic-editor-selection-bg: color-mix(in srgb, #2d5016 16%, transparent);
  --atomic-editor-initial-reveal-bg: color-mix(in srgb, #2d5016 14%, transparent);
  --atomic-editor-initial-reveal-bg-strong: color-mix(in srgb, #2d5016 22%, transparent);

  /* Code-block highlight palette tuned for a light background
   * (GitHub-light, from the engine's own light theme). */
  --atomic-editor-hl-keyword: #cf222e;
  --atomic-editor-hl-string: #0a3069;
  --atomic-editor-hl-number: #0550ae;
  --atomic-editor-hl-comment: #6e7781;
  --atomic-editor-hl-type: #953800;
  --atomic-editor-hl-function: #8250df;
  --atomic-editor-hl-property: #0550ae;
  --atomic-editor-hl-regexp: #116329;
  --atomic-editor-hl-escape: #0550ae;
  --atomic-editor-hl-tag: #116329;
  --atomic-editor-hl-variable: #24292f;
  --atomic-editor-hl-operator: #cf222e;
  --atomic-editor-hl-invalid: #82071e;

  /* Match the surrounding form fields: bordered, rounded, forest focus ring. */
  display: block;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: #ffffff;
  overflow: hidden;
}

:global(.fb-md-editor:focus-within) {
  border-color: transparent;
  box-shadow: 0 0 0 2px #2d5016;
}

/* Editing is blocked via EditorView.editable(false); we only dim here.
 * No `pointer-events: none` — a disabled textarea still scrolls and allows
 * selection/copy, so long notes stay readable during submit. */
:global(.fb-md-editor--disabled) {
  opacity: 0.5;
}

/* Brand heading font on rendered heading lines, matching the detail view. */
:global(.fb-md-editor .cm-atomic-h1),
:global(.fb-md-editor .cm-atomic-h2),
:global(.fb-md-editor .cm-atomic-h3),
:global(.fb-md-editor .cm-atomic-h4) {
  font-family: var(--font-heading);
}

/* FB: the vendored heading scale (1.35 / 1.2 / 1.1 / 1.0em) is tuned for a
 * larger editor body size. With our 0.875rem body plus the brand heading
 * font's smaller apparent size, those steps barely clear the body text, so
 * the hierarchy reads flat (h4 even matches the body exactly). Bump each
 * step so headings stay clearly readable above the body. Values stay in em,
 * so they scale with --atomic-editor-body-size and the vendored per-heading
 * line-heights track along; the size is class-based (not cursor-based), so
 * the active/inactive no-layout-shift invariant is preserved. */
:global(.fb-md-editor .cm-atomic-h1) {
  font-size: 1.9em;
}
:global(.fb-md-editor .cm-atomic-h2) {
  font-size: 1.55em;
}
:global(.fb-md-editor .cm-atomic-h3) {
  font-size: 1.3em;
}
:global(.fb-md-editor .cm-atomic-h4) {
  font-size: 1.15em;
}
</style>
