import { NextResponse } from "next/server";
import { callAdmin } from "@/lib/bff";
import { purgePostCaches } from "@/lib/revalidate";
import type { Post } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await callAdmin<{ posts: Post[] }>("/v1/admin/posts");
  return result.ok ? NextResponse.json(result.data) : result.response;
}

export async function POST(req: Request) {
  const body = await req.text();
  const result = await callAdmin<{ id: number; slug: string }>(
    "/v1/admin/posts",
    { method: "POST", body }
  );
  if (!result.ok) return result.response;

  // Cache invalidation stays on this side because it is a Vercel concern —
  // the backend has no idea which URLs render its data.
  purgePostCaches(result.data.slug);

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 });
}
