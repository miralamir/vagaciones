import { createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const log = createWriteStream("build.full.log", { flags: "w" });
const started = performance.now();
let maxRss = process.memoryUsage().rss;

const child = spawn(process.platform === "win32" ? "pnpm.cmd build" : "pnpm build", [], {
  shell: true,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: "--max-old-space-size=4096" }
});

const write = (chunk) => { process.stdout.write(chunk); log.write(chunk); };
child.stdout.on("data", write);
child.stderr.on("data", write);
const memoryTimer = setInterval(() => { maxRss = Math.max(maxRss, process.memoryUsage().rss); }, 500);

child.on("close", (code, signal) => {
  clearInterval(memoryTimer);
  const durationMs = Math.round(performance.now() - started);
  const summary = `\nBUILD_DIAGNOSTIC exitCode=${code ?? "null"} signal=${signal ?? "none"} durationMs=${durationMs} wrapperMaxRssMiB=${Math.round(maxRss / 1024 / 1024)}\n`;
  write(summary);
  log.end(() => process.exitCode = code ?? 1);
});
