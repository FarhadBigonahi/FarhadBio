"use client";

// Browser-side fetch for the dashboard.
//
// The session token lives in an httpOnly cookie, so this never handles auth
// itself — it only reacts to the backend having rejected it. Without this, an
// expired session silently renders an empty dashboard forever, which reads as
// "my data is gone" rather than "I need to sign in again".

export class AdminFetchError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AdminFetchError";
  }
}

/** GET + parse JSON. Redirects to the login page if the session is gone. */
export async function adminGet<T>(path: string): Promise<T> {
  return adminRequest<T>(path, { method: "GET" });
}

export async function adminRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, { ...init, credentials: "same-origin" });

  if (res.status === 401) {
    // The BFF already cleared the cookie; send the user somewhere useful and
    // remember where they were.
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/admin/login?next=${next}`;
    // Never resolves — the page is navigating away.
    return new Promise<T>(() => {});
  }

  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!res.ok) {
    throw new AdminFetchError(
      res.status,
      data?.error?.message ?? `Request failed (${res.status}).`
    );
  }
  return data as T;
}
