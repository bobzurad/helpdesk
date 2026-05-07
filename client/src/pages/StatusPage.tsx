import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type Health = { status: string; uptime: number };
type DbHealth = { status: string; db: string };

export function StatusPage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await axios.get<Health>("/api/health")).data,
  });

  const dbHealth = useQuery({
    queryKey: ["db-health"],
    queryFn: async () => (await axios.get<DbHealth>("/api/db-health")).data,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Status</h1>
      <StatusCard
        title="Server status"
        description="GET /api/health"
        error={health.error?.message ?? null}
        data={health.data ?? null}
      />
      <StatusCard
        title="DB status"
        description="GET /api/db-health"
        error={dbHealth.error?.message ?? null}
        data={dbHealth.data ?? null}
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
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
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
