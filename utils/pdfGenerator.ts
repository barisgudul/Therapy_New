// utils/pdfGenerator.ts

import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
// @ts-ignore
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Toast from "react-native-toast-message";
import { AnalysisReportContent } from "../types/analysis";

// Bu fonksiyon artık component'in içinde değil, saf bir yardımcı fonksiyon.
const convertMarkdownToHTML = (markdown: string): string => {
    return markdown
        .replace(
            /^## (.*$)/gim,
            '<h2 style="color: #4988e5; margin: 20px 0 10px 0; font-size: 18px; font-weight: 600;">$1</h2>',
        )
        .replace(
            /^### (.*$)/gim,
            '<h3 style="color: #4988e5; margin: 16px 0 8px 0; font-size: 16px; font-weight: 600;">$1</h3>',
        )
        .replace(
            /\*\*(.*?)\*\*/g,
            '<strong style="font-weight: 600;">$1</strong>',
        )
        .replace(
            /^• (.*$)/gim,
            '<li style="margin: 4px 0; padding-left: 8px;">$1</li>',
        )
        .replace(
            /(<li.*<\/li>)/gs,
            '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>',
        )
        .replace(/\n/g, "<br/>");
};

export const generatePdf = async (activeSummary: AnalysisReportContent) => {
    try {
        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Kişisel Rapor</title>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; }
            .container { padding: 32px 18px; }
            h2 { color: #4988e5; text-align: center; margin-bottom: 16px; }
            .divider { height: 2px; width: 100%; background: #e3e8f0; margin: 12px 0 22px 0; border-radius: 2px; }
            .content { font-size: 15px; line-height: 1.7; color: #222; text-align: left; }
            .footer { margin-top: 32px; color: #9ca3af; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>therapy<span style="color:#5DA1D9;">.</span> - Kişisel Rapor</h2>
            <div class="divider"></div>
            <div class="content">
              ${
            convertMarkdownToHTML(
                (activeSummary.reportSections.overview + "\n\n" +
                    activeSummary.reportSections.goldenThread).trim(),
            )
        }
            </div>
            <div class="footer">
              Bu PDF, therapy. uygulamasının Kişisel Rapor özelliği ile otomatik oluşturulmuştur.
            </div>
          </div>
        </body>
      </html>
    `;

        const options = {
            html: htmlContent,
            fileName: `therapy_kisisel_rapor_${
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
            await Sharing.shareAsync(fileUri, {
                dialogTitle: "Raporunu Paylaş",
                mimeType: "application/pdf",
                UTI: Platform.OS === "ios" ? "com.adobe.pdf" : undefined,
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
