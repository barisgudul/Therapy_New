// supabase/functions/_shared/test_setup.ts
import { stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { LoggingService } from "./utils/LoggingService.ts";

// Tüm testler başlamadan önce, LoggingService'in private log metodunu ele geçirip
// hiçbir şey yapmayan bir fonksiyonla değiştiriyoruz.
// Bu, testler sırasında gereksiz network çağrılarını ve kaynak sızıntılarını engeller.
stub(LoggingService.prototype, "log" as any, () => {});
