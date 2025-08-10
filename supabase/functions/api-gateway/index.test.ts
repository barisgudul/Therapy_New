// supabase/functions/api-gateway/index.test.ts
// DÜZELTME: Import yollarını merkezi haritamıza göre kısaltıyoruz.
import { assert, assertEquals } from "assert/mod.ts";
import { stub } from "mock";

Deno.test("API Gateway: Should call Gemini with correct parameters", async () => {
  // Env değişkenlerini modül yüklenmeden önce ayarla
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");
  Deno.env.set("GEMINI_API_KEY", "fake-gemini-key");
  // Güvenlik kontrolünü AÇIK bırakarak daha gerçekçi test yapalım.
  Deno.env.set("DISABLE_SAFETY_CHECKS", "false");

  // DÜZELTME: globalThis.fetch'in tip imzasına tam olarak uyum.
  const mockFetch = stub(
    globalThis,
    "fetch",
    ((...args: Parameters<typeof fetch>): ReturnType<typeof fetch> => {
      const [input] = args;
      const urlString = input instanceof Request ? input.url : String(input);
      if (urlString.includes("gemini-1.5-flash:generateContent")) {
        // classifyTextForSafety için sahte yanıt
        return Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [{ content: { parts: [{ text: "level_0_safe" }] } }],
            }),
            { status: 200 },
          ),
        );
      }
      // Asıl Gemini çağrısı için sahte yanıt
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "Merhaba" }] } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }) as typeof fetch,
  );

  // Modülü env ayarlarından sonra yükle
  const { handleApiGateway } = await import("./index.ts");

  const requestBody = {
    type: "gemini",
    payload: { model: "gemini-1.5-flash", prompt: "Nasılsın?" },
  };

  const fakeRequest = new Request("http://localhost/api-gateway", {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // DÜZELTME: Header ekledik.
    body: JSON.stringify(requestBody),
  });

  try {
    await handleApiGateway(fakeRequest);

    // DÜZELTME: Güvenlik kontrolü çağrısı + ana API çağrısı = 2 fetch.
    assertEquals(mockFetch.calls.length, 2);
    const mainApiCall = mockFetch.calls[1]; // İkinci çağrı bizim asıl çağrımız.
    const fetchUrl = String(mainApiCall.args[0]);
    assert(fetchUrl.includes("gemini-1.5-flash:generateContent"));
  } finally {
    mockFetch.restore();
  }
});
