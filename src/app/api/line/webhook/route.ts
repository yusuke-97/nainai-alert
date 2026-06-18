import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type LineEvent = {
  type: string;
  replyToken?: string;
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

function normalizeInviteCode(text: string) {
  return text
    .trim()
    .toUpperCase()
    .replace(/^NAINAI\s+/, "")
    .replace(/[\s-]/g, "");
}

function targetTypeForLine(type: string | undefined) {
  return type === "group" || type === "room" ? "group" : "user";
}

async function replyToLine(replyToken: string | undefined, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!replyToken || !token) return;

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
    });

    if (!response.ok) {
      console.error("LINE reply failed", { status: response.status, body: await response.text() });
    }
  } catch (error) {
    console.error("LINE reply failed", error);
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!isValidSignature(rawBody, signature)) {
    console.error("LINE webhook invalid signature");
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody || "{}") as { events?: LineEvent[] };
  const targets = (payload.events ?? []).map((event) => ({
    eventType: event.type,
    replyToken: event.replyToken,
    targetType: event.source?.type,
    targetId: event.source?.groupId ?? event.source?.roomId ?? event.source?.userId ?? null,
    text: event.message?.type === "text" ? event.message.text?.trim() : undefined,
  }));

  console.info("LINE webhook received", {
    events: targets.length,
    eventTypes: targets.map((target) => target.eventType),
    sourceTypes: targets.map((target) => target.targetType),
    hasSupabaseAdmin: Boolean(supabaseAdmin),
  });

  const connected = [];
  if (!supabaseAdmin) {
    await Promise.all(targets.map((target) => replyToLine(target.replyToken, "LINE連携に失敗しました。管理者側のSupabase設定を確認してください。")));
  } else {
    for (const target of targets) {
      if (!target.targetId || !target.text) continue;

      const inviteCode = normalizeInviteCode(target.text);
      console.info("LINE connect attempt", {
        sourceType: target.targetType,
        inviteCodeLength: inviteCode.length,
      });

      const { data, error } = await supabaseAdmin
        .from("households")
        .update({
          line_target_type: targetTypeForLine(target.targetType),
          line_target_id: target.targetId,
        })
        .eq("invite_code", inviteCode)
        .select("id, name, invite_code, line_target_type")
        .maybeSingle();

      if (error) {
        console.error("LINE connect failed", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        await replyToLine(target.replyToken, "LINE連携に失敗しました。時間をおいてもう一度お試しください。");
        continue;
      }

      if (data) {
        connected.push(data);
        const targetLabel = targetTypeForLine(target.targetType) === "group" ? "このグループ" : "このLINE";
        console.info("LINE connect succeeded", {
          householdId: data.id,
          targetType: data.line_target_type,
        });
        await replyToLine(target.replyToken, `NaiNai Alertの通知先を${targetLabel}に設定しました。`);
      } else {
        console.warn("LINE connect code not found", { inviteCodeLength: inviteCode.length });
        await replyToLine(target.replyToken, "LINE連携コードが見つかりません。アプリの設定画面から最新のコードをコピーして送信してください。");
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun: !supabaseAdmin,
    targets: targets.filter((target) => target.targetId),
    connected,
    note: supabaseAdmin
      ? "LINEで連携コードを送ると、その送信元を通知先として保存します。"
      : "SUPABASE_SERVICE_ROLE_KEY未設定のため、取得したtargetIdはレスポンスで確認できます。",
  });
}
