import { NextResponse } from "next/server";
import { callAdmin } from "@/lib/bff";
import { purgePostCaches } from "@/lib/revalidate";
import type { Post } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const result = await callAdmin<{ post: Post }>(`/v1/admin/posts/${id}`);
  return result.ok ? NextResponse.json(result.data) : result.response;
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.text();

  const result = await callAdmin<{
    id: number;
    slug: string;
    previousSlug: string;
  }>(`/v1/admin/posts/${id}`, { method: "PUT", body });
  if (!result.ok) return result.response;

  // The backend reports the old slug too, so a rename purges both URLs.
  purgePostCaches(result.data.slug, result.data.previousSlug);

  return NextResponse.json({ ok: true, ...result.data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const result = await callAdmin<{ ok: true; slug: string }>(
    `/v1/admin/posts/${id}`,
    { method: "DELETE" }
  );
  if (!result.ok) return result.response;

  purgePostCaches(result.data.slug);

  return NextResponse.json({ ok: true });
}
