import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const serviceDir = path.join(root, "chem-service");
const win = process.platform === "win32";
const venvBin = win
  ? path.join(serviceDir, ".venv", "Scripts", "uvicorn.exe")
  : path.join(serviceDir, ".venv", "bin", "uvicorn");

const command = existsSync(venvBin) ? venvBin : win ? "py" : "python3";
const args = existsSync(venvBin)
  ? ["main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]
  : ["-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"];

const child = spawn(command, args, {
  cwd: serviceDir,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => process.exit(code ?? 1));
