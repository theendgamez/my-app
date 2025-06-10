"use client";

import AdminPage from '@/components/admin/AdminPage';
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations

export default function AdminSettingsPage() {
  const { t } = useTranslations(); // Initialize useTranslations

  return (
    <AdminPage title={t('systemSettings')} isLoading={false}>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">{t('featureInProgress')}</h2>
        <p className="text-gray-600">{t('comingSoon')}</p>
      </div>
    </AdminPage>
  );
}
