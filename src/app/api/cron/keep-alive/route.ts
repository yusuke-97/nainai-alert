import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      checkedAt: new Date().toISOString(),
      reason: "NEXT_PUBLIC_SUPABASE_URL is not configured",
    });
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
        : undefined,
      cache: "no-store",
    });

    return NextResponse.json({ ok: true, status: res.status, checkedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
