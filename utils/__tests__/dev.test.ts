// utils/__tests__/dev.test.ts
import { isDev } from "../dev";

describe("dev utils", () => {
    describe("isDev", () => {
        const originalGlobal = global;

        beforeEach(() => {
            // Her testten önce global'i sıfırla
            (global as any).__DEV__ = undefined;
        });

        afterEach(() => {
            // Global'i eski haline getir
            global = originalGlobal;
        });

        it("__DEV__ true ise true döndürmelidir", () => {
            (global as any).__DEV__ = true;

            expect(isDev()).toBe(true);
        });

        it("__DEV__ false ise false döndürmelidir", () => {
            (global as any).__DEV__ = false;

            expect(isDev()).toBe(false);
        });

        it("__DEV__ undefined ise false döndürmelidir", () => {
            (global as any).__DEV__ = undefined;

            expect(isDev()).toBe(false);
        });

        it("__DEV__ null ise false döndürmelidir", () => {
            (global as any).__DEV__ = null;

            expect(isDev()).toBe(false);
        });

        it("__DEV__ 0 ise false döndürmelidir", () => {
            (global as any).__DEV__ = 0;

            expect(isDev()).toBe(false);
        });

        it("__DEV__ 1 ise true döndürmelidir", () => {
            (global as any).__DEV__ = 1;

            expect(isDev()).toBe(true);
        });

        it("__DEV__ boş string ise false döndürmelidir", () => {
            (global as any).__DEV__ = "";

            expect(isDev()).toBe(false);
        });

        it("__DEV__ dolu string ise true döndürmelidir", () => {
            (global as any).__DEV__ = "development";

            expect(isDev()).toBe(true);
        });

        it("__DEV__ boş array ise true döndürmelidir (truthy değer)", () => {
            (global as any).__DEV__ = [];

            // Boş array JavaScript'te truthy'dir ama Boolean([]) -> false değil true'dur!
            // Ancak array'ler JavaScript'te truthy'dir
            expect(isDev()).toBe(true);
        });

        it("__DEV__ dolu array ise true döndürmelidir", () => {
            (global as any).__DEV__ = [1];

            expect(isDev()).toBe(true);
        });

        it("__DEV__ boş obje ise true döndürmelidir (truthy değer)", () => {
            (global as any).__DEV__ = {};

            // Boş obje JavaScript'te truthy'dir
            expect(isDev()).toBe(true);
        });

        it("__DEV__ dolu obje ise true döndürmelidir", () => {
            (global as any).__DEV__ = { dev: true };

            expect(isDev()).toBe(true);
        });

        it("Boolean() ile aynı davranışı göstermelidir", () => {
            const testValues = [
                true,
                false,
                0,
                1,
                "",
                "test",
                null,
                undefined,
                [],
                [1],
                {},
                { a: 1 },
            ];

            testValues.forEach((value) => {
                (global as any).__DEV__ = value;
                expect(isDev()).toBe(Boolean(value));
            });
        });

        it("birden fazla kez çağrıldığında tutarlı sonuç döndürmelidir", () => {
            (global as any).__DEV__ = true;

            expect(isDev()).toBe(true);
            expect(isDev()).toBe(true);
            expect(isDev()).toBe(true);
        });

        it("runtime'da __DEV__ değişirse yeni değeri döndürmelidir", () => {
            (global as any).__DEV__ = true;
            expect(isDev()).toBe(true);

            (global as any).__DEV__ = false;
            expect(isDev()).toBe(false);

            (global as any).__DEV__ = true;
            expect(isDev()).toBe(true);
        });

        it("globalThis üzerinden __DEV__'e erişmelidir", () => {
            (globalThis as any).__DEV__ = true;

            expect(isDev()).toBe(true);

            (globalThis as any).__DEV__ = false;
            expect(isDev()).toBe(false);
        });
    });
});
