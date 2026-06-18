import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type LineEvent = {
  type: string;
  source?: {
    type?: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
};

function isValidSignature(body: string, signature: string | null) {
  const secret = process.env.LINE_CHANNEL_SECRET;

  if (!secret) return true;
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(body).digest("base64");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody || "{}") as { events?: LineEvent[] };
  const targets = (payload.events ?? []).map((event) => ({
    eventType: event.type,
    targetType: event.source?.type,
    targetId: event.source?.groupId ?? event.source?.roomId ?? event.source?.userId ?? null,
    text: event.message?.type === "text" ? event.message.text?.trim() : undefined,
  }));

  const connected = [];
  if (supabaseAdmin) {
    for (const target of targets) {
      if (!target.targetId || !target.text) continue;
      const inviteCode = target.text.toUpperCase().replace(/^NAINAI\s+/, "");
      const { data, error } = await supabaseAdmin
        .from("households")
        .update({
          line_target_type: target.targetType === "group" ? "group" : "user",
          line_target_id: target.targetId,
        })
        .eq("invite_code", inviteCode)
        .select("id, name, invite_code")
        .maybeSingle();

      if (!error && data) connected.push(data);
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun: !supabaseAdmin,
    targets: targets.filter((target) => target.targetId),
    connected,
    note: supabaseAdmin
      ? "LINEで招待コードを送ると、その送信元を通知先として保存します。"
      : "SUPABASE_SERVICE_ROLE_KEY未設定のため、取得したtargetIdはレスポンスで確認できます。",
  });
}
