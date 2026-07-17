import { mkdir, readFile, chmod, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import bcrypt from "bcryptjs";

if (process.argv[2] !== "--set") {
  console.error("Uso: pnpm document:password --set");
  process.exit(1);
}

if (process.platform !== "win32" && process.getuid?.() !== 0) {
  console.error("Este comando debe ejecutarse como root.");
  process.exit(1);
}

const envFile = process.env.VAGACIONES_PRODUCTION_ENV || "/root/.config/vagaciones/production.env";
const password = await readSecret("Nueva contraseña documental: ");
const confirmation = await readSecret("Repetí la contraseña: ");

if (password.length < 10) throw new Error("La contraseña debe tener al menos 10 caracteres.");
if (password !== confirmation) throw new Error("Las contraseñas no coinciden.");

const hash = await bcrypt.hash(password, 12);
const current = await readFile(envFile, "utf8").catch(() => "");
const lines = current.split(/\r?\n/).filter((line) => line && !/^DOCUMENT_ACCESS_PASSWORD_HASH=/.test(line));
lines.push(`DOCUMENT_ACCESS_PASSWORD_HASH=${hash}`);
const directory = path.dirname(envFile);
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
await writeFile(envFile, `${lines.join("\n")}\n`, { mode: 0o600 });
await chmod(envFile, 0o600);
console.log(`Contraseña documental configurada en ${envFile}.`);

function readSecret(prompt) {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    let value = "";
    output.write(prompt);
    readline.emitKeypressEvents(input);
    input.setRawMode?.(true);
    const onKey = (chunk, key = {}) => {
      if (key.name === "return" || key.name === "enter") {
        input.setRawMode?.(false);
        input.off("keypress", onKey);
        output.write("\n");
        resolve(value);
      } else if (key.name === "backspace") {
        value = value.slice(0, -1);
      } else if (chunk && !key.ctrl && !key.meta) {
        value += chunk.toString();
      }
    };
    input.on("keypress", onKey);
  });
}
