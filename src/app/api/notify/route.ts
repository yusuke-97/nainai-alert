import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type ItemStatus = "in_stock" | "low" | "out" | "discontinued";

type NotifyRequest = {
  itemId?: string;
  status?: ItemStatus;
};

type ItemForNotify = {
  id: string;
  name: string;
  household_id: string;
  last_purchase_memo: string | null;
};

type HouseholdForNotify = {
  id: string;
  line_target_id: string | null;
};

function buildDedupeKey(itemId: string, status: ItemStatus, windowMin: number) {
  const windowMs = windowMin * 60 * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  return `${itemId}:${status}:${bucket}`;
}

function buildMessage(status: ItemStatus, itemName: string, lastPurchaseMemo?: string) {
  const memoLine = lastPurchaseMemo ? `\nいつもの容量：${lastPurchaseMemo}` : "";

  if (status === "low") {
    return `🟡 在庫がのこりわずかです\n\n商品：${itemName}${memoLine}\n\nお買い物のときに補充をお願いします`;
  }

  if (status === "out") {
    return `🔴【至急】在庫が切れました\n\n商品：${itemName}${memoLine}\n\n今日買えると助かります。買えそうな人はお願いします`;
  }

  return "";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as NotifyRequest | null;

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

  if (!body?.itemId || !body.status) {
    return NextResponse.json({ ok: false, error: "itemId and status are required" }, { status: 400 });
  }

  if (body.status !== "out") {
    return NextResponse.json({ ok: true, notified: false, reason: "status_notifiable_false" });
  }

  const [{ data: profile }, { data: itemData }] = await Promise.all([
    admin.from("profiles").select("household_id").eq("id", authData.user.id).maybeSingle(),
    admin
      .from("items")
      .select("id, name, household_id, last_purchase_memo")
      .eq("id", body.itemId)
      .maybeSingle(),
  ]);

  const item = itemData as ItemForNotify | null;
  if (!profile?.household_id || !item || profile.household_id !== item.household_id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { data: householdData } = await admin
    .from("households")
    .select("id, line_target_id")
    .eq("id", item.household_id)
    .maybeSingle();

  const household = householdData as HouseholdForNotify | null;
  if (!household?.line_target_id) {
    return NextResponse.json({ ok: true, notified: false, reason: "line_not_connected" });
  }

  const message = buildMessage(body.status, item.name, item.last_purchase_memo ?? undefined);
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const dedupeWindowMin = Number(process.env.NOTIFY_DEDUPE_WINDOW_MIN || "10");
  const since = new Date(Date.now() - dedupeWindowMin * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("notifications_log")
    .select("id")
    .eq("item_id", item.id)
    .eq("status", body.status)
    .gte("sent_at", since)
    .limit(1);

  if (recent?.length) {
    return NextResponse.json({ ok: true, notified: false, reason: "deduped" });
  }

  const dedupeKey = buildDedupeKey(item.id, body.status, dedupeWindowMin);
  const { data: reservedLog, error: reserveError } = await admin
    .from("notifications_log")
    .insert({
      household_id: item.household_id,
      item_id: item.id,
      status: body.status,
      message,
      line_status: "pending",
      dedupe_key: dedupeKey,
    })
    .select("id")
    .maybeSingle();

  if (reserveError) {
    if (reserveError.code === "23505") {
      return NextResponse.json({ ok: true, notified: false, reason: "deduped" });
    }

    console.error("notification reserve failed", reserveError);
    return NextResponse.json({ ok: false, error: "notification_reserve_failed" }, { status: 500 });
  }

  const updateLog = async (lineStatus: string) => {
    if (!reservedLog?.id) return;
    await admin.from("notifications_log").update({ line_status: lineStatus }).eq("id", reservedLog.id);
  };

  if (!token) {
    await updateLog("dry_run_no_token");
    return NextResponse.json({
      ok: true,
      notified: false,
      dryRun: true,
      reason: "LINE_CHANNEL_ACCESS_TOKEN is not configured",
      message,
    });
  }

  const quota = await getLineQuota(token);
  if (quota.exceeded) {
    await updateLog("quota_exceeded");
    return NextResponse.json({ ok: true, notified: false, reason: "quota_exceeded", message }, { status: 202 });
  }

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
        to: household.line_target_id,
        messages: [{ type: "text", text: message }],
      }),
      signal: controller.signal,
    });

    if (res.ok || res.status === 409) {
      await updateLog(String(res.status));
      return NextResponse.json({ ok: true, notified: true, lineStatus: res.status, message });
    }

    await updateLog(String(res.status));
    return NextResponse.json(
      { ok: true, notified: false, reason: "line_error", lineStatus: res.status, message },
      { status: 202 },
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_error";
    await updateLog(reason);
    return NextResponse.json({ ok: true, notified: false, reason, message }, { status: 202 });
  } finally {
    clearTimeout(timeout);
  }
}

async function getLineQuota(token: string) {
  try {
    const headers = { Authorization: `Bearer ${token}` };
    const [quotaRes, usageRes] = await Promise.all([
      fetch("https://api.line.me/v2/bot/message/quota", { headers, cache: "no-store" }),
      fetch("https://api.line.me/v2/bot/message/quota/consumption", { headers, cache: "no-store" }),
    ]);

    if (!quotaRes.ok || !usageRes.ok) return { exceeded: false };

    const quota = (await quotaRes.json()) as { type?: string; value?: number };
    const usage = (await usageRes.json()) as { totalUsage?: number };

    return {
      exceeded: quota.type === "limited" && typeof quota.value === "number" && (usage.totalUsage ?? 0) >= quota.value,
    };
  } catch {
    return { exceeded: false };
  }
}
