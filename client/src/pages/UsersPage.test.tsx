import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import axios from "axios";
import { UsersPage } from "./UsersPage";

vi.mock("axios", () => ({
  default: { get: vi.fn() },
}));

const mockedGet = vi.mocked(axios.get);

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const sampleUsers = [
  {
    id: "u_1",
    name: "Ada Admin",
    email: "ada@test.local",
    role: "ADMIN" as const,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "u_2",
    name: "Aiden Agent",
    email: "aiden@test.local",
    role: "AGENT" as const,
    createdAt: "2025-02-15T00:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UsersPage", () => {
  it("renders the heading and column headers immediately", () => {
    mockedGet.mockReturnValueOnce(new Promise(() => {}));
    renderWithClient(<UsersPage />);

    expect(
      screen.getByRole("heading", { name: "Users" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Created" })).toBeInTheDocument();
  });

  it("shows skeleton rows while the request is pending", () => {
    mockedGet.mockReturnValueOnce(new Promise(() => {}));
    renderWithClient(<UsersPage />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("Ada Admin")).not.toBeInTheDocument();
  });

  it("renders user rows once the query resolves", async () => {
    mockedGet.mockResolvedValueOnce({ data: { users: sampleUsers } });
    renderWithClient(<UsersPage />);

    expect(await screen.findByText("Ada Admin")).toBeInTheDocument();
    expect(screen.getByText("Aiden Agent")).toBeInTheDocument();
    expect(screen.getByText("ada@test.local")).toBeInTheDocument();
    expect(screen.getByText("aiden@test.local")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(screen.getByText("AGENT")).toBeInTheDocument();

    expect(
      document.querySelectorAll('[data-slot="skeleton"]'),
    ).toHaveLength(0);
  });

  it("requests /api/users with credentials", async () => {
    mockedGet.mockResolvedValueOnce({ data: { users: sampleUsers } });
    renderWithClient(<UsersPage />);

    await screen.findByText("Ada Admin");
    expect(mockedGet).toHaveBeenCalledWith("/api/users", {
      withCredentials: true,
    });
  });

  it("shows an error alert when the request fails", async () => {
    mockedGet.mockRejectedValueOnce(new Error("Network down"));
    renderWithClient(<UsersPage />);

    expect(await screen.findByText("Network down")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
