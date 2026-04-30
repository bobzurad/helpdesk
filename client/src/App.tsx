import { useEffect, useState } from "react";

type Health = { status: string; uptime: number };
type DbHealth = { status: string; db: string };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((e: Error) => setError(e.message));

      fetch("/api/db-health")
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<DbHealth>;
        })
        .then(setDbHealth)
        .catch((e: Error) => setDbError(e.message));
  }, []);

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1>Helpdesk</h1>
      <p>Express + React + TypeScript + Bun</p>
      <section>
        <h2>Server status</h2>
        {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
        {!error && !health && <p>Checking...</p>}
        {health && (
          <pre
            style={{
              background: "#f4f4f5",
              padding: "1rem",
              borderRadius: 8,
              color: "black",
            }}
          >
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
      </section>
      <section>
        <h2>DB status</h2>
        {dbError && <p style={{ color: "crimson" }}>Error: {dbError}</p>}
        {!dbError && !dbHealth && <p>Checking...</p>}
        {dbHealth && (
          <pre
            style={{
              background: "#f4f4f5",
              padding: "1rem",
              borderRadius: 8,
              color: "black",
            }}
          >
            {JSON.stringify(dbHealth, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
