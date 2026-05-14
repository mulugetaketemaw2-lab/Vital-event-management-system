import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation files will be loaded from these objects
// In a real-world scenario, you might want to use i18next-http-backend 
// to load them from separate JSON files in the public folder.
import translationEN from './locales/en/translation.json';
import translationAM from './locales/am/translation.json';
import translationOM from './locales/om/translation.json';
import translationTI from './locales/ti/translation.json';

const resources = {
    en: {
        translation: translationEN
    },
    am: {
        translation: translationAM
    },
    om: {
        translation: translationOM
    },
    ti: {
        translation: translationTI
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        }
    });

export default i18n;
