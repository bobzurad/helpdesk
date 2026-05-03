import { useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

export function NavBar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="flex items-center justify-between border-b border-zinc-200 px-8 py-4 dark:border-zinc-800">
      <strong>Helpdesk</strong>
      <div className="flex items-center gap-4">
        {session && <span>{session.user.name}</span>}
        <button
          type="button"
          onClick={handleSignOut}
          className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
