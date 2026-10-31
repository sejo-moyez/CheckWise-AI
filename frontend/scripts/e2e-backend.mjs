import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const backend = path.resolve("../backend");
const python = path.resolve(
  "../.venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
for (const args of [["migrate", "--noinput"], ["seed"]]) {
  const result = spawnSync(python, ["manage.py", ...args], {
    cwd: backend,
    stdio: "inherit",
  });
  if (result.error) {
    console.error("Unable to start Python. Run bash scripts/install.sh first.");
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const server = spawn(
  python,
  ["manage.py", "runserver", "127.0.0.1:8000", "--noreload"],
  { cwd: backend, stdio: "inherit" },
);
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("error", () => process.exit(1));
server.on("exit", (code) => process.exit(code ?? 0));
