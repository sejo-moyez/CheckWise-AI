import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

test("register → verify → sign in → simulated purchase → upload → check → private PDF", async ({
  page,
}) => {
  const email = `browser-${Date.now()}@example.com`;
  const password = "Browser-Original-Password942!";
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Alex");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const token = execFileSync(
    path.resolve("../.venv/bin/python"),
    [
      "-c",
      `import os,django;os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings');django.setup();from apps.accounts.models import User;from django.core import signing;u=User.objects.get(email='${email}');print(signing.dumps({'id':str(u.pk),'email':u.email},salt='email-verify'))`,
    ],
    {
      cwd: path.resolve("../backend"),
      env: {
        ...process.env,
        DEBUG: "true",
        DATABASE_URL: process.env.E2E_DATABASE_URL,
      },
    },
  )
    .toString()
    .trim();
  await page.goto("/verify-email?token=" + encodeURIComponent(token));
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Email verified" }),
  ).toBeVisible();
  await page.goto("/app");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("link", { name: "Buy credits", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose package", exact: true })
    .first()
    .click();
  await page.getByLabel("M-Pesa phone number").fill("0712345678");
  await page.getByRole("button", { name: "Create simulated purchase" }).click();
  await page.getByRole("button", { name: "Confirm simulated payment" }).click();
  await expect(
    page.getByText("credits were added to your wallet."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("link", { name: "New check", exact: true }).click();
  await page.getByRole("button", { name: "Upload file", exact: true }).click();
  await page.getByLabel("Document title").fill("My browser research draft");
  await page
    .getByLabel("Choose document")
    .setInputFiles({
      name: "research.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "This research draft contains original ideas and thoughtful citations for review.",
      ),
    });
  await page
    .getByRole("button", { name: "Prepare document & view cost" })
    .click();
  await expect(page.getByText("Credits to reserve")).toBeVisible();
  await page.getByRole("button", { name: "Confirm & run check" }).click();
  await expect(
    page.getByRole("heading", { name: "My browser research draft" }),
  ).toBeVisible();
  await expect(
    page
      .locator("strong")
      .filter({ hasText: "Development mock — no real detection performed" }),
  ).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(2);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const downloaded = await pending;
  expect(downloaded.suggestedFilename()).toMatch(/\.pdf$/);
  await page.getByRole("link", { name: "Credit ledger", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "purchase", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "consume", exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(page.getByText("paid", { exact: true })).toBeVisible();
});

test("mobile public navigation, responsive layout and dark mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Your ideas. Your voice. More confidence.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Pricing" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Room for your next idea." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-pricing.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
});
