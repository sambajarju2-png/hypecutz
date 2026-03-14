import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import nl from "./locales/nl.json";

i18n.use(initReactI18next).init({
  resources: {
    nl: { translation: nl },
  },
  lng: "nl",
  fallbackLng: "nl",
  interpolation: {
    escapeValue: false, // React already handles XSS
  },
});

export default i18n;
