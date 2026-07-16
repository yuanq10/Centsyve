import { create } from 'zustand';
import { i18n } from '../i18n';
import { getDb } from '../db/database';

interface LocaleStore {
  locale: string;
  setLocale: (locale: string) => void;
}

export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: i18n.locale,
  setLocale: (locale) => {
    i18n.locale = locale;
    set({ locale });
    try {
      getDb().runSync(
        'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
        ['locale', locale]
      );
    } catch {}
  },
}));
