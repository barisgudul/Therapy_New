// utils/jsonValidator.ts
import { z, ZodSchema } from 'zod';

export function parseAndValidateJson<T extends ZodSchema>(
  text: string,
  schema: T
): z.infer<T> | null {
  try {
    // YENİ VE AKILLI REGEX: Metnin içindeki ilk '{' ve son '}' arasındaki her şeyi alır.
    // Yapay zekanın başına ve sonuna eklediği gevezelikleri yok sayar.
    const match = text.match(/\{[\s\S]*\}/);
    
    if (!match) {
      console.error("⛔️ [JSON-EXTRACT-ERROR] Metin içinde geçerli JSON bloğu bulunamadı.");
      return null;
    }

    // Eşleşen ilk ve tek bloğu alıyoruz.
    const extractedText = match[0];
    const jsonData = JSON.parse(extractedText);
    
    const validationResult = schema.safeParse(jsonData);

    if (validationResult.success) {
      // Başarılı olursa, Zod'un tip güvenliği sağladığı veriyi döndür.
      return validationResult.data;
    } else {
      console.error("⛔️ [JSON-VALIDATION-ERROR] Veri, Zod şemasına uymuyor:", validationResult.error.flatten());
      return null;
    }
  } catch (error) {
    console.error("⛔️ [JSON-CRITICAL-FAILURE] JSON ayrıştırma veya doğrulama sırasında kritik hata:", error);
    return null;
  }
}