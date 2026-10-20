// Stand-in for `$lib/i18n/i18n.js` via `vi.mock('$lib/i18n/i18n.js', () => import('$lib/test/i18n-key-mock.js'))`:
// `t` returns the key, so rendered labels are stable.
interface KeyTranslator {
  t: (key: string) => string;
}

function translateToKey(key: string) {
  return key;
}

function unsubscribe() {
  return undefined;
}

function subscribe(run: (value: KeyTranslator) => void) {
  run({ t: translateToKey });
  return unsubscribe;
}

export function createI18n() {
  return { subscribe };
}
