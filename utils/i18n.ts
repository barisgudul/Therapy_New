// utils/i18n.ts - GÜNCELLENMİŞ VE KALICI VERSİYON

import i18n, {
    changeLanguage as i18nChangeLanguage,
    init,
    use as i18nUse,
} from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Bu dosya, uygulamanın çoklu dil desteğini yönetir.
// AsyncStorage kullanarak kullanıcının dil seçimini hatırlar.

const ASYNC_STORAGE_KEY = "user-language";

export const SUPPORTED_LANGUAGES = ["tr", "en", "de"];
export const DEFAULT_LANGUAGE = "en";

// Çeviri dosyalarımızı buraya yüklüyoruz.
const resources = {
    tr: { translation: require("../locales/tr.json") },
    en: { translation: require("../locales/en.json") },
    de: { translation: require("../locales/de.json") },
};

// Bu fonksiyon, kullanıcının dilini değiştirmek için kullanılacak.
// Hem uygulamanın dilini değiştirir hem de bu seçimi cihaza kaydeder.
i18nUse(initReactI18next);
init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
        escapeValue: false,
        // React i18next'in default interpolation'ını kullan
        format: function (value, format, _lng) {
            if (format === "uppercase") return value.toUpperCase();
            return value;
        },
    },
    saveMissing: __DEV__,
    missingKeyHandler: (lng, _ns, key) => {
        console.warn(`[i18n] Eksik anahtar: "${key}" | Dil: "${lng}"`);
    },
});

// Bu bölüm, uygulama ilk açıldığında çalışır ve doğru dili ayarlar.
const initializeLanguage = async () => {
    let selectedLanguage: string | null = null;
    try {
        // 1. Önce cihazda kayıtlı bir dil var mı diye kontrol et.
        selectedLanguage = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    } catch (error) {
        console.error("[i18n] Kayıtlı dil okunamadı:", error);
    }

    if (selectedLanguage && SUPPORTED_LANGUAGES.includes(selectedLanguage)) {
        // 2. Varsa, onu kullan.
        i18nChangeLanguage(selectedLanguage);
    } else {
        // 3. Yoksa, telefonun sistem dilini kullan.
        const deviceLocale = Localization.getLocales()?.[0]?.languageCode
            ?.toLowerCase();
        if (deviceLocale && SUPPORTED_LANGUAGES.includes(deviceLocale)) {
            i18nChangeLanguage(deviceLocale);
        } else {
            // O da desteklenmiyorsa, varsayılan dili (İngilizce) kullan.
            i18nChangeLanguage(DEFAULT_LANGUAGE);
        }
    }
};

// Uygulama başlarken dil ayarını yap.
initializeLanguage();

// Bu fonksiyon, kullanıcının dilini değiştirmek için kullanılacak.
// Hem uygulamanın dilini değiştirir hem de bu seçimi cihaza kaydeder.
export const changeLanguage = async (lng: string) => {
    if (!SUPPORTED_LANGUAGES.includes(lng)) {
        console.warn(`[i18n] Desteklenmeyen dil seçimi denendi: ${lng}`);
        return;
    }

    // 1. i18next'in aktif dilini değiştir.
    await i18nChangeLanguage(lng);

    // 2. Kullanıcının seçimini AsyncStorage'a kaydet ki uygulama tekrar açıldığında hatırlansın.
    try {
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, lng);
    } catch (error) {
        console.error("[i18n] Dil seçimi kaydedilemedi:", error);
    }
};

export default i18n;
