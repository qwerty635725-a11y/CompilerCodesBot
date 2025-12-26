import { exec } from "child_process";
import fs from "fs/promises";
import crypto from "crypto";

const TMP = "./tmp";

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 3000, maxBuffer: 6 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return resolve(stderr || err.message);
      resolve(stdout || "✓ Выполнено без вывода");
    });
  });
}

export async function runJS(code) {
  const file = `${TMP}/${crypto.randomUUID()}.js`;
  await fs.writeFile(file, code);
  return run(`node ${file}`);
}

export async function runPython(code) {
  const file = `${TMP}/${crypto.randomUUID()}.py`;
  await fs.writeFile(file, code);
  return run(`python3 ${file}`);
}

export async function runCpp(code) {
  const id = crypto.randomUUID();
  const cpp = `${TMP}/${id}.cpp`;
  const out = `${TMP}/${id}`;
  await fs.writeFile(cpp, code);
  await run(`g++ ${cpp} -o ${out}`);
  return run(out);
}
