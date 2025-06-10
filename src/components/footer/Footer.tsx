"use client";
import { useTranslations } from '@/hooks/useTranslations';

const Footer = () => {

  const { t } = useTranslations();

  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm mb-4 md:mb-0">
            {t('footerCopyright', { year: new Date().getFullYear() })}
          </div>
          
        </div>
      </div>
    </footer>
  );
};

export default Footer;
