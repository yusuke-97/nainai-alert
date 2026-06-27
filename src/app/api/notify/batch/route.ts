import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type NeedItem = {
  id: string;
  name: string;
  status: "low" | "out";
  last_purchase_memo: string | null;
};

function buildBatchMessage(items: NeedItem[]) {
  const lines = items.map((item, index) => {
    const status = item.status === "out" ? "切れ" : "わずか";
    const memo = item.last_purchase_memo ? ` / ${item.last_purchase_memo}` : "";
    return `${index + 1}. ${item.name}（${status}${memo}）`;
  });

  return `🛒 買い物リスト\n\n${lines.join("\n")}\n\n買えるものだけ補充をお願いします。`;
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "server_supabase_not_configured" }, { status: 500 });
  }

  const admin = supabaseAdmin;
  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("household_id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile?.household_id) {
    return NextResponse.json({ ok: false, error: "household_not_found" }, { status: 403 });
  }

  const [{ data: householdData }, { data: itemData }] = await Promise.all([
    admin.from("households").select("line_target_id").eq("id", profile.household_id).maybeSingle(),
    admin
      .from("items")
      .select("id, name, status, last_purchase_memo")
      .eq("household_id", profile.household_id)
      .in("status", ["low", "out"])
      .order("updated_at", { ascending: false }),
  ]);

  const items = (itemData ?? []) as NeedItem[];
  if (!items.length) {
    return NextResponse.json({ ok: true, notified: false, reason: "no_items" });
  }

  const message = buildBatchMessage(items);
  let lineStatus = "not_sent";
  let notified = false;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = householdData?.line_target_id;

  if (token && targetId) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Line-Retry-Key": randomUUID(),
        },
        body: JSON.stringify({
          to: targetId,
          messages: [{ type: "text", text: message }],
        }),
        signal: controller.signal,
      });
      lineStatus = String(res.status);
      notified = res.ok || res.status === 409;
    } catch (error) {
      lineStatus = error instanceof Error ? error.message : "unknown_error";
    } finally {
      clearTimeout(timeout);
    }
  } else {
    lineStatus = token ? "line_not_connected" : "dry_run_no_token";
  }

  const { data: notification, error: notificationError } = await admin
    .from("shopping_notifications")
    .insert({
      household_id: profile.household_id,
      created_by: authData.user.id,
      message,
      line_status: lineStatus,
    })
    .select("id")
    .maybeSingle();

  if (notificationError || !notification?.id) {
    return NextResponse.json({ ok: false, error: "notification_history_failed" }, { status: 500 });
  }

  await admin.from("shopping_notification_items").insert(
    items.map((item) => ({
      notification_id: notification.id,
      item_id: item.id,
      item_name: item.name,
      status: item.status,
    })),
  );

  return NextResponse.json({ ok: true, notified, notificationId: notification.id, lineStatus, itemCount: items.length });
}
