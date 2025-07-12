// utils/jsonValidator.ts
import { z, ZodSchema } from 'zod';

/**
 * AI'dan gelen potansiyel olarak kirli bir metinden JSON'u ayıklar,
 * ayrıştırır ve verilen Zod şemasına göre doğrular.
 * @param text AI'dan gelen ham metin.
 * @param schema Doğrulama için kullanılacak Zod şeması.
 * @returns Başarılı olursa, doğrulanmış ve tipi güvenli veri. Başarısız olursa, null.
 */
export function parseAndValidateJson<T extends ZodSchema>(
  text: string,
  schema: T
): z.infer<T> | null {
  try {
    // Kirli metni temizle: Markdown code block'larını ve diğer artıkları kaldır.
    // Metin içindeki ilk '{' ve son '}' arasındaki her şeyi al.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("⛔️ [JSON-EXTRACT-ERROR] Metin içinde geçerli JSON bloğu bulunamadı.");
      return null;
    }
    const extractedText = match[0];
    const jsonData = JSON.parse(extractedText);
    
    // Zod ile güvenli ayrıştırma ve doğrulama yap.
    const validationResult = schema.safeParse(jsonData);

    if (validationResult.success) {
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