import { NextResponse } from "next/server";
import { callAdmin } from "@/lib/bff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proxies a base64 image upload to the backend, which stores it and returns a URL. */
export async function POST(req: Request) {
  const body = await req.text();
  const result = await callAdmin<{ url: string; bytes: number }>(
    "/v1/admin/uploads",
    { method: "POST", body }
  );
  return result.ok ? NextResponse.json(result.data, { status: 201 }) : result.response;
}
