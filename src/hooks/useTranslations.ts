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
        // Fallback to Chinese if current locale fails
        try {
          const fallbackModule = await import('@/locales/zh.json');
          setTranslations(fallbackModule.default || fallbackModule);
        } catch (fallbackError) {
          console.error('Could not load fallback translations', fallbackError);
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
