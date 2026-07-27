"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
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
        router.replace(next.startsWith("/admin") ? next : "/admin");
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="ad-login" />}>
      <LoginForm />
    </Suspense>
  );
}
