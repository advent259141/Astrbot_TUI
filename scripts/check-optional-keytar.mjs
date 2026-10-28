import { randomUUID } from "node:crypto";
import { rename } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const keytar = fileURLToPath(new URL("../node_modules/keytar", import.meta.url));
const backup = `${keytar}.optional-check-${randomUUID()}`;
let moved = false;

try {
  await rename(keytar, backup);
  moved = true;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

try {
  const typecheck = spawnSync(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", "tsconfig.json", "--noEmit"], { cwd: root, stdio: "inherit" });
  if (typecheck.error) throw typecheck.error;
  if (typecheck.status !== 0) throw new Error("Typecheck failed without optional keytar.");

  // Use a fresh process so a previously loaded native module cannot mask missing-addon errors.
  const fallback = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { createTokenStore } from './dist/auth/tokenStore.js';
    const store = await createTokenStore();
    if (store.kind !== 'file') throw new Error('Expected file token-store fallback.');
    console.log('Build types and file fallback work without optional keytar.');
  `], { cwd: root, stdio: "inherit" });
  if (fallback.error) throw fallback.error;
  if (fallback.status !== 0) throw new Error("File token-store fallback failed.");
} finally {
  if (moved) await rename(backup, keytar);
}
