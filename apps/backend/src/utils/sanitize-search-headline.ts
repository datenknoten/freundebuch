/**
 * Escapes all HTML from PostgreSQL's ts_headline output except the <mark> tags
 * it wraps around matches. Prevents stored XSS through friend fields
 * (display_name, organization, work_notes) rendered as HTML.
 */
export function sanitizeSearchHeadline(headline: string | null | undefined) {
  if (headline === null || headline === undefined || headline === '') {
    return '';
  }

  // A random placeholder generated at runtime cannot be predicted and planted in user input.
  const uniqueId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const MARK_OPEN_PLACEHOLDER = `__MARK_OPEN_${uniqueId}__`;
  const MARK_CLOSE_PLACEHOLDER = `__MARK_CLOSE_${uniqueId}__`;

  // Only exact <mark> and </mark> tags (case-insensitive) survive.
  let sanitized = headline
    .replace(/<mark>/gi, MARK_OPEN_PLACEHOLDER)
    .replace(/<\/mark>/gi, MARK_CLOSE_PLACEHOLDER);

  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  sanitized = sanitized
    .replace(new RegExp(MARK_OPEN_PLACEHOLDER, 'g'), '<mark>')
    .replace(new RegExp(MARK_CLOSE_PLACEHOLDER, 'g'), '</mark>');

  return sanitized;
}
