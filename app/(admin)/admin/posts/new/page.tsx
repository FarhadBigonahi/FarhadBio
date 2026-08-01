"use client";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import PostEditor from "@/components/PostEditor";
import { t } from "@/lib/admin-i18n";

export default function NewPostPage() {
  return (
    <AdminShell
      title={t.editor.newTitle}
      subtitle={t.editor.newSub}
      actions={
        <Link className="ad-btn ad-btn--ghost" href="/admin/posts">
          {t.common.back} →
        </Link>
      }
    >
      <PostEditor />
    </AdminShell>
  );
}
