"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, supabaseConfigError } from "@/lib/supabase/client";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("新しいパスワードを入力してください");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepareSession() {
      if (!supabase) {
        setMessage(supabaseConfigError || "Supabase環境変数が未設定です");
        return;
      }

      const errorDescription = searchParams.get("error_description");
      if (errorDescription) {
        setMessage(`認証に失敗しました: ${errorDescription}`);
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(`認証に失敗しました: ${error.message}`);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMessage("再設定リンクが無効または期限切れです。ログイン画面から再度お試しください。");
        return;
      }

      setReady(true);
    }

    prepareSession();
  }, [searchParams]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !ready) return;

    if (password.length < 6) {
      setMessage("パスワードは6文字以上で入力してください");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(`パスワード更新に失敗しました: ${error.message}`);
      return;
    }

    setMessage("パスワードを更新しました");
    router.replace("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#FBF6EC] px-4 text-[#33312E]">
      <form onSubmit={updatePassword} className="w-full max-w-[360px] rounded-[22px] border-2 border-[#2B2A27] bg-white p-6 shadow-[0_10px_30px_rgba(80,60,30,.12)]">
        <p className="font-[var(--font-outfit)] text-xs font-extrabold tracking-[.18em] text-[#E0734D]">RESET PASSWORD</p>
        <h1 className="mt-2 text-2xl font-black">パスワード再設定</h1>
        <p className="mt-3 text-sm font-bold leading-6 text-[#7A746B]">{message}</p>
        <label className="mt-5 block text-left text-[12.5px] font-extrabold leading-relaxed">新しいパスワード</label>
        <input
          className="input mt-[6px]"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          disabled={!ready}
        />
        <button disabled={!ready} className="btn-primary mt-4 w-full disabled:opacity-50">
          更新する <span className="font-[var(--font-outfit)] text-xs opacity-70">UPDATE</span>
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#FBF6EC] px-4 text-[#33312E]">読み込み中...</main>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
