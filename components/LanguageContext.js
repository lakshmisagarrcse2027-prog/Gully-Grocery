"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { languages, translations, getTranslation, categoryMap, tProductName as translateName, tProductUnit as translateUnit } from "../lib/i18n";

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  tCategory: (cat) => cat,
  tProductName: (name) => name,
  tProductUnit: (unit) => unit,
  languages,
  currentLanguage: languages[0]
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("smartgrocer_lang");
    if (saved && translations[saved]) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang) => {
    if (translations[newLang]) {
      setLangState(newLang);
      localStorage.setItem("smartgrocer_lang", newLang);
    }
  };

  const t = (key) => getTranslation(lang, key);

  const tCategory = (catName) => {
    const key = categoryMap[catName];
    if (key) {
      return getTranslation(lang, key);
    }
    return catName;
  };

  const tProductName = (name) => translateName(name, lang);
  const tProductUnit = (unit) => translateUnit(unit, lang);

  const currentLanguage = languages.find((l) => l.code === lang) || languages[0];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tCategory, tProductName, tProductUnit, languages, currentLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
