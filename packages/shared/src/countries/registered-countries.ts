import countries from 'i18n-iso-countries';
import de from 'i18n-iso-countries/langs/de.json' with { type: 'json' };
import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' };

// The browser entry registers no locales; the Node entry registers all. Register ours explicitly.
countries.registerLocale(en);
countries.registerLocale(de);

export { countries };
