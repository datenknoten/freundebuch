import { markdownToPlainText } from '$lib/editor/plain-text';

const EXCERPT_LENGTH = 60;

/**
 * One-line plain-text preview of a note's markdown content, for the
 * supersede picker and the delete dialog.
 */
export function noteExcerpt(content: string) {
  const text = markdownToPlainText(content);
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text;
}
