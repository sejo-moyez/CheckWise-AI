import { defineConfig } from "@playwright/test";
import path from "node:path";
import os from "node:os";

const database =
  process.env.E2E_DATABASE_URL ||
  `sqlite:///${path.join(os.tmpdir(), "checkwise-e2e.sqlite3")}`;
process.env.E2E_DATABASE_URL = database;
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] }
      : {},
  },
  webServer: [
    {
      command:
        "cd ../backend && ../.venv/bin/python manage.py migrate --noinput && ../.venv/bin/python manage.py seed && ../.venv/bin/python manage.py runserver 127.0.0.1:8000 --noreload",
      url: "http://127.0.0.1:8000/api/v1/health/",
      timeout: 60000,
      reuseExistingServer: false,
      env: {
        DEBUG: "true",
        DATABASE_URL: database,
        PAYMENT_PROVIDER: "mock",
        DETECTION_PROVIDER: "mock",
        REWRITE_PROVIDER: "mock",
        CELERY_TASK_ALWAYS_EAGER: "true",
        FRONTEND_URL: "http://127.0.0.1:5173",
        FRONTEND_ORIGINS: "http://127.0.0.1:5173",
        REQUIRE_EMAIL_VERIFICATION: "true",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
    },
  ],
});
