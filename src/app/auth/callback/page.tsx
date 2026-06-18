"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, supabaseConfigError } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("認証を確認しています...");

  useEffect(() => {
    async function completeAuth() {
      if (!supabase) {
        setMessage(supabaseConfigError || "Supabase環境変数が未設定です");
        return;
      }

      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description");

      if (errorDescription) {
        setMessage(`認証に失敗しました: ${errorDescription}`);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(`認証に失敗しました: ${error.message}`);
          return;
        }
      }

      router.replace("/");
    }

    completeAuth();
  }, [router, searchParams]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#FBF6EC] px-4 text-[#33312E]">
      <div className="rounded-[22px] border-2 border-[#2B2A27] bg-white px-6 py-5 text-center text-sm font-extrabold shadow-[0_10px_30px_rgba(80,60,30,.12)]">
        {message}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#FBF6EC] px-4 text-[#33312E]">
          <div className="rounded-[22px] border-2 border-[#2B2A27] bg-white px-6 py-5 text-center text-sm font-extrabold shadow-[0_10px_30px_rgba(80,60,30,.12)]">
            認証を確認しています...
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
