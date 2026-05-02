import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

export function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
  }, [email, password]);

  if (isPending) {
    return (
      <p style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        Loading…
      </p>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message ?? "Sign in failed");
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: 360,
        margin: "4rem auto",
      }}
    >
      <h1 style={{ marginBottom: "1.5rem" }}>Sign in</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ padding: "0.5rem", font: "inherit" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ padding: "0.5rem", font: "inherit" }}
          />
        </label>
        {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "0.6rem",
            font: "inherit",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
