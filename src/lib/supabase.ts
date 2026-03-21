import { createClient } from "@supabase/supabase-js";

// Intenta leer del .env, y si no existe, usa el texto manual
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ihawecsiswxeyatnhduq.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_wSRq62xM32K_jffHqHdfZg_-Q8ud0jH";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
