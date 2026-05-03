import { useEffect, useState } from "react";

type Health = { status: string; uptime: number };
type DbHealth = { status: string; db: string };

export function HomePage() {
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
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Helpdesk</h1>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        Express + React + TypeScript + Bun
      </p>
      <section className="mt-6">
        <h2 className="text-lg font-medium">Server status</h2>
        {error && <p className="mt-2 text-red-700">Error: {error}</p>}
        {!error && !health && <p className="mt-2">Checking...</p>}
        {health && (
          <pre className="mt-2 rounded-lg bg-zinc-100 p-4 text-black">
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-medium">DB status</h2>
        {dbError && <p className="mt-2 text-red-700">Error: {dbError}</p>}
        {!dbError && !dbHealth && <p className="mt-2">Checking...</p>}
        {dbHealth && (
          <pre className="mt-2 rounded-lg bg-zinc-100 p-4 text-black">
            {JSON.stringify(dbHealth, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
