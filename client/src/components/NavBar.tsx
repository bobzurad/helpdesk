import { Link, useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="border-border flex items-center justify-between border-b px-8 py-4">
      <div className="flex items-center gap-6">
        <Link to="/">
          <strong>Helpdesk</strong>
        </Link>
        {session?.user.role === "ADMIN" && (
          <Link to="/users" className="text-sm hover:underline">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        {session && (
          <span className="text-muted-foreground text-sm">
            {session.user.name}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </nav>
  );
}
