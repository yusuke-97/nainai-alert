import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getConfigError() {
  if (!supabaseUrl || !supabaseAnonKey) return "Supabase環境変数が未設定です";

  try {
    const url = new URL(supabaseUrl);
    if (url.hostname === "supabase.com") {
      return "NEXT_PUBLIC_SUPABASE_URLにはDashboardのURLではなくProject URLを設定してください";
    }
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URLの形式が不正です";
  }

  if (!supabaseAnonKey.startsWith("eyJ")) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEYにはanon public keyを設定してください";
  }

  return "";
}

export const supabaseConfigError = getConfigError();
export const isSupabaseConfigured = !supabaseConfigError;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
