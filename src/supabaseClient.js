import { createClient } from "@supabase/supabase-js";

// 값은 .env 의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 에서 주입됩니다.
// anon 키는 프론트엔드에 노출돼도 안전하며, 실제 데이터 보호는 Supabase RLS 정책이 담당합니다.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 키가 없으면 null 을 내보내 앱이 죽지 않고 "설정 필요" 안내를 띄우도록 합니다.
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const supabaseReady = Boolean(supabase);
