import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import axios from "axios";
import { CreateUserDialog, validate } from "./CreateUserDialog";

vi.mock("axios", () => ({
  default: { post: vi.fn(), isAxiosError: vi.fn() },
}));

const mockedPost = vi.mocked(axios.post);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreateUserDialog", () => {
  it("dialog is not visible on initial render", () => {
    renderWithClient(<CreateUserDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the dialog when the Create User button is clicked", async () => {
    const user = userEvent.setup();
    renderWithClient(<CreateUserDialog />);

    await user.click(screen.getByRole("button", { name: "Create User" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("hides the dialog when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderWithClient(<CreateUserDialog />);

    await user.click(screen.getByRole("button", { name: "Create User" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides the dialog when clicking outside", async () => {
    const user = userEvent.setup();
    renderWithClient(<CreateUserDialog />);

    await user.click(screen.getByRole("button", { name: "Create User" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).toBeInTheDocument();
    await user.click(overlay!);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  renderWithClient(<CreateUserDialog />);
  await user.click(screen.getByRole("button", { name: "Create User" }));
}

describe("CreateUserDialog — form validation", () => {
  it("shows all three validation errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    await openDialog(user);

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create User" }));

    expect(await screen.findByText("Name must be at least 3 characters")).toBeInTheDocument();
    expect(screen.getByText("Valid email is required")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  it("marks invalid fields with aria-invalid after a failed submit", async () => {
    const user = userEvent.setup();
    await openDialog(user);

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create User" }));

    await screen.findByText("Name must be at least 3 characters");
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  });

  it("clears a field's error as the user types a valid value", async () => {
    const user = userEvent.setup();
    await openDialog(user);

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create User" }));
    await screen.findByText("Name must be at least 3 characters");

    await user.type(screen.getByLabelText("Name"), "Jane Smith");

    expect(screen.queryByText("Name must be at least 3 characters")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "false");
    // other errors remain
    expect(screen.getByText("Valid email is required")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  it("does not show errors before the first submit attempt", async () => {
    const user = userEvent.setup();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "ab");

    expect(screen.queryByText("Name must be at least 3 characters")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "false");
  });

  it("calls axios.post with the form data and credentials on a valid submission", async () => {
    mockedPost.mockResolvedValueOnce({ data: { user: {} } });
    const user = userEvent.setup();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Jane Smith");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "securepass");

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create User" }));

    expect(mockedPost).toHaveBeenCalledWith(
      "/api/users",
      { name: "Jane Smith", email: "jane@example.com", password: "securepass" },
      { withCredentials: true },
    );
  });

  it("shows 'Creating…' on the submit button while the request is in flight", async () => {
    mockedPost.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Jane Smith");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "securepass");

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create User" }));

    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
  });

  it("closes the dialog on successful submission", async () => {
    mockedPost.mockResolvedValueOnce({ data: { user: {} } });
    const user = userEvent.setup();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Jane Smith");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "securepass");

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create User" }));

    expect(await screen.findByRole("button", { name: "Create User" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a server error message when the request fails with an API error", async () => {
    const apiError = { message: "Request failed", response: { data: { error: "A user with that email already exists" } } };
    mockedPost.mockRejectedValueOnce(apiError);
    mockedIsAxiosError.mockReturnValue(true);

    const user = userEvent.setup();
    await openDialog(user);

    await user.type(screen.getByLabelText("Name"), "Jane Smith");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "securepass");

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create User" }));

    expect(await screen.findByText("A user with that email already exists")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("validate", () => {
  const valid = { name: "Jane Smith", email: "jane@example.com", password: "securepass" };

  describe("name", () => {
    it("passes when name is exactly 3 characters", () => {
      expect(validate({ ...valid, name: "Jan" }).name).toBeUndefined();
    });

    it("passes when name is longer than 3 characters", () => {
      expect(validate({ ...valid, name: "Jane Smith" }).name).toBeUndefined();
    });

    it("fails when name is 2 characters", () => {
      expect(validate({ ...valid, name: "Jo" }).name).toBe("Name must be at least 3 characters");
    });

    it("fails when name is empty", () => {
      expect(validate({ ...valid, name: "" }).name).toBe("Name must be at least 3 characters");
    });

    it("trims whitespace before checking length", () => {
      expect(validate({ ...valid, name: "  a  " }).name).toBe("Name must be at least 3 characters");
    });
  });

  describe("email", () => {
    it("passes when email contains an @ symbol", () => {
      expect(validate({ ...valid, email: "user@example.com" }).email).toBeUndefined();
    });

    it("fails when email has no @ symbol", () => {
      expect(validate({ ...valid, email: "notanemail" }).email).toBe("Valid email is required");
    });

    it("fails when email is empty", () => {
      expect(validate({ ...valid, email: "" }).email).toBe("Valid email is required");
    });
  });

  describe("password", () => {
    it("passes when password is exactly 8 characters", () => {
      expect(validate({ ...valid, password: "12345678" }).password).toBeUndefined();
    });

    it("passes when password is longer than 8 characters", () => {
      expect(validate({ ...valid, password: "verylongpassword" }).password).toBeUndefined();
    });

    it("fails when password is 7 characters", () => {
      expect(validate({ ...valid, password: "1234567" }).password).toBe("Password must be at least 8 characters");
    });

    it("fails when password is empty", () => {
      expect(validate({ ...valid, password: "" }).password).toBe("Password must be at least 8 characters");
    });
  });

  it("returns no errors for a fully valid form", () => {
    expect(validate(valid)).toEqual({});
  });
});
