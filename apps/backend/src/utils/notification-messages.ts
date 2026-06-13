import type { IGetUpcomingDatesResult } from '../models/queries/friend-dates.queries.js';

interface LocaleStrings {
  header: string;
  today: string;
  tomorrow: string;
  inDays: (n: number) => string;
  birthday: string;
  anniversary: string;
  /** Age phrasing for a birthday, e.g. "turns 30" */
  birthdayAge: (n: number) => string;
  /** Year count for non-birthday dates, e.g. "30 years" */
  yearsCount: (n: number) => string;
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
    birthdayAge: (n) => `turns ${n}`,
    yearsCount: (n) => `${n} year${n === 1 ? '' : 's'}`,
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
    birthdayAge: (n) => `wird ${n}`,
    yearsCount: (n) => `${n} Jahr${n === 1 ? '' : 'e'}`,
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

function extractMonthDay(date: Date): { month: number; day: number } {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return { month, day };
}

/**
 * Resolve the actual upcoming occurrence date by adding `daysUntil` (the value
 * the SQL query computed) to today. Using this for both the displayed date and
 * the age keeps the notification consistent with the query logic, including its
 * leap-year handling (e.g. a Feb 29 date is shown as Feb 28 in non-leap years).
 */
function getUpcomingOccurrence(daysUntil: number): Date {
  const now = new Date();
  // All-local date arithmetic, matching how date_value is read.
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil);
}

/**
 * Compute the age (or number of years) the date marks on its upcoming
 * occurrence. Returns null when the birth year is unknown or the resulting age
 * is not a positive number.
 */
function computeAge(dateValue: Date, yearKnown: boolean, occurrence: Date): number | null {
  if (!yearKnown) return null;

  const age = occurrence.getFullYear() - dateValue.getFullYear();

  return age > 0 ? age : null;
}

function getAgePhrase(l: LocaleStrings, dateType: string, age: number | null): string | null {
  if (age === null) return null;
  if (dateType === 'birthday') return l.birthdayAge(age);
  return l.yearsCount(age);
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
    const occurrence = getUpcomingOccurrence(daysUntil);
    const { month, day } = extractMonthDay(occurrence);
    const formattedDate = l.formatDate(month, day);

    const age = computeAge(date.date_value, date.year_known, occurrence);
    const agePhrase = getAgePhrase(l, date.date_type, age);
    const datePart = agePhrase ? `${formattedDate}, ${agePhrase}` : formattedDate;

    const plainLine = `${dayPhrase}: ${date.friend_display_name}'s ${eventLabel} (${datePart})`;
    const htmlLine = `${dayPhrase}: <b>${date.friend_display_name}</b>'s ${eventLabel} (${datePart})`;

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
