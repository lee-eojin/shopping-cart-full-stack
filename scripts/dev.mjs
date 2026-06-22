import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const isWindows = process.platform === "win32";
const executable = (workspace, name) =>
  resolve(rootDirectory, workspace, "node_modules", ".bin", `${name}${isWindows ? ".cmd" : ""}`);

const processes = [
  ["server", "server", executable("server", "tsx"), ["watch", "src/index.ts"]],
  ["client", "client", executable("client", "vite"), []],
].map(([name, workspace, command, args]) => ({
  name,
  child: spawn(command, args, {
    cwd: resolve(rootDirectory, workspace),
    detached: !isWindows,
    stdio: "inherit",
  }),
}));

let shuttingDown = false;
let requestedExitCode = 0;

function terminate(child, signal) {
  try {
    if (isWindows) child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

function shutdown(signal, exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  requestedExitCode = exitCode;
  processes.forEach(({ child }) => terminate(child, signal));

  setTimeout(() => process.exit(requestedExitCode), 1_000).unref();
}

for (const { name, child } of processes) {
  child.on("error", (error) => {
    console.error(`[dev] ${name} 실행 실패:`, error);
    shutdown("SIGTERM", 1);
  });

  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`[dev] ${name} 종료 (${signal ?? code ?? "unknown"})`);
      shutdown("SIGTERM", code ?? 1);
      return;
    }

    if (processes.every(({ child: candidate }) => candidate.exitCode !== null)) {
      process.exit(requestedExitCode);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT", 0));
process.on("SIGTERM", () => shutdown("SIGTERM", 0));
