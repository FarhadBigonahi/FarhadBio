"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * `next` is read from the URL at submit time rather than via useSearchParams.
 * That hook forces the whole subtree to bail out of server rendering, which
 * left the login form blank until hydration — a dead screen on a slow link.
 * The value is only ever needed on click, so nothing is lost by reading it late.
 */
function redirectTarget(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  // Only same-origin admin paths; "//evil.com" is a valid pathname to a browser.
  return next && /^\/admin(\/|$)/.test(next) ? next : "/admin";
}

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(redirectTarget());
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed.");
        setBusy(false);
      }
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <div className="ad-login">
      <form className="ad-login__card" onSubmit={submit}>
        <div className="ad-brand__dot" style={{ width: 44, height: 44, fontSize: 20 }}>
          F
        </div>
        <h1>Welcome back</h1>
        <p>Sign in to manage farhad.bio</p>

        {error && <div className="ad-banner ad-banner--err">{error}</div>}

        <div className="ad-field">
          <label htmlFor="pw">Password</label>
          <input
            id="pw"
            className="ad-input"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button
          className="ad-btn ad-btn--primary"
          type="submit"
          disabled={busy || !password}
          style={{ width: "100%", justifyContent: "center", padding: 12 }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
