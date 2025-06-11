import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useState, useCallback } from 'react';

// Define a type for your translations
type Translations = Record<string, string>;

export const useTranslations = () => {
  const { locale } = useLanguage();
  const [translations, setTranslations] = useState<Translations>({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const langModule = await import(`@/locales/${locale}.json`);
        setTranslations(langModule.default || langModule);
      } catch (error) {
        console.error(`Could not load translations for locale: ${locale}`, error);
        // Fallback to the other primary language if current locale fails
        const fallbackLocale = locale === 'en' ? 'zh' : 'en';
        try {
          console.warn(`Attempting to load fallback translations for locale: ${fallbackLocale}`);
          const fallbackModule = await import(`@/locales/${fallbackLocale}.json`);
          setTranslations(fallbackModule.default || fallbackModule);
        } catch (fallbackError) {
          console.error(`Could not load fallback translations for ${fallbackLocale}`, fallbackError);
          // Final fallback to an empty object if both primary and secondary fallbacks fail
          setTranslations({});
        }
      }
    };

    loadTranslations();
  }, [locale]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let translation = translations[key] || key;

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        translation = translation.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }

    return translation;
  }, [translations]);

  return { t, locale };
};
