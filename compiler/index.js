import { exec } from "child_process";
import fs from "fs/promises";
import crypto from "crypto";

const TMP = "/tmp/sandbox";

function run(cmd, limited) {
  return new Promise((resolve) => {
    const fullCmd = limited
      ? `ulimit -v 6144; ulimit -t 2; ${cmd}`
      : cmd;

    exec(
      fullCmd,
      { shell: "/bin/bash", timeout: limited ? 3000 : 0, maxBuffer: limited ? 6 * 1024 * 1024 : 50 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return resolve(stderr || err.message);
        resolve(stdout || "✓ Выполнено");
      }
    );
  });
}

export async function runJS(code, isOwner) {
  const file = `${TMP}/${crypto.randomUUID()}.js`;
  await fs.writeFile(file, code);
  return run(`node ${file}`, !isOwner);
}

export async function runPython(code, isOwner) {
  const file = `${TMP}/${crypto.randomUUID()}.py`;
  await fs.writeFile(file, code);
  return run(`python3 ${file}`, !isOwner);
}

export async function runCpp(code, isOwner) {
  const id = crypto.randomUUID();
  const cpp = `${TMP}/${id}.cpp`;
  const bin = `${TMP}/${id}`;
  await fs.writeFile(cpp, code);
  await run(`g++ ${cpp} -o ${bin}`, !isOwner);
  return run(bin, !isOwner);
}
