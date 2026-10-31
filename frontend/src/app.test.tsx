import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthPage, registrationSchema } from "./auth";
import { FileUploader, safeSource, CreditLedger } from "./workspace";
import { api, csrfToken } from "./api";

const login = vi.fn();
vi.mock("./state", () => ({
  useAuth: () => ({ user: null, loading: false, login, logout: vi.fn() }),
  useToast: () => vi.fn(),
  useConfig: () => ({ data: { brand: "CheckWise AI" } }),
}));
function wrapper(node: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={node} />
          <Route path="/app" element={<h1>Workspace</h1>} />
          <Route path="/register" element={<h1>Create account</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => vi.restoreAllMocks());
it("refreshes the CSRF token after a separate admin session rotates its cookie", async () => {
  vi.spyOn(api, "get")
    .mockResolvedValueOnce({ data: { csrf: "before-admin-login" } })
    .mockResolvedValueOnce({ data: { csrf: "after-admin-login" } });
  expect(await csrfToken()).toBe("before-admin-login");
  expect(await csrfToken()).toBe("after-admin-login");
});
describe("Account forms", () => {
  it("rejects weak passwords and malformed email", () => {
    expect(
      registrationSchema.safeParse({
        email: "wrong",
        password: "short",
        first_name: "A",
        referral_code: "",
      }).success,
    ).toBe(false);
  });
  it("validates login before making a request", async () => {
    wrapper(<AuthPage />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeVisible();
    expect(login).not.toHaveBeenCalled();
  });
  it("submits credentials and navigates to the protected workspace", async () => {
    login.mockResolvedValue(undefined);
    wrapper(<AuthPage />);
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "writer@example.com",
    );
    await userEvent.type(screen.getByLabelText("Password"), "My-password123!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByRole("heading", { name: "Workspace" }),
    ).toBeVisible();
    expect(login).toHaveBeenCalledWith("writer@example.com", "My-password123!");
  });
  it("supports navigation to registration", async () => {
    wrapper(<AuthPage />);
    await userEvent.click(
      screen.getByRole("link", { name: "Create an account" }),
    );
    expect(
      screen.getByRole("heading", { name: "Create account" }),
    ).toBeVisible();
  });
});
describe("Documents and API data", () => {
  it("rejects unsupported file types", () => {
    const select = vi.fn();
    render(<FileUploader file={null} setFile={select} />);
    fireEvent.change(screen.getByLabelText("Choose document"), {
      target: { files: [new File(["bad"], "bad.exe")] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("PDF, DOCX or TXT");
    expect(select).not.toHaveBeenCalled();
  });
  it("accepts supported uploads", () => {
    const select = vi.fn();
    render(<FileUploader file={null} setFile={select} />);
    const file = new File(["A draft"], "draft.txt");
    fireEvent.change(screen.getByLabelText("Choose document"), {
      target: { files: [file] },
    });
    expect(select).toHaveBeenCalledWith(file);
  });
  it("renders actual ledger API records", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: {
        count: 1,
        results: [
          {
            id: "one",
            kind: "purchase",
            amount: "5.00",
            reserved_delta: "0.00",
            balance_after: "5.00",
            created_at: "2026-10-31",
            reference: "payment:one",
            note: "",
          },
        ],
      },
    });
    wrapper(<CreditLedger />);
    await waitFor(() => expect(screen.getByText("purchase")).toBeVisible());
    expect(screen.getByText("+5.00")).toBeVisible();
  });
  it("blocks unsafe source link schemes", () => {
    expect(safeSource("javascript:alert(1)")).toBe("#");
    expect(safeSource("https://example.com/source")).toBe(
      "https://example.com/source",
    );
  });
});
