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

  if (isPending) return <p className="p-8">Loading…</p>;

  if (session) return <Navigate to="/" replace />;

  const onSubmit = async (values: FormValues) => {
    const { error } = await authClient.signIn.email(values);
    if (error) {
      setError("root", { message: error.message ?? "Sign in failed" });
      return;
    }
    navigate("/", { replace: true });
  };

  const inputClass = (invalid: boolean) =>
    `rounded border px-3 py-2 ${
      invalid
        ? "border-red-600"
        : "border-zinc-300 dark:border-zinc-700"
    }`;

  return (
    <main className="mx-auto mt-16 max-w-sm p-8">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <label className="flex flex-col gap-1">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
            className={inputClass(Boolean(errors.email))}
          />
          {errors.email && (
            <span className="text-sm text-red-700">{errors.email.message}</span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            {...register("password")}
            className={inputClass(Boolean(errors.password))}
          />
          {errors.password && (
            <span className="text-sm text-red-700">
              {errors.password.message}
            </span>
          )}
        </label>
        {errors.root && <p className="text-red-700">{errors.root.message}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
