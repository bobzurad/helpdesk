import { Navigate, Outlet } from "react-router";
import { authClient } from "../lib/auth-client";

export function RequireAuth() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <p style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        Loading…
      </p>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <Outlet />;
}
