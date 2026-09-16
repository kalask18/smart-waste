'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { en, TranslationKey } from './locales/en';
import { ta } from './locales/ta';

export type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isTamil: boolean;
  tLocation: (nameEn: string, nameTa?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'smartwaste_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem(LOCAL_STORAGE_KEY) as Language;
      if (savedLang === 'en' || savedLang === 'ta') {
        setLanguageState(savedLang);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleStorage = (e: StorageEvent) => {
        if (e.key === LOCAL_STORAGE_KEY && (e.newValue === 'en' || e.newValue === 'ta')) {
          setLanguageState(e.newValue as Language);
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, lang);
    }
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dictionary = language === 'ta' ? ta : en;
    let template = dictionary[key] || en[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }

    return template;
  };

  // Automated bilingual geography helper e.g. "Narasipuram / நரசீபுரம்" or location lookup
  const tLocation = (nameEn: string, nameTa?: string): string => {
    if (language === 'ta') {
      if (nameTa) return nameTa;
      // Common location translation map
      const locMap: Record<string, string> = {
        'Narasipuram': 'நரசீபுரம்',
        'Vellaimalaipattinam': 'வெள்ளைமலைப்பட்டினம்',
        'Ikkaraibooluvampatti': 'இக்கரைபூளுவபட்டி',
        'Ikkara': 'இக்கரை',
        'Devarayapuram': 'தேவராயபுரம்',
        'Alanthurai': 'ஆலாந்துறை',
        'Pooluvapatti': 'பூளுவபட்டி',
        'Thennamanallur': 'தென்னமநல்லூர்',
        'Thondamuthur': 'தொண்டாமுத்தூர்',
        'Coimbatore': 'கோயம்புத்தூர்',
      };

      let translated = nameEn;
      Object.entries(locMap).forEach(([enWord, taWord]) => {
        translated = translated.replace(new RegExp(enWord, 'gi'), taWord);
      });
      return translated;
    }
    return nameEn;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isTamil: language === 'ta',
        tLocation,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback for server components or missing provider
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: TranslationKey, params?: Record<string, string | number>) => {
        let template = en[key] || key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          });
        }
        return template;
      },
      isTamil: false,
      tLocation: (nameEn: string) => nameEn,
    };
  }
  return context;
}
