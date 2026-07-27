import { NextResponse } from "next/server";
import { callAdmin } from "@/lib/bff";
import type { AnalyticsBundle } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = new URL(req.url).searchParams.get("days") ?? "30";
  const result = await callAdmin<AnalyticsBundle>(
    `/v1/admin/analytics?days=${encodeURIComponent(days)}`
  );
  return result.ok ? NextResponse.json(result.data) : result.response;
}
