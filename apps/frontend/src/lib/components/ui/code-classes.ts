export const CODE_CLASSES = {
  block: 'bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono overflow-x-auto',
  /** The same block where the content itself is the point (a password to read out). */
  blockLg: 'bg-gray-50 border border-gray-200 rounded-lg p-4 text-lg font-mono overflow-x-auto',
  inline: 'bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono text-sm',
  kbd: 'px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-600',
  /** The same key cap for a destructive chord (the "clear filters" x). */
  kbdDanger: 'px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-xs font-mono text-red-600',
} as const;
