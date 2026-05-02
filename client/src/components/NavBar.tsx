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
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 2rem",
        borderBottom: "1px solid #e4e4e7",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <strong>Helpdesk</strong>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {session && <span>{session.user.name}</span>}
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            padding: "0.4rem 0.8rem",
            border: "1px solid #d4d4d8",
            borderRadius: 6,
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
