export function jsonResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

export function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}
