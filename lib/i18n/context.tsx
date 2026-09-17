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
        'Main Road': 'முதன்மை சாலை',
        'Dumpster': 'கழிவு தொட்டி',
        'Clinic Gate': 'மருத்துவமனை வாயில்',
        'Clinic': 'மருத்துவமனை',
        'Gate': 'வாயில்',
        'Govt Higher Sec School': 'அரசு மேல்நிலைப் பள்ளி',
        'School': 'பள்ளி',
        'Bus Stop Area': 'பேருந்து நிறுத்தம் பகுதி',
        'Bus Stop': 'பேருந்து நிறுத்தம்',
        'Roadside Spot': 'சாலையோர இடம்',
        'Roadside': 'சாலையோரம்',
        'Weekly Market': 'வாராந்திர சந்தை',
        'Market Yard': 'சந்தை விளாகம்',
        'Market': 'சந்தை',
        'Panchayat': 'பஞ்சாயத்து',
        'Residential Area': 'குடியிருப்பு பகுதி',
        'Residential': 'குடியிருப்பு',
        'Commercial': 'வணிக',
        'Report Location': 'புகார் இடம்',
        'Citizen Waste Report': 'பொதுமக்கள் கழிவு புகார்',
        'Reported Incident': 'பதிவுசெய்த சம்பவம்',
        'Foothills': 'அடிவாரம்',
        'Primary Health Centre': 'முதன்மை சுகாதார நிலையம்',
        'overflowing_bin': 'நிரம்பி வழியும் தொட்டி',
        'hazardous': 'ஆபத்தான கழிவு',
        'plastic': 'பிளாஸ்டிக் கழிவு',
        'recyclable': 'மறுசுழற்சி கழிவு',
        'organic': 'மக்கும் கழிவு',
        'general': 'பொதுக் கழிவு',
        'construction': 'கட்டிடக் கழிவு',
        'Stop': 'நிறுத்தம்',
        'Collect earlier in the next route cycle to prevent public overflow.': 'பொதுமக்களுக்கு கழிவு வழிவதைத் தடுக்க அடுத்த சேகரிப்பு சுழற்சியில் முன்கூட்டியே சேகரிக்கவும்.',
        'Prioritize in afternoon collection queue before peak accumulation.': 'அதிகரிக்கும் முன் பிற்பகல் சேகரிப்பு வரிசையில் முன்னுரிமை அளிக்கவும்.',
        'Include in upcoming scheduled pickup shift.': 'வரவிருக்கும் திட்டமிடப்பட்ட சேகரிப்புப் பணியில் சேர்க்கவும்.',
        'Monitor telemetry during standard dispatch shift.': 'நிலையான அனுப்பல் பணியின் போது தொலைநிலைப் பதிவுகளைக் கண்காணிக்கவும்.',
        'critical fill level': 'முக்கிய நிரப்பு நிலை',
        'high fill level': 'அதிக நிரப்பு நிலை',
        'recent citizen reports': 'சமீபத்திய பொதுமக்கள் புகார்கள்',
        'extended time since last pickup': 'கடைசி சேகரிப்பிற்குப் பிறகு நீண்ட நேரம்',
        'high-footfall public location': 'அதிக மக்கள் நடமாட்டம் உள்ள இடம்',
        'indicate high probability of overflow.': 'கழிவு வழிவதற்கான அதிக சாத்தியத்தைக் காட்டுகின்றன.',
        'Normal waste accumulation pattern.': 'இயல்பான கழிவு குவிதல் முறை.',
        'Telemetry data evaluated under standard operational baseline.': 'தொலைநிலைப் பதிவுத் தரவு தரமான செயல்பாட்டு அடிப்படையில் மதிப்பிடப்பட்டது.',
        'Just now': 'இப்போதுதான்',
        'Ramesh Patel': 'ரமேஷ் படேல்',
      };

      let translated = nameEn || '';
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
