import { streamAdmin } from "@/lib/bff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/analytics/export?days=30&format=csv|json
// Streamed through untouched so the backend owns the CSV/JSON encoding and the
// download filename.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const days = params.get("days") ?? "30";
  const format = params.get("format") === "json" ? "json" : "csv";

  return streamAdmin(
    `/v1/admin/analytics/export?days=${encodeURIComponent(days)}&format=${format}`
  );
}
