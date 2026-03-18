import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import en from './en.json';

void i18n.use(initReactI18next).init({
  resources: {
    ar: { common: ar },
    en: { common: en },
  },
  lng: 'ar',
  fallbackLng: 'ar',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;

