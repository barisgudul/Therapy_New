// utils/supabase-admin.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// BU, sunucu tarafında, TÜM YETKİLERLE çalışacak olan özel istemcimizdir.
export const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
) 