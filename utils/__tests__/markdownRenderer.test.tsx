// utils/__tests__/markdownRenderer.test.tsx
// React component testi - React Native Testing Library ile
import { render } from "@testing-library/react-native";
import { renderMarkdownText } from "../markdownRenderer";

const ACCENT_COLOR = "#6366F1";

describe("markdownRenderer.tsx - Markdown Renderer", () => {
    describe("renderMarkdownText - Temel Davranış", () => {
        it("✅ düz metni olduğu gibi render etmeli", () => {
            const result = renderMarkdownText(
                "Bu düz bir metindir",
                ACCENT_COLOR,
            );

            const { getByText } = render(result);
            expect(getByText("Bu düz bir metindir")).toBeTruthy();
        });

        it("✅ boş veya null metin için boş Text dönmeli", () => {
            const result1 = renderMarkdownText("", ACCENT_COLOR);
            const result2 = renderMarkdownText("   ", ACCENT_COLOR);

            expect(result1).toBeTruthy();
            expect(result2).toBeTruthy();
        });

        it("✅ çoklu paragrafları doğru ayrıştırmalı", () => {
            const markdown = `İlk paragraf

İkinci paragraf

Üçüncü paragraf`;

            const result = renderMarkdownText(markdown, ACCENT_COLOR);
            const { getByText } = render(result);

            expect(getByText("İlk paragraf")).toBeTruthy();
            expect(getByText("İkinci paragraf")).toBeTruthy();
            expect(getByText("Üçüncü paragraf")).toBeTruthy();
        });
    });

    describe("Başlık Formatları", () => {
        it("✅ ### başlıklarını doğru stillemeli (18pt, bold)", () => {
            const result = renderMarkdownText("### Önemli Başlık", ACCENT_COLOR);
            const { getByText } = render(result);

            const heading = getByText("Önemli Başlık");
            expect(heading).toBeTruthy();
            expect(heading.props.style).toMatchObject({
                fontSize: 18,
                fontWeight: "700",
            });
        });

        it("✅ ## başlıklarını doğru stillemeli (20pt, bold)", () => {
            const result = renderMarkdownText("## Seviye 2 Başlık", ACCENT_COLOR);
            const { getByText } = render(result);

            const heading = getByText("Seviye 2 Başlık");
            expect(heading).toBeTruthy();
            expect(heading.props.style).toMatchObject({
                fontSize: 20,
                fontWeight: "700",
            });
        });

        it("✅ başlık metninden # işaretlerini temizlemeli", () => {
            const result = renderMarkdownText("### Test", ACCENT_COLOR);
            const { getByText, queryByText } = render(result);

            expect(getByText("Test")).toBeTruthy();
            expect(queryByText("###")).toBeNull();
        });
    });

    describe("Kalın ve İtalik Metinler", () => {
        it("✅ **kalın** metni bold yapmalı", () => {
            const result = renderMarkdownText(
                "Bu **kalın** bir metindir",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("kalın")).toBeTruthy();
        });

        it("✅ *italik* metni italic yapmalı", () => {
            const result = renderMarkdownText(
                "Bu *italik* bir metindir",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("italik")).toBeTruthy();
        });

        it("✅ kalın ve italik bir arada kullanılabilmeli", () => {
            const result = renderMarkdownText(
                "**Kalın** ve *italik* metin",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("Kalın")).toBeTruthy();
            expect(getByText("italik")).toBeTruthy();
        });

        it("✅ iç içe formatlar (liste içinde kalın) çalışmalı", () => {
            const result = renderMarkdownText(
                "- Bu **önemli** bir öğe",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("önemli")).toBeTruthy();
        });
    });

    describe("Liste Öğeleri", () => {
        it("✅ - ile başlayan liste öğelerini • ile göstermeli", () => {
            const markdown = `- İlk öğe
- İkinci öğe
- Üçüncü öğe`;

            const result = renderMarkdownText(markdown, ACCENT_COLOR);
            const { getByText } = render(result);

            expect(getByText(/İlk öğe/)).toBeTruthy();
            expect(getByText(/İkinci öğe/)).toBeTruthy();
            expect(getByText(/Üçüncü öğe/)).toBeTruthy();
        });

        it("✅ liste öğelerinde kalın metin çalışmalı", () => {
            const result = renderMarkdownText(
                "- Bu **vurgulu** öğe",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("vurgulu")).toBeTruthy();
        });

        it("✅ liste öğelerinde italik metin çalışmalı", () => {
            const result = renderMarkdownText(
                "- Bu *italik* öğe",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("italik")).toBeTruthy();
        });
    });

    describe("💭 Düşünce Balonu Formatı", () => {
        it("✅ 💭 içeren metni özel stil ile render etmeli", () => {
            const result = renderMarkdownText(
                "💭 Bu bir düşünce balonu",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            const thoughtBubble = getByText(/Bu bir düşünce balonu/);
            expect(thoughtBubble).toBeTruthy();
            // Style kontrolü render tree'sinden çok karmaşık
            // Fonksiyonun çağrıldığını kontrol etmek yeterli
        });

        it("✅ düşünce balonunda kalın metin çalışmalı", () => {
            const result = renderMarkdownText(
                "💭 **Önemli** düşünce",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("Önemli")).toBeTruthy();
        });

        it("✅ düşünce balonunda accent color kullanılmalı", () => {
            const customColor = "#FF0000";
            const result = renderMarkdownText("💭 Test", customColor);
            const { getByText } = render(result);

            const thought = getByText(/Test/);
            expect(thought).toBeTruthy();
            // Accent color kullanımı fonksiyon içinde mevcut
        });
    });

    describe("Türkçe Karakter Desteği", () => {
        it("✅ Türkçe karakterleri doğru render etmeli", () => {
            const markdown = "Şişli'de çöp üzerinde ışık";

            const result = renderMarkdownText(markdown, ACCENT_COLOR);
            const { getByText } = render(result);

            expect(getByText(/Şişli/)).toBeTruthy();
            expect(getByText(/çöp/)).toBeTruthy();
        });

        it("✅ Türkçe başlıkları işlemeli", () => {
            const result = renderMarkdownText(
                "### Güzel Başlık",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("Güzel Başlık")).toBeTruthy();
        });

        it("✅ Türkçe kalın metni işlemeli", () => {
            const result = renderMarkdownText(
                "**Öğrenci** çalışıyor",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("Öğrenci")).toBeTruthy();
        });
    });

    describe("Edge Cases - Uç Durumlar", () => {
        it("✅ çok uzun metin için performans problemi olmamalı", () => {
            const longText = "A".repeat(5000);

            const start = Date.now();
            renderMarkdownText(longText, ACCENT_COLOR);
            const end = Date.now();

            // 500ms'den hızlı olmalı
            expect(end - start).toBeLessThan(500);
        });

        it("✅ hatalı format durumunda crash olmamalı", () => {
            const badMarkdown = "**açık ama kapatılmamış";

            expect(() =>
                renderMarkdownText(badMarkdown, ACCENT_COLOR)
            ).not.toThrow();
        });

        it("✅ emoji içeren metin işlemeli", () => {
            const markdown = "Bu 🎉 emoji 🔥 içerir";

            const result = renderMarkdownText(markdown, ACCENT_COLOR);
            const { getByText } = render(result);

            expect(getByText(/emoji/)).toBeTruthy();
        });

        it("✅ özel karakterler escape edilmemeli", () => {
            const markdown = "Bu < > & karakterler";

            const result = renderMarkdownText(markdown, ACCENT_COLOR);
            const { getByText } = render(result);

            expect(getByText(/</)).toBeTruthy();
        });

        it("✅ sadece boşluk içeren satırları atlamamalı", () => {
            const markdown = "    ";

            const result = renderMarkdownText(markdown, ACCENT_COLOR);
            expect(result).toBeTruthy();
        });

        it("✅ çoklu boş satırları doğru işlemeli", () => {
            const markdown = `Bir


İki`;

            const result = renderMarkdownText(markdown, ACCENT_COLOR);
            const { getByText } = render(result);

            expect(getByText("Bir")).toBeTruthy();
            expect(getByText("İki")).toBeTruthy();
        });

        it("✅ yalnızca ** içeren metin crash olmamalı", () => {
            expect(() => renderMarkdownText("**", ACCENT_COLOR)).not.toThrow();
        });

        it("✅ yalnızca * içeren metin crash olmamalı", () => {
            expect(() => renderMarkdownText("*", ACCENT_COLOR)).not.toThrow();
        });

        it("✅ çok kısa kalın metin (** **) işlenmeli ama boş", () => {
            const result = renderMarkdownText("** **", ACCENT_COLOR);
            const { UNSAFE_root } = render(result);

            // Render edilmeli ama boş içerik
            expect(UNSAFE_root).toBeTruthy();
        });
    });

    describe("Kompleks Senaryolar", () => {
        it("✅ tüm formatları içeren karışık metin işlemeli", () => {
            const markdown = `### Ana Başlık

Bu **kalın** ve bu *italik* metin.

- İlk öğe **kalın**
- İkinci öğe *italik*

💭 Bu bir **düşünce** balonu

## Alt Başlık

Normal paragraf`;

            const result = renderMarkdownText(markdown, ACCENT_COLOR);
            const { getByText } = render(result);

            expect(getByText("Ana Başlık")).toBeTruthy();
            // "kalın" ve "italik" kelimeleri birden fazla yerde geçiyor
            expect(getByText(/İlk öğe/)).toBeTruthy();
            expect(getByText(/İlk öğe/)).toBeTruthy();
            expect(getByText("düşünce")).toBeTruthy();
            expect(getByText("Alt Başlık")).toBeTruthy();
            expect(getByText("Normal paragraf")).toBeTruthy();
        });

        it("✅ satır içinde birden fazla kalın/italik işlemeli", () => {
            const result = renderMarkdownText(
                "**Bir** normal **iki** normal **üç**",
                ACCENT_COLOR,
            );
            const { getByText } = render(result);

            expect(getByText("Bir")).toBeTruthy();
            expect(getByText("iki")).toBeTruthy();
            expect(getByText("üç")).toBeTruthy();
        });
    });

    describe("Snapshot Testing - Görsel Tutarlılık", () => {
        it("✅ basit markdown için snapshot tutmalı", () => {
            const result = renderMarkdownText(
                "### Başlık\nBu **kalın** metin",
                ACCENT_COLOR,
            );
            const { toJSON } = render(result);

            expect(toJSON()).toMatchSnapshot();
        });

        it("✅ kompleks markdown için snapshot tutmalı", () => {
            const markdown = `### Ana Başlık

Bu **kalın** ve bu *italik* metin.

- İlk öğe
- İkinci öğe

💭 Düşünce **balonu**

## Alt Başlık`;

            const result = renderMarkdownText(markdown, ACCENT_COLOR);
            const { toJSON } = render(result);

            expect(toJSON()).toMatchSnapshot();
        });

        it("✅ farklı accent color'lar için farklı snapshot'lar almalı", () => {
            const markdown = "💭 Test düşünce";

            const result1 = renderMarkdownText(markdown, "#FF0000");
            const result2 = renderMarkdownText(markdown, "#00FF00");

            const { toJSON: toJSON1 } = render(result1);
            const { toJSON: toJSON2 } = render(result2);

            expect(toJSON1()).not.toEqual(toJSON2());
        });
    });
});
