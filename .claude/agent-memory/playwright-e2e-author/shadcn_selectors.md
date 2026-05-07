---
name: shadcn/ui selector patterns
description: Accessible-locator patterns that work for shadcn Alert/Button/Label/Card components in this codebase
type: project
---

Accessible-locator patterns that work for the shadcn/ui components used in `client/src/`:

- **`<Alert>`** (variant="destructive") — has `role="alert"` by default. Use `page.getByRole("alert")`. The `<AlertDescription>` is the inner text.
- **`<Button>`** — the LoginPage submit button text toggles between `Sign in` and `Signing in…` while submitting. Match with `page.getByRole("button", { name: "Sign in", exact: true })` so you don't accidentally also match the loading state.
- **`<Label htmlFor="...">`** + **`<Input id="...">`** — `page.getByLabel("Email")` and `page.getByLabel("Password")` both resolve cleanly. The LoginPage uses `htmlFor="email"` / `htmlFor="password"`.
- **`aria-invalid`** — LoginPage sets `aria-invalid={errors.email ? true : undefined}`, which renders as the literal string `"true"`. So assert with `toHaveAttribute("aria-invalid", "true")`.
- **NavBar "Users" link** — `<Link to="/users">Users</Link>`. Use `page.getByRole("link", { name: "Users" })`. Absence-assertion is `toHaveCount(0)` rather than `not.toBeVisible()` (cleaner on a non-existent locator). Always pair an absence-assertion with a positive presence assertion first (e.g. user's name is visible) so you know the NavBar actually rendered.
- **NavBar "Sign out" button** — `page.getByRole("button", { name: "Sign out" })`.
- **HomePage** has an `<h1>Helpdesk</h1>` — useful sanity-check for "we're on the home page". The login Card has `<CardTitle>Sign in</CardTitle>` but it renders as a non-heading element (CardTitle uses a div), so prefer the button or the form title differently — actually the login `Sign in` heading IS rendered as a heading in this version (verify per project; in this repo `getByRole("heading", { name: "Sign in" })` works).

When asserting the login form is on the page, prefer the `Sign in` heading (CardTitle renders it via shadcn's default which is an h-tag). Verified working in `e2e/tests/auth/route-protection.spec.ts`.
