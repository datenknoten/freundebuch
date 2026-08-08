/**
 * Substitute the runtime's *default* locale for the duration of a callback.
 *
 * Components format dates with `toLocaleDateString(undefined, …)`, deferring to
 * whatever locale the runtime picked. Node resolves that from LANG/LC_ALL at
 * process start, so a test cannot change it from the inside — which is how an
 * assertion on "May" passes in CI and fails on a de_DE.UTF-8 machine, where the
 * same component renders "Mai".
 *
 * Only the default is substituted. An explicit locale argument still wins, and
 * the caller's option object is handed to the real Intl implementation, so the
 * component's own formatting is exercised rather than replaced.
 */
type LocaleMethod = 'toLocaleDateString' | 'toLocaleString' | 'toLocaleTimeString';

const LOCALE_METHODS: LocaleMethod[] = [
  'toLocaleDateString',
  'toLocaleString',
  'toLocaleTimeString',
];

export function withDefaultLocale<T>(locale: string, fn: () => T): T {
  const originals = LOCALE_METHODS.map((name) => [name, Date.prototype[name]] as const);

  for (const [name, original] of originals) {
    Date.prototype[name] = function (
      this: Date,
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ): string {
      return (
        original as (l?: Intl.LocalesArgument, o?: Intl.DateTimeFormatOptions) => string
      ).call(this, locales ?? locale, options);
    };
  }

  try {
    return fn();
  } finally {
    for (const [name, original] of originals) {
      Date.prototype[name] = original;
    }
  }
}
