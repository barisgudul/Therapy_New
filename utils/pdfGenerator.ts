// utils/pdfGenerator.ts

import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
// @ts-ignore: react-native-html-to-pdf kütüphanesinin tip tanımları eksik
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Toast from "react-native-toast-message";
import { AnalysisReportContent } from "../types/analysis";
import { Colors } from "../constants/Colors";

// Bu fonksiyon artık component'in içinde değil, saf bir yardımcı fonksiyon.
const convertMarkdownToHTML = (markdown: string): string => {
    const withNormalizedBullets = markdown.replace(/\s*•\s+/g, "\n• ").trim();
    const html = withNormalizedBullets
        .replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/^• (.*$)/gim, "<li>$1</li>")
        .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
        .replace(/\n/g, "<br/>");
    return html;
};

const buildElegantHtml = (content: AnalysisReportContent): string => {
    const brandTint = Colors.light.tint;
    const brandText = Colors.light.text;
    const softText = Colors.light.softText;
    const cardBg = Colors.light.card;
    const pageBg = Colors.light.background;
    const accent = Colors.light.accent;

    const coverGradientStart = "#E0ECFD";
    const coverGradientEnd = "#F4E6FF";

    const overviewHTML = convertMarkdownToHTML(
        content.reportSections.overview || "",
    );
    const goldenThreadHTML = convertMarkdownToHTML(
        content.reportSections.goldenThread || "",
    );
    const blindSpotHTML = convertMarkdownToHTML(
        content.reportSections.blindSpot || "",
    );

    const readMinutes = content.derivedData?.readMinutes ?? 2;
    const headingsCount = content.derivedData?.headingsCount ?? 6;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${content.reportSections.mainTitle || "Kişisel Rapor"}</title>
          <style>
            :root { --brand-tint: ${brandTint}; --brand-text: ${brandText}; --soft-text: ${softText}; --card-bg: ${cardBg}; --page-bg: ${pageBg}; --accent: ${accent}; }
            * { box-sizing: border-box; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
            body { margin: 0; background: var(--page-bg); color: var(--brand-text); font: 400 14px "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; letter-spacing: 0.1px; line-height: 1.6; }
            .page { padding: 28px 28px 32px; }
            .cover { background: linear-gradient(135deg, ${coverGradientStart}, ${coverGradientEnd}); border-radius: 28px; padding: 28px 24px; position: relative; overflow: hidden; border: 1px solid rgba(93, 161, 217, 0.20); }
            .brand { display: flex; align-items: baseline; gap: 6px; font-weight: 800; letter-spacing: -0.3px; color: var(--brand-text); font-size: 18px; }
            .brand .dot { color: var(--brand-tint); }
            .title { margin: 8px 0 2px; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
            .subtitle { margin: 0; color: var(--soft-text); font-size: 13px; }
            .stats { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; }
            .chip { background: rgba(255,255,255,0.7); border: 1px solid rgba(93,161,217,0.2); color: var(--brand-text); padding: 6px 10px; border-radius: 999px; font-size: 12px; }
            .section { background: var(--card-bg); border: 1px solid rgba(93,161,217,0.14); box-shadow: 0 10px 30px rgba(108, 99, 255, 0.06); border-radius: 24px; padding: 22px 20px; margin-top: 16px; }
            .section h3 { margin: 0 0 8px 0; font-size: 14px; color: var(--soft-text); font-weight: 700; letter-spacing: -0.2px; }
            .section .content { font-size: 15px; color: var(--brand-text); line-height: 1.7; }
            .content h2.md-h2 { color: var(--brand-tint); margin: 16px 0 10px 0; font-size: 18px; font-weight: 700; }
            .content h3.md-h3 { color: var(--brand-tint); margin: 12px 0 8px 0; font-size: 16px; font-weight: 700; }
            .content ul { margin: 8px 0 8px 16px; padding: 0; }
            .content li { margin: 4px 0; }
            .footer { text-align: center; color: var(--soft-text); font-size: 12px; margin-top: 18px; }
            .brandmark { font-weight: 800; letter-spacing: -0.2px; }
            @page { size: A4; margin: 0; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="cover">
              <div class="brand">Lumen<span class="dot">.</span></div>
              <div class="title">${
        content.reportSections.mainTitle || "Kişisel Rapor"
    }</div>
              <p class="subtitle">Özet raporun indirildi. Aşağıda kişisel içgörün yer alıyor.</p>
              <div class="stats">
                <div class="chip">≈ ${readMinutes} dk okuma</div>
                <div class="chip">${headingsCount} başlık</div>
              </div>
            </div>

            ${
        overviewHTML
            ? `
            <section class="section">
              <h3>Genel Bakış</h3>
              <div class="content">${overviewHTML}</div>
            </section>`
            : ""
    }

            ${
        goldenThreadHTML
            ? `
            <section class="section">
              <h3>Altın İp</h3>
              <div class="content">${goldenThreadHTML}</div>
            </section>`
            : ""
    }

            ${
        blindSpotHTML
            ? `
            <section class="section">
              <h3>Kör Nokta</h3>
              <div class="content">${blindSpotHTML}</div>
            </section>`
            : ""
    }

            <div class="footer">
              <span class="brandmark">Lumen<span class="dot">.</span></span> ile otomatik oluşturuldu
            </div>
          </div>
        </body>
      </html>
    `;
};

export const generatePdf = async (activeSummary: AnalysisReportContent) => {
    try {
        const htmlContent = buildElegantHtml(activeSummary);

        const options = {
            html: htmlContent,
            fileName: `lumen_kisisel_rapor_${
                new Date().toISOString().split("T")[0]
            }`,
            directory: "Documents",
            base64: false,
            height: 842,
            width: 595,
            padding: 10,
        };

        const file = await RNHTMLtoPDF.convert(options);

        if (file.filePath) {
            const fileUri = `file://${file.filePath}`;
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri, {
                    dialogTitle: "Raporunu Paylaş",
                    mimeType: "application/pdf",
                    UTI: Platform.OS === "ios" ? "com.adobe.pdf" : undefined,
                });
            } else {
                Toast.show({
                    type: "success",
                    text1: "PDF Oluşturuldu",
                    text2: fileUri,
                });
            }
        } else {
            Toast.show({
                type: "error",
                text1: "PDF Yolu Bulunamadı",
                text2: "Oluşturulan dosya yolu alınamadı.",
            });
        }
    } catch (e) {
        console.error("PDF oluşturma hatası:", e);
        Toast.show({
            type: "error",
            text1: "PDF Oluşturulamadı",
            text2: "PDF oluşturulurken bir hata oluştu.",
        });
    }
};
