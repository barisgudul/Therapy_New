// supabase/functions/_shared/sentry.ts

// 1. GERÇEK Sentry SDK'sını internetten import ediyoruz
import * as Sentry from "https://deno.land/x/sentry@7.120.3/index.mjs";

// 2. GERÇEK Sentry.init() fonksiyonunu, Supabase sırlarımızla çağırıyoruz.
Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  environment: Deno.env.get("APP_ENV") || "development",
});

// 3. GERÇEK Sentry objesini diğer fonksiyonların
//    kullanabilmesi için export ediyoruz.
export { Sentry };
