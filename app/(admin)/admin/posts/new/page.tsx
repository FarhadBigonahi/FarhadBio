"use client";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import PostEditor from "@/components/PostEditor";

export default function NewPostPage() {
  return (
    <AdminShell
      title="New post"
      subtitle="Write, optimize for SEO, and publish"
      actions={
        <Link className="ad-btn ad-btn--ghost" href="/admin/posts">
          ← Back to posts
        </Link>
      }
    >
      <PostEditor />
    </AdminShell>
  );
}
