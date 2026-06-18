"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigError } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("登録済みのメールアドレスを入力してください。");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendResetEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sent) return;
    if (!supabase) {
      setMessage(supabaseConfigError || "Supabase環境変数が未設定です");
      return;
    }
    if (!email.trim()) {
      setMessage("メールアドレスを入力してください。");
      return;
    }

    setSending(true);
    const { error } = await supabase.auth
      .resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      .catch((error: unknown) => ({
        error: error instanceof Error ? error : new Error("パスワード再設定メールの送信に失敗しました"),
      }));
    setSending(false);

    if (error) {
      setMessage(`送信に失敗しました: ${error.message}`);
      return;
    }

    setSent(true);
    setMessage("パスワード再設定メールを送信しました。メール内のリンクを開いてください。");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#FBF6EC] px-4 text-[#33312E]">
      <form onSubmit={sendResetEmail} className="w-full max-w-[380px] rounded-[22px] border-2 border-[#2B2A27] bg-white p-6 shadow-[0_10px_30px_rgba(80,60,30,.12)]">
        <p className="font-[var(--font-outfit)] text-xs font-extrabold tracking-[.18em] text-[#E0734D]">FORGOT PASSWORD</p>
        <h1 className="mt-2 text-2xl font-black">パスワード再設定</h1>
        <p className="mt-3 text-sm font-bold leading-6 text-[#7A746B]">{message}</p>
        <label className="mt-5 block text-left text-[12.5px] font-extrabold leading-relaxed">メールアドレス</label>
        <input
          className="input mt-[6px]"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={sending || sent}
        />
        <button disabled={sending || sent} className="btn-primary mt-4 w-full disabled:opacity-50">
          {sent ? "送信済み" : sending ? "送信中..." : "再設定メールを送信"} <span className="font-[var(--font-outfit)] text-xs opacity-70">SEND</span>
        </button>
        <Link href="/login" className="mt-5 block text-center text-[11px] font-extrabold text-[#C75B38]">
          ログイン画面に戻る →
        </Link>
      </form>
    </main>
  );
}
