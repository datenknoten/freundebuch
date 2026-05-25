<script lang="ts" module>
import DOMPurify from 'isomorphic-dompurify';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
// No images: a note rendering `![](https://tracker/x.png)` would fire an
// external request on view, leaking the reader's IP. Disable at the parser
// (markers render as inert text) and forbid <img> at sanitize time.
md.disable('image');

// Harden every rendered link at render time (this markdown-it instance is
// module-local, so this is scoped to encounter notes — unlike a global
// DOMPurify.addHook, which would mutate every sanitize() call in the app).
// Covers both `[text](url)` links and linkified bare URLs.
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer nofollow');
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function renderMarkdown(source: string): string {
  // html:false already neutralizes raw HTML; DOMPurify is the belt to that
  // suspenders, and the only thing standing between note text and the DOM.
  // FORBID_TAGS img backstops the parser-level image disable above;
  // ADD_ATTR keeps the target/rel that markdown-it added on links.
  return DOMPurify.sanitize(md.render(source ?? ''), {
    FORBID_TAGS: ['img'],
    ADD_ATTR: ['target', 'rel'],
  });
}
</script>

<script lang="ts">
interface Props {
  /** Raw markdown to render read-only. */
  source?: string;
}

let { source = '' }: Props = $props();

let html = $derived(renderMarkdown(source));
</script>

<div class="fb-md-view">
  <!-- html is sanitized in renderMarkdown (markdown-it html:false + DOMPurify). -->
  {@html html}
</div>

<style>
/* Tailwind's preflight strips default element styling, so the rendered
 * markdown needs its own typography. Tokens match the rest of the app
 * (Merriweather body, Yanone headings, forest links). :global because the
 * markup arrives via {@html}. */
.fb-md-view {
  font-family: var(--font-body);
  color: #374151;
  line-height: 1.7;
}
.fb-md-view :global(h1),
.fb-md-view :global(h2),
.fb-md-view :global(h3),
.fb-md-view :global(h4),
.fb-md-view :global(h5),
.fb-md-view :global(h6) {
  font-family: var(--font-heading);
  color: #111827;
  font-weight: 700;
  line-height: 1.3;
  margin: 0.75em 0 0.4em;
}
.fb-md-view :global(h1) { font-size: 1.5em; }
.fb-md-view :global(h2) { font-size: 1.3em; }
.fb-md-view :global(h3) { font-size: 1.15em; }
.fb-md-view :global(h4) { font-size: 1em; }
.fb-md-view :global(p) { margin: 0.5em 0; }
.fb-md-view :global(:first-child) { margin-top: 0; }
.fb-md-view :global(:last-child) { margin-bottom: 0; }
.fb-md-view :global(a) {
  color: #2d5016;
  text-decoration: underline;
  overflow-wrap: anywhere;
}
.fb-md-view :global(a:hover) { color: #3a6b1e; }
.fb-md-view :global(strong) { font-weight: 700; }
.fb-md-view :global(em) { font-style: italic; }
.fb-md-view :global(ul),
.fb-md-view :global(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.fb-md-view :global(ul) { list-style: disc; }
.fb-md-view :global(ol) { list-style: decimal; }
.fb-md-view :global(li) { margin: 0.2em 0; }
.fb-md-view :global(blockquote) {
  margin: 0.5em 0;
  padding-left: 0.75em;
  border-left: 3px solid #8b9d83;
  color: #6b7280;
}
.fb-md-view :global(code) {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.875em;
  background: #f3f4f6;
  padding: 0.1em 0.3em;
  border-radius: 0.25rem;
}
.fb-md-view :global(pre) {
  background: #f3f4f6;
  padding: 0.75em;
  border-radius: 0.5rem;
  overflow-x: auto;
}
.fb-md-view :global(pre code) {
  background: none;
  padding: 0;
}
.fb-md-view :global(hr) {
  border: none;
  border-top: 1px solid #d1d5db;
  margin: 1em 0;
}
</style>
