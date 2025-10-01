// utils/pdfGenerator.ts

import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
// @ts-ignore: react-native-html-to-pdf package has no TypeScript definitions
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Toast from "react-native-toast-message";
import { encode } from "js-base64"; // YENİ EKLEDİĞİMİZ KÜTÜPHANE
import { useOnboardingStore } from "../store/onboardingStore";
import { Colors } from "../constants/Colors";

// === OTOMASYON MOTORU BAŞLIYOR ===

// 1. İkonları bir kere çekip burada saklayacağız (Önbellek).
const iconCache: Record<string, string> = {};
const IONICONS_VERSION = "7.1.0"; // Kullandığın ionicons sürümünü buraya yazabilirsin.

// Test amaçlı cache'i temizleme fonksiyonu
export const __clearIconCache = () => {
  Object.keys(iconCache).forEach((key) => delete iconCache[key]);
};

// 2. İkon adını alıp, onu CDN'den çeken ve Base64'e çeviren fonksiyon.
async function getIconDataUri(iconName: string): Promise<string> {
  // Önbellekte varsa, anında geri döndür.
  if (iconCache[iconName]) {
    return iconCache[iconName];
  }

  // CDN'den SVG'nin ham metnini çek.
  const url =
    `https://unpkg.com/ionicons@${IONICONS_VERSION}/dist/svg/${iconName}.svg`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`İkon sunucudan çekilemedi: ${response.statusText}`);
  }

  const svgText = await response.text();

  // Ham metni Base64'e çevir ve data URI formatına sok.
  const dataUri = `data:image/svg+xml;base64,${encode(svgText)}`;

  // Gelecekteki kullanımlar için önbelleğe kaydet.
  iconCache[iconName] = dataUri;

  return dataUri;
}

// ===================================

type InsightData = ReturnType<
  typeof useOnboardingStore.getState
>["onboardingInsight"];

// HTML şablonu artık ikonları bir map olarak alacak.
const buildAppQualityHtml = (
  insight: InsightData,
  nickname: string,
  icons: Record<string, string>,
): string => {
  if (!insight) return "<h1>Analiz verisi bulunamadı.</h1>";

  const brandTint = Colors.light.tint;
  const brandText = "#111827";
  const softText = Colors.light.softText;
  const cardBg = Colors.light.card;
  const pageBg = "#F7FAFF";

  const sections = [
    { key: "pattern", title: "Düşünce Kalıbın", iconName: "bulb-outline" },
    { key: "reframe", title: "Yeniden Çerçeve", iconName: "key-outline" },
    {
      key: "potential",
      title: "Gizli Potansiyelin",
      iconName: "sparkles-outline",
    },
    { key: "first_step", title: "İlk Adımın", iconName: "rocket-outline" },
    { key: "micro_habit", title: "Mikro Alışkanlık", iconName: "leaf-outline" },
    {
      key: "success_metric",
      title: "Başarı Ölçütü",
      iconName: "trophy-outline",
    },
    {
      key: "roadblock",
      title: "Engelin",
      iconName: "close-circle-outline",
    },
    {
      key: "support_system",
      title: "Destek Sistemin",
      iconName: "people-outline",
    },
    {
      key: "affirmation",
      title: "Olumlama",
      iconName: "shield-checkmark-outline",
    },
    { key: "plan_7d", title: "7 Günlük Plan", iconName: "calendar-outline" },
  ];

  const createSectionCards = () => {
    return sections
      .map((section) => {
        const text = insight[section.key as keyof InsightData];
        const iconUri = icons[section.iconName];
        if (text && iconUri) {
          return `
            <div class="card">
              <div class="card-header">
                <div class="icon-container">
                  <img src="${iconUri}" class="icon" />
                </div>
                <h2 class="card-title">${section.title}</h2>
              </div>
              <p class="card-text">${text}</p>
            </div>
          `;
        }
        return "";
      })
      .join("");
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Kişisel Raporun</title>
        <style>
          /* CSS stilleri bir önceki cevaptakiyle aynı, değişiklik yok */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          body { margin: 0; font-family: 'Inter', sans-serif; background-color: ${pageBg}; color: ${brandText}; -webkit-font-smoothing: antialiased; }
          .page { padding: 40px 25px; }
          .cover { background: linear-gradient(135deg, #E0ECFD, #F4E6FF); border-radius: 24px; padding: 30px; border: 1px solid rgba(0,0,0,0.05); }
          .brand-name { font-weight: 700; font-size: 24px; color: ${brandTint}; }
          .brand-name span { color: ${brandTint}; font-weight: 900; }
          .cover-title { font-size: 32px; font-weight: 700; margin: 12px 0 8px; }
          .cover-subtitle { font-size: 16px; color: ${softText}; margin: 0; line-height: 1.5; }
          .card { background-color: ${cardBg}; border-radius: 24px; padding: 20px; margin-top: 20px; border: 1px solid rgba(0,0,0,0.07); box-shadow: 0 4px 15px rgba(0,0,0,0.04); }
          .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
          .icon-container { width: 40px; height: 40px; border-radius: 20px; background: linear-gradient(135deg, #E0ECFD, #F4E6FF); display: flex; align-items-center; justify-content: center; flex-shrink: 0; }
          .icon { width: 22px; height: 22px; }
          .card-title { font-size: 16px; font-weight: 700; color: ${brandTint}; margin: 0; }
          .card-text { font-size: 16px; color: #4A5568; line-height: 1.6; margin: 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #909090; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="cover">
            <h1 class="brand-name">Gisbel<span>.</span></h1>
            <h2 class="cover-title">${nickname}, Kişisel İçgörülerin</h2>
            <p class="cover-subtitle">Bu rapor, verdiğin cevaplara özel olarak hazırlandı. Potansiyelini keşfetmek için ilk adımı attın.</p>
          </div>
          ${createSectionCards()}
          <p class="footer">Gisbel. ile otomatik oluşturuldu</p>
        </div>
      </body>
    </html>
  `;
};

// Ana fonksiyonu da bu yeni akışa göre güncelliyoruz.
export const generatePdf = async (insight: InsightData, nickname: string) => {
  Toast.show({
    type: "info",
    text1: "PDF Raporu Hazırlanıyor...",
    text2: "İkonlar indiriliyor, lütfen bekleyin.",
  });

  try {
    // 1. İhtiyacımız olan tüm ikonların listesini çıkar.
    const requiredIcons = [
      "bulb-outline",
      "key-outline",
      "sparkles-outline",
      "rocket-outline",
      "leaf-outline",
      "trophy-outline",
      "close-circle-outline",
      "people-outline",
      "shield-checkmark-outline",
      "calendar-outline",
    ];

    // 2. Hepsini aynı anda, paralel olarak çek.
    const iconPromises = requiredIcons.map((name) => getIconDataUri(name));
    const iconDataUris = await Promise.all(iconPromises);

    // 3. Gelen URI'leri, isimleriyle eşleşen bir haritaya dönüştür.
    const iconsMap: Record<string, string> = {};
    requiredIcons.forEach((name, index) => {
      iconsMap[name] = iconDataUris[index];
    });

    // 4. HTML'i, artık hazır olan ikon verisiyle birlikte oluştur.
    const htmlContent = buildAppQualityHtml(insight, nickname, iconsMap);

    const options = {
      html: htmlContent,
      fileName: `Gisbel_kisisel_rapor_${
        new Date().toISOString().split("T")[0]
      }`,
      directory: "Documents",
    };

    const file = await RNHTMLtoPDF.convert(options);

    if (file.filePath) {
      // Platform.OS'u doğrudan kullan ki dinamik mock çalışsın
      const fileUri = Platform.OS === "android"
        ? `file://${file.filePath}`
        : file.filePath;
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: "Raporunu Paylaş",
      });
    } else {
      throw new Error("PDF dosya yolu oluşturulamadı.");
    }
  } catch (e: unknown) {
    console.error("PDF oluşturma hatası:", e);
    const errorMessage = e instanceof Error
      ? e.message
      : "Bilinmeyen bir hata oluştu.";
    Toast.show({
      type: "error",
      text1: "PDF Oluşturulamadı",
      text2: errorMessage,
    });
  }
};
