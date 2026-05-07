import { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Health = { status: string; uptime: number };
type DbHealth = { status: string; db: string };

export function StatusPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<Health>("/api/health")
      .then((r) => setHealth(r.data))
      .catch((e: Error) => setError(e.message));

    axios
      .get<DbHealth>("/api/db-health")
      .then((r) => setDbHealth(r.data))
      .catch((e: Error) => setDbError(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Status</h1>
      <StatusCard
        title="Server status"
        description="GET /api/health"
        error={error}
        data={health}
      />
      <StatusCard
        title="DB status"
        description="GET /api/db-health"
        error={dbError}
        data={dbHealth}
      />
    </main>
  );
}

function StatusCard<T extends { status: string }>({
  title,
  description,
  error,
  data,
}: {
  title: string;
  description: string;
  error: string | null;
  data: T | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {data && <Badge variant="secondary">{data.status}</Badge>}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!error && !data && (
          <p className="text-muted-foreground text-sm">Checking…</p>
        )}
        {data && (
          <pre className="bg-muted text-muted-foreground overflow-x-auto rounded-md p-4 text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
