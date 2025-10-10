// utils/__tests__/supabase.test.ts
describe("supabase", () => {
    it("supabase modülü import edilebilmelidir", () => {
        const supabaseModule = require("../supabase");

        expect(supabaseModule).toBeDefined();
    });

    it("supabase client export edilmelidir", () => {
        const { supabase } = require("../supabase");

        expect(supabase).toBeDefined();
    });

    it("supabase client auth özelliğine sahip olmalıdır", () => {
        const { supabase } = require("../supabase");

        expect(supabase.auth).toBeDefined();
    });

    it("supabase client from metoduna sahip olmalıdır", () => {
        const { supabase } = require("../supabase");

        expect(typeof supabase.from).toBe("function");
    });
});
