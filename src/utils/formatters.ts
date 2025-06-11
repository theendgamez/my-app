import { Locale } from 'date-fns'; // Import Locale type
import { format as formatDateFns } from 'date-fns';
import { enUS, zhHK } from 'date-fns/locale'; // Import specific locales

const locales: Record<string, Locale> = {
  en: enUS,
  zh: zhHK,
};

/**
 * Formats a date string or timestamp into a localized string.
 * @param dateInput The date string, timestamp number, or Date object.
 * @param locale The locale string (e.g., 'en-US', 'zh-HK'). Defaults to 'en-US'.
 * @param options Intl.DateTimeFormatOptions to customize the output.
 * @returns A localized date string, or the original input if formatting fails.
 */
export function formatDate(
  dateString: string | Date,
  formatStr: string = 'Pp', // Default format: 'Sep 18, 2023, 11:05 AM'
  options?: { locale?: string } & Intl.DateTimeFormatOptions // Allow passing Intl.DateTimeFormatOptions
): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const localeKey = options?.locale || 'en'; // Default to English if no specific locale is passed
    const dateFnsLocale = locales[localeKey] || enUS; // Fallback to enUS for date-fns

    if (options && Object.keys(options).length > 1 && !(Object.keys(options).length === 1 && options.hasOwnProperty('locale'))) { // If more than just locale is passed
        // Use Intl.DateTimeFormat for more complex options
        return new Intl.DateTimeFormat(localeKey, options).format(date);
    }
    
    // Use date-fns for simpler formatting or default
    return formatDateFns(date, formatStr, { locale: dateFnsLocale });
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(dateString); // Fallback to original string
  }
}

export function formatCurrency(
  amount: number,
  currency: string = 'HKD',
  locale: string = 'zh-HK' // Default to Hong Kong Chinese for currency
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return `${currency} ${amount.toFixed(2)}`; // Fallback
  }
}
