import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase credentials belum di-set. Salin .env.example ke .env dan isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.',
  );
}

// Client publik. Hanya memakai URL + anon key (aman untuk frontend).
// Service role key TIDAK pernah dipakai di sisi frontend.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
