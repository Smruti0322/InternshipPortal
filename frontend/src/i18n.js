import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import hi from "./locales/hi.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";
import fr from "./locales/fr.json";

/*
=========================================================
SUPPORTED LANGUAGES
=========================================================
Only these languages are allowed in the application.
*/

const supportedLanguages = [
    "en",
    "es",
    "hi",
    "pt",
    "zh",
    "fr"
];

/*
=========================================================
GET SAVED LANGUAGE
=========================================================
Get language from browser localStorage.

If the saved language is invalid or unsupported,
English will be used as the default language.
*/

const savedLanguage =
    localStorage.getItem("language");

const initialLanguage =
    supportedLanguages.includes(savedLanguage)
        ? savedLanguage
        : "en";

/*
=========================================================
INITIALIZE i18next
=========================================================
*/

i18n
    .use(initReactI18next)
    .init({

        resources: {

            en: {
                translation: en
            },

            es: {
                translation: es
            },

            hi: {
                translation: hi
            },

            pt: {
                translation: pt
            },

            zh: {
                translation: zh
            },

            fr: {
                translation: fr
            }

        },

        // Apply saved browser language
        lng: initialLanguage,

        // English will be used if a translation is missing
        fallbackLng: "en",

        interpolation: {
            escapeValue: false
        }

    });

export default i18n;