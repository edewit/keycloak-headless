import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("sync-templates", () => {
  it("keeps committed templates aligned with examples", () => {
    expect(() => {
      execSync("pnpm sync-templates:check", {
        cwd: packageRoot,
        stdio: "pipe",
        encoding: "utf8",
      });
    }).not.toThrow();
  });
});
