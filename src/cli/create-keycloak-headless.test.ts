import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  type Framework,
  getPackageRoot,
  scaffoldProject,
} from "./scaffold-project.js";

const FRAMEWORKS: Framework[] = ["react", "vue", "solid", "svelte"];
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createTempProjectDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "kc-headless-scaffold-"));
  tempDirs.push(dir);
  return dir;
}

describe("scaffoldProject", () => {
  const packageRoot = getPackageRoot(import.meta.url);

  it.each(FRAMEWORKS)("scaffolds a %s project with expected files", (framework) => {
    const parentDir = createTempProjectDir();
    const projectName = `test-${framework}`;
    const targetDir = join(parentDir, projectName);

    scaffoldProject({
      framework,
      projectName,
      targetDir,
      keycloakUrl: "http://localhost:8080/",
      keycloakRealm: "master",
      keycloakClientId: "example-spa",
      keycloakHeadlessVersion: "0.0.1",
      keycloakRoleCreatedVersion: "0.1.0-alpha.0",
      packageRoot,
    });

    const packageJson = readFileSync(join(targetDir, "package.json"), "utf8");
    expect(packageJson).toContain('"keycloak-headless"');
    expect(packageJson).toContain(
      '"keycloak-headless-role-created": "^0.1.0-alpha.0"',
    );
    expect(readFileSync(join(targetDir, "vite.config.ts"), "utf8")).toContain(
      "keycloakRolesPlugin",
    );
    expect(readFileSync(join(targetDir, "keycloak-roles.json"), "utf8")).toContain(
      '"realm": "master"',
    );

    const files = readdirSync(join(targetDir, "src"));
    expect(files.length).toBeGreaterThan(0);

    const allText = [
      "package.json",
      "vite.config.ts",
      ...files.map((file) => join("src", file)),
    ]
      .map((relativePath) =>
        readFileSync(join(targetDir, relativePath), "utf8"),
      )
      .join("\n");

    expect(allText).not.toContain("__PROJECT_NAME__");
    expect(allText).not.toContain("__KEYCLOAK_URL__");
    expect(allText).not.toContain("__KEYCLOAK_REALM__");
    expect(allText).not.toContain("__KEYCLOAK_CLIENT_ID__");
    expect(allText).toContain("example-spa");
    expect(allText).toContain(projectName);
  });

  it("rejects non-empty target directories", () => {
    const parentDir = createTempProjectDir();
    const targetDir = join(parentDir, "existing");

    scaffoldProject({
      framework: "react",
      projectName: "existing",
      targetDir,
      keycloakUrl: "http://localhost:8080/",
      keycloakRealm: "master",
      keycloakClientId: "example-spa",
      keycloakHeadlessVersion: "0.0.1",
      keycloakRoleCreatedVersion: "0.1.0-alpha.0",
      packageRoot,
    });

    expect(() =>
      scaffoldProject({
        framework: "react",
        projectName: "existing",
        targetDir,
        keycloakUrl: "http://localhost:8080/",
        keycloakRealm: "master",
        keycloakClientId: "example-spa",
        keycloakHeadlessVersion: "0.0.1",
        keycloakRoleCreatedVersion: "0.1.0-alpha.0",
        packageRoot,
      }),
    ).toThrow(/not empty/);
  });
});
