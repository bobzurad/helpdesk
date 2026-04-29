import { useEffect, useState } from "react";

type Health = { status: string; uptime: number };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <h1>Helpdesk</h1>
      <p>Express + React + TypeScript + Bun</p>
      <section>
        <h2>Server status</h2>
        {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
        {!error && !health && <p>Checking...</p>}
        {health && (
          <pre style={{ background: "#f4f4f5", padding: "1rem", borderRadius: 8 }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
