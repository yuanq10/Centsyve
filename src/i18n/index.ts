import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from '../locales/en.json';
import zh from '../locales/zh.json';

const i18n = new I18n({ en, zh });

const ENABLED_LOCALES = ['en', 'zh'];

const deviceLocale = Localization.getLocales()?.[0]?.languageCode ?? 'en';
i18n.locale = ENABLED_LOCALES.includes(deviceLocale) ? deviceLocale : 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export function t(scope: string, options?: Record<string, unknown>): string {
  return i18n.t(scope, options);
}

export function setLocale(locale: string): void {
  if (ENABLED_LOCALES.includes(locale)) {
    i18n.locale = locale;
  }
}

export function getCurrentLocale(): string {
  return i18n.locale;
}

export { i18n };
