import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import axios from "axios";
import { StatusPage } from "./StatusPage";

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

const healthData = { status: "ok", uptime: 1234 };
const dbHealthData = { status: "ok", db: "postgres" };

type GetArgs = Parameters<typeof axios.get>;
function routeMock(handlers: Record<string, () => Promise<unknown>>) {
  mockedGet.mockImplementation((...args: GetArgs) => {
    const url = args[0] as string;
    const handler = handlers[url];
    if (!handler) throw new Error(`Unexpected URL: ${url}`);
    return handler() as ReturnType<typeof axios.get>;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StatusPage", () => {
  it("renders the page heading and both card titles immediately", () => {
    routeMock({
      "/api/health": () => new Promise(() => {}),
      "/api/db-health": () => new Promise(() => {}),
    });
    renderWithClient(<StatusPage />);

    expect(
      screen.getByRole("heading", { name: "Status" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Server status")).toBeInTheDocument();
    expect(screen.getByText("DB status")).toBeInTheDocument();
    expect(screen.getByText("GET /api/health")).toBeInTheDocument();
    expect(screen.getByText("GET /api/db-health")).toBeInTheDocument();
  });

  it("shows skeletons in both cards while the requests are pending", () => {
    routeMock({
      "/api/health": () => new Promise(() => {}),
      "/api/db-health": () => new Promise(() => {}),
    });
    renderWithClient(<StatusPage />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    // each card renders 2 skeletons (title bar + body block)
    expect(skeletons.length).toBe(4);
    expect(screen.queryByText(/uptime/)).not.toBeInTheDocument();
  });

  it("renders the JSON payload and status badge for each card on success", async () => {
    routeMock({
      "/api/health": () => Promise.resolve({ data: healthData }),
      "/api/db-health": () => Promise.resolve({ data: dbHealthData }),
    });
    renderWithClient(<StatusPage />);

    const serverCard = (await screen.findByText("Server status")).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    const dbCard = screen
      .getByText("DB status")
      .closest('[data-slot="card"]') as HTMLElement;

    expect(serverCard).not.toBeNull();
    expect(dbCard).not.toBeNull();

    await within(serverCard).findByText(/"uptime": 1234/);
    expect(within(serverCard).getByText("ok")).toBeInTheDocument();

    await within(dbCard).findByText(/"db": "postgres"/);
    expect(within(dbCard).getByText("ok")).toBeInTheDocument();

    expect(
      document.querySelectorAll('[data-slot="skeleton"]'),
    ).toHaveLength(0);
  });

  it("requests /api/health and /api/db-health", async () => {
    routeMock({
      "/api/health": () => Promise.resolve({ data: healthData }),
      "/api/db-health": () => Promise.resolve({ data: dbHealthData }),
    });
    renderWithClient(<StatusPage />);

    await screen.findByText(/"uptime": 1234/);
    expect(mockedGet).toHaveBeenCalledWith("/api/health");
    expect(mockedGet).toHaveBeenCalledWith("/api/db-health");
  });

  it("renders an error alert in only the failing card", async () => {
    routeMock({
      "/api/health": () => Promise.reject(new Error("Server unreachable")),
      "/api/db-health": () => Promise.resolve({ data: dbHealthData }),
    });
    renderWithClient(<StatusPage />);

    const serverCard = (
      await screen.findByText("Server unreachable")
    ).closest('[data-slot="card"]') as HTMLElement;
    expect(serverCard).not.toBeNull();
    expect(within(serverCard).getByText("Error")).toBeInTheDocument();

    const dbCard = screen
      .getByText("DB status")
      .closest('[data-slot="card"]') as HTMLElement;
    await within(dbCard).findByText(/"db": "postgres"/);
    expect(within(dbCard).queryByText("Error")).not.toBeInTheDocument();
  });

  it("keeps a card in skeleton state while its request is still pending", async () => {
    routeMock({
      "/api/health": () => Promise.resolve({ data: healthData }),
      "/api/db-health": () => new Promise(() => {}),
    });
    renderWithClient(<StatusPage />);

    const serverCard = (await screen.findByText("Server status")).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    const dbCard = screen
      .getByText("DB status")
      .closest('[data-slot="card"]') as HTMLElement;

    await within(serverCard).findByText(/"uptime": 1234/);
    expect(within(serverCard).queryAllByRole("status")).toHaveLength(0);
    expect(
      within(serverCard).queryAllByText((_, el) =>
        el?.getAttribute("data-slot") === "skeleton",
      ),
    ).toHaveLength(0);

    expect(
      within(dbCard).getAllByText((_, el) =>
        el?.getAttribute("data-slot") === "skeleton",
      ).length,
    ).toBeGreaterThan(0);
  });
});
