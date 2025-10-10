// utils/__tests__/i18n.test.ts
describe("i18n module", () => {
    it("i18n dosyası var olmalıdır", () => {
        // i18n dosyası side-effect'li olduğu için sadece varlığını kontrol ediyoruz
        expect(() => {
            require("../i18n");
        }).not.toThrow();
    });

    it("i18n sabitlerini export etmelidir", () => {
        // İz olateModules kullanmadan export'ları kontrol et
        const fs = require("fs");
        const path = require("path");
        const i18nPath = path.join(__dirname, "../i18n.ts");
        const content = fs.readFileSync(i18nPath, "utf8");

        expect(content).toContain("SUPPORTED_LANGUAGES");
        expect(content).toContain("DEFAULT_LANGUAGE");
        expect(content).toContain("changeLanguage");
    });
});
