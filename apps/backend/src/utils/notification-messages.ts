import type { IGetUpcomingDatesResult } from '../models/queries/friend-dates.queries.js';

interface LocaleStrings {
  header: string;
  today: string;
  tomorrow: string;
  inDays: (n: number) => string;
  birthday: string;
  anniversary: string;
  footer: (url: string) => string;
  months: string[];
  formatDate: (month: number, day: number) => string;
}

const locales: Record<string, LocaleStrings> = {
  en: {
    header: 'Freundebuch - Upcoming dates',
    today: 'Today',
    tomorrow: 'Tomorrow',
    inDays: (n) => `In ${n} days`,
    birthday: 'birthday',
    anniversary: 'wedding anniversary',
    footer: (url) => `View your Freundebuch: ${url}`,
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    formatDate: function (month, day) {
      return `${this.months[month - 1]} ${day}`;
    },
  },
  de: {
    header: 'Freundebuch - Bevorstehende Termine',
    today: 'Heute',
    tomorrow: 'Morgen',
    inDays: (n) => `In ${n} Tagen`,
    birthday: 'Geburtstag',
    anniversary: 'Hochzeitstag',
    footer: (url) => `Dein Freundebuch öffnen: ${url}`,
    months: [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ],
    formatDate: function (month, day) {
      return `${day}. ${this.months[month - 1]}`;
    },
  },
};

function getLocale(lang: string): LocaleStrings {
  return locales[lang] ?? locales.en;
}

function getDayPhrase(l: LocaleStrings, daysUntil: number): string {
  if (daysUntil === 0) return l.today;
  if (daysUntil === 1) return l.tomorrow;
  return l.inDays(daysUntil);
}

function getEventLabel(l: LocaleStrings, dateType: string, label: string | null): string {
  if (dateType === 'birthday') return l.birthday;
  if (dateType === 'anniversary') return l.anniversary;
  return label ?? dateType;
}

function extractMonthDay(dateValue: Date): { month: number; day: number } {
  // date_value is a DATE type, extract month and day
  const month = dateValue.getMonth() + 1;
  const day = dateValue.getDate();
  return { month, day };
}

/**
 * Format upcoming dates into a notification message
 * Returns both plain text and HTML versions
 */
export function formatNotificationMessage(
  dates: IGetUpcomingDatesResult[],
  locale: string,
  instanceUrl?: string,
): { plain: string; html: string } {
  const l = getLocale(locale);

  const plainLines: string[] = [l.header, ''];
  const htmlLines: string[] = [`<b>${l.header}</b>`, ''];

  for (const date of dates) {
    const daysUntil = date.days_until ?? 0;
    const dayPhrase = getDayPhrase(l, daysUntil);
    const eventLabel = getEventLabel(l, date.date_type, date.label);
    const { month, day } = extractMonthDay(date.date_value);
    const formattedDate = l.formatDate(month, day);

    const plainLine = `${dayPhrase}: ${date.friend_display_name}'s ${eventLabel} (${formattedDate})`;
    const htmlLine = `${dayPhrase}: <b>${date.friend_display_name}</b>'s ${eventLabel} (${formattedDate})`;

    plainLines.push(plainLine);
    htmlLines.push(htmlLine);
  }

  if (instanceUrl) {
    plainLines.push('', l.footer(instanceUrl));
    htmlLines.push('', `<a href="${instanceUrl}">${l.footer(instanceUrl)}</a>`);
  }

  return {
    plain: plainLines.join('\n'),
    html: htmlLines.join('<br>'),
  };
}
