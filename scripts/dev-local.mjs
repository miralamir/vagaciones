import { spawn } from "node:child_process";

if (!process.env.DOCUMENT_STORAGE?.trim()) {
  console.error("DOCUMENT_STORAGE no esta configurada. Define una ruta privada antes de iniciar VAGACIONES.");
  process.exit(1);
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(command, ["dev"], { stdio: "inherit", shell: process.platform === "win32" });
child.on("close", (code) => { process.exitCode = code ?? 1; });
