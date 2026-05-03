import { Navigate, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "../lib/auth-client";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  if (isPending) {
    return (
      <p style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        Loading…
      </p>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const onSubmit = async (values: FormValues) => {
    const { error } = await authClient.signIn.email(values);
    if (error) {
      setError("root", { message: error.message ?? "Sign in failed" });
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
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        noValidate
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
            style={{
              padding: "0.5rem",
              font: "inherit",
              border: `1px solid ${errors.email ? "crimson" : "#d4d4d8"}`,
              borderRadius: 4,
            }}
          />
          {errors.email && (
            <span style={{ color: "crimson", fontSize: "0.875rem" }}>
              {errors.email.message}
            </span>
          )}
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            {...register("password")}
            style={{
              padding: "0.5rem",
              font: "inherit",
              border: `1px solid ${errors.password ? "crimson" : "#d4d4d8"}`,
              borderRadius: 4,
            }}
          />
          {errors.password && (
            <span style={{ color: "crimson", fontSize: "0.875rem" }}>
              {errors.password.message}
            </span>
          )}
        </label>
        {errors.root && (
          <p style={{ color: "crimson", margin: 0 }}>{errors.root.message}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "0.6rem",
            font: "inherit",
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
