"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import PostEditor from "@/components/PostEditor";
import { adminGet } from "@/lib/admin-fetch";
import type { Post } from "@/lib/content";

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [post, setPost] = useState<Post | null | undefined>(undefined);

  useEffect(() => {
    adminGet<{ post: Post }>(`/api/admin/posts/${id}`)
      .then((d) => setPost(d.post))
      .catch(() => setPost(null));
  }, [id]);

  return (
    <AdminShell
      title="Edit post"
      subtitle={post ? post.slug : "Loading…"}
      actions={
        <Link className="ad-btn ad-btn--ghost" href="/admin/posts">
          ← Back to posts
        </Link>
      }
    >
      {post === undefined ? (
        <div className="ad-skel" style={{ height: 400 }} />
      ) : post === null ? (
        <div className="ad-card ad-empty">Post not found.</div>
      ) : (
        <PostEditor initial={post} id={id} />
      )}
    </AdminShell>
  );
}
