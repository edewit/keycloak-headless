#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXAMPLE_KEYCLOAK_DEFAULTS,
  exampleValuesToPlaceholders,
  FRAMEWORKS,
  type Framework,
} from "../src/cli/template-placeholders.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleRoot = join(packageRoot, "example");
const templatesRoot = join(packageRoot, "templates");
const rolesFixtureSource = join(
  packageRoot,
  "scripts",
  "fixtures",
  "master-roles.json",
);

const SKIP_DIRS = new Set(["node_modules", "dist"]);
const SKIP_FILES = new Set(["src/keycloak-config.generated.ts"]);

const CONSUMER_VITE_CONFIGS: Record<Framework, string> = {
  react: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { oidcSpa } from "oidc-spa/vite-plugin";
import { resolve } from "node:path";

import { keycloakRolesPlugin } from "keycloak-headless/vite";

export default defineConfig({
  plugins: [
    react(),
    oidcSpa(),
    keycloakRolesPlugin({
      input: resolve(__dirname, "keycloak-roles.json"),
      output: resolve(__dirname, "src/keycloak-config.generated.ts"),
    }),
  ],
});
`,
  vue: `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { oidcSpa } from "oidc-spa/vite-plugin";
import { resolve } from "node:path";

import { keycloakRolesPlugin } from "keycloak-headless/vite";

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("kc-"),
        },
      },
    }),
    oidcSpa(),
    keycloakRolesPlugin({
      input: resolve(__dirname, "keycloak-roles.json"),
      output: resolve(__dirname, "src/keycloak-config.generated.ts"),
    }),
  ],
});
`,
  solid: `import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { oidcSpa } from "oidc-spa/vite-plugin";
import { resolve } from "node:path";

import { keycloakRolesPlugin } from "keycloak-headless/vite";

export default defineConfig({
  plugins: [
    solid(),
    oidcSpa(),
    keycloakRolesPlugin({
      input: resolve(__dirname, "keycloak-roles.json"),
      output: resolve(__dirname, "src/keycloak-config.generated.ts"),
    }),
  ],
});
`,
  svelte: `import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { oidcSpa } from "oidc-spa/vite-plugin";
import { resolve } from "node:path";

import { keycloakRolesPlugin } from "keycloak-headless/vite";

export default defineConfig({
  plugins: [
    svelte(),
    oidcSpa(),
    keycloakRolesPlugin({
      input: resolve(__dirname, "keycloak-roles.json"),
      output: resolve(__dirname, "src/keycloak-config.generated.ts"),
    }),
  ],
});
`,
};

function transformPackageJson(content: string): string {
  const pkg = JSON.parse(content) as {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  pkg.name = "__PROJECT_NAME__";

  if (pkg.dependencies?.["keycloak-headless"] === "workspace:*") {
    pkg.dependencies["keycloak-headless"] = "^__KEYCLOAK_HEADLESS_VERSION__";
  }

  if (pkg.dependencies?.["oidc-spa"] != null) {
    pkg.dependencies["oidc-spa"] = "^10.2.3";
  }

  if (pkg.devDependencies?.["keycloak-headless-role-created"] === "workspace:*") {
    pkg.devDependencies["keycloak-headless-role-created"] =
      "^__KEYCLOAK_ROLE_CREATED_VERSION__";
  }

  for (const [scriptName, scriptValue] of Object.entries(pkg.scripts ?? {})) {
    let script = scriptValue;
    script = script.replaceAll(
      `--realm ${EXAMPLE_KEYCLOAK_DEFAULTS.keycloakRealm}`,
      "--realm __KEYCLOAK_REALM__",
    );
    script = script.replaceAll(
      "/tmp/keycloak-role-exports/master-roles.json",
      "./keycloak-roles.json",
    );
    script = script.replaceAll(
      "--spi-events-listener--headless-role-created--export-directory=/tmp/keycloak-role-exports",
      "--spi-events-listener--headless-role-created--export-directory=.",
    );
    pkg.scripts![scriptName] = script;
  }

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function transformAppFile(content: string, framework: Framework): string {
  return exampleValuesToPlaceholders(content, framework);
}

function transformFile(
  relativePath: string,
  content: string,
  framework: Framework,
): string {
  if (relativePath === "package.json") {
    return transformPackageJson(content);
  }

  if (
    relativePath === "src/App.tsx" ||
    relativePath === "src/App.vue" ||
    relativePath === "src/App.svelte"
  ) {
    return transformAppFile(content, framework);
  }

  return content;
}

function shouldSkipRelativePath(relativePath: string): boolean {
  const parts = relativePath.split("/");
  if (parts.some((part) => SKIP_DIRS.has(part))) {
    return true;
  }
  return SKIP_FILES.has(relativePath);
}

function walkExampleFiles(framework: Framework): string[] {
  const sourceDir = join(exampleRoot, framework);
  const files: string[] = [];

  function walk(currentDir: string): void {
    for (const entry of readdirSync(currentDir)) {
      const absolutePath = join(currentDir, entry);
      const relativePath = relative(sourceDir, absolutePath).replaceAll(
        "\\",
        "/",
      );

      if (shouldSkipRelativePath(relativePath)) {
        continue;
      }

      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (relativePath === "vite.config.ts") {
        continue;
      }

      files.push(relativePath);
    }
  }

  walk(sourceDir);
  return files.sort();
}

function generateRolesFixture(): string {
  const fixture = readFileSync(rolesFixtureSource, "utf8");
  return fixture
    .replaceAll(
      `"realm": "${EXAMPLE_KEYCLOAK_DEFAULTS.keycloakRealm}"`,
      '"realm": "__KEYCLOAK_REALM__"',
    )
    .replaceAll(
      `"${EXAMPLE_KEYCLOAK_DEFAULTS.keycloakClientId}"`,
      '"__KEYCLOAK_CLIENT_ID__"',
    );
}

function writeGeneratedTemplates(outputRoot: string): void {
  for (const framework of FRAMEWORKS) {
    const sourceDir = join(exampleRoot, framework);
    const targetDir = join(outputRoot, framework);

    if (!existsSync(sourceDir)) {
      throw new Error(`Example directory not found: ${sourceDir}`);
    }

    for (const relativePath of walkExampleFiles(framework)) {
      const sourcePath = join(sourceDir, relativePath);
      const targetPath = join(targetDir, relativePath);
      mkdirSync(dirname(targetPath), { recursive: true });

      const sourceContent = readFileSync(sourcePath, "utf8");
      writeFileSync(
        targetPath,
        transformFile(relativePath, sourceContent, framework),
        "utf8",
      );
    }

    writeFileSync(
      join(targetDir, "vite.config.ts"),
      CONSUMER_VITE_CONFIGS[framework],
      "utf8",
    );
  }

  const fixtureTarget = join(outputRoot, "fixtures", "master-roles.json");
  mkdirSync(dirname(fixtureTarget), { recursive: true });
  writeFileSync(fixtureTarget, generateRolesFixture(), "utf8");
}

function listFilesRecursively(rootDir: string, currentDir = rootDir): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(currentDir)) {
    const absolutePath = join(currentDir, entry);
    const relativePath = relative(rootDir, absolutePath).replaceAll("\\", "/");

    if (statSync(absolutePath).isDirectory()) {
      files.push(...listFilesRecursively(rootDir, absolutePath));
      continue;
    }

    files.push(relativePath);
  }

  return files.sort();
}

function assertTemplatesMatch(outputRoot: string): void {
  const expectedFiles = listFilesRecursively(outputRoot);
  const actualFiles = listFilesRecursively(templatesRoot);
  const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
  const extra = actualFiles.filter((file) => !expectedFiles.includes(file));

  if (missing.length > 0 || extra.length > 0) {
    const details = [
      missing.length > 0 ? `missing: ${missing.join(", ")}` : "",
      extra.length > 0 ? `extra: ${extra.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    throw new Error(`Template file set drifted (${details}).`);
  }

  for (const relativePath of expectedFiles) {
    const expected = readFileSync(join(outputRoot, relativePath), "utf8");
    const actual = readFileSync(join(templatesRoot, relativePath), "utf8");
    if (expected !== actual) {
      throw new Error(`Template drift detected in ${relativePath}.`);
    }
  }
}

function syncTemplates(checkOnly: boolean): void {
  const tempRoot = mkdtempSync(join(tmpdir(), "kc-headless-templates-"));

  try {
    writeGeneratedTemplates(tempRoot);

    if (checkOnly) {
      assertTemplatesMatch(tempRoot);
      console.log("Templates are in sync with examples.");
      return;
    }

    rmSync(templatesRoot, { recursive: true, force: true });
    cpSync(tempRoot, templatesRoot, { recursive: true });
    console.log("Synced templates from examples.");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const checkOnly = process.argv.includes("--check");

try {
  syncTemplates(checkOnly);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    checkOnly
      ? `Template sync check failed: ${message}\nRun "pnpm sync-templates" to update templates/.`
      : `Template sync failed: ${message}`,
  );
  process.exit(1);
}
