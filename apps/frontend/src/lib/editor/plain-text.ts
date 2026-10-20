import MarkdownIt from 'markdown-it';

// Same parser options as MarkdownView.svelte, so that the plain text matches
// what the reader sees: raw HTML stays text, and image markers stay inert.
const md = new MarkdownIt({ html: false, linkify: true });
md.disable('image');

/**
 * Reduce markdown to its visible text on one line, for places that cannot
 * render markdown: select options, dialog labels, truncated previews.
 *
 * Markup is dropped and only the text that a reader sees remains, so an
 * `@`-mention `[Anna](/friends/…)` becomes `Anna`. Blocks and line breaks
 * collapse into single spaces.
 */
export function markdownToPlainText(source: string): string {
  const parts: string[] = [];
  for (const token of md.parse(source, {})) {
    if (token.type === 'inline' && token.children !== null) {
      for (const child of token.children) {
        if (child.type === 'text' || child.type === 'code_inline') {
          parts.push(child.content);
        } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
          parts.push(' ');
        }
      }
      parts.push(' ');
    } else if (token.type === 'fence' || token.type === 'code_block') {
      parts.push(token.content, ' ');
    }
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}
