#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { input, select } from "@inquirer/prompts";
import { Command } from "commander";

import {
  bootstrapKeycloak,
  printBootstrapSummary,
} from "./bootstrap-keycloak.js";
import { DEFAULT_KEYCLOAK_TIMEOUT_MS } from "./keycloak-admin.js";
import {
  type Framework,
  getPackageRoot,
  scaffoldProject,
} from "./scaffold-project.js";
import { isCliMain } from "./run-if-main.js";

const FRAMEWORKS: Framework[] = ["react", "vue", "solid", "svelte"];

const DEFAULTS = {
  projectName: "my-keycloak-app",
  keycloakUrl: "http://localhost:8080/",
  keycloakRealm: "master",
  keycloakClientId: "example-spa",
} as const;

interface CliOptions {
  framework?: Framework;
  name?: string;
  url?: string;
  realm?: string;
  clientId?: string;
  yes?: boolean;
  keycloakTimeout?: string;
  noInstall?: boolean;
  skipKeycloak?: boolean;
}

function readPackageVersion(packageRoot: string, field: string): string {
  const pkg = JSON.parse(
    readFileSync(resolve(packageRoot, "package.json"), "utf8"),
  ) as Record<string, string>;
  return pkg[field] ?? "0.0.1";
}

function readRoleCreatedVersion(packageRoot: string): string {
  const pkgPath = resolve(
    packageRoot,
    "providers/role-created-event-listener/package.json",
  );
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<
      string,
      string
    >;
    return pkg.version ?? "0.0.1";
  } catch {
    return "0.0.1";
  }
}

async function resolveOptions(
  cliOptions: CliOptions,
): Promise<{
  framework: Framework;
  projectName: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
}> {
  if (cliOptions.yes) {
    return {
      framework: cliOptions.framework ?? "react",
      projectName: cliOptions.name ?? DEFAULTS.projectName,
      keycloakUrl: cliOptions.url ?? DEFAULTS.keycloakUrl,
      keycloakRealm: cliOptions.realm ?? DEFAULTS.keycloakRealm,
      keycloakClientId: cliOptions.clientId ?? DEFAULTS.keycloakClientId,
    };
  }

  const framework =
    cliOptions.framework ??
    ((await select({
      message: "Which framework do you want to use?",
      choices: [
        { name: "React", value: "react" },
        { name: "Vue", value: "vue" },
        { name: "Solid", value: "solid" },
        { name: "Svelte", value: "svelte" },
      ],
    })) as Framework);

  const projectName =
    cliOptions.name ??
    (await input({
      message: "Project directory name",
      default: DEFAULTS.projectName,
    }));

  const keycloakUrl =
    cliOptions.url ??
    (await input({
      message: "Keycloak server URL",
      default: DEFAULTS.keycloakUrl,
    }));

  const keycloakRealm =
    cliOptions.realm ??
    (await input({
      message: "Keycloak realm",
      default: DEFAULTS.keycloakRealm,
    }));

  const keycloakClientId =
    cliOptions.clientId ??
    (await input({
      message: "Keycloak client ID",
      default: DEFAULTS.keycloakClientId,
    }));

  return { framework, projectName, keycloakUrl, keycloakRealm, keycloakClientId };
}

function printNextSteps(projectName: string, keycloakBootstrapped: boolean): void {
  console.log("\n✓ Project created successfully!\n");
  console.log("Next steps:");
  console.log(`  cd ${projectName}`);
  if (!keycloakBootstrapped) {
    console.log("  pnpm install   # or npm install / yarn");
    console.log("  pnpm run-keycloak");
  }
  console.log("  pnpm dev");
  console.log("\nOptional:");
  if (keycloakBootstrapped) {
    console.log(
      "  pnpm fetch-roles    # sync typed roles after adding custom roles in Keycloak",
    );
  } else {
    console.log("  pnpm fetch-roles    # fetch roles from a running Keycloak");
  }
}

export function buildCreateCommand(): Command {
  return new Command("create")
  .description(
    "Scaffold a new Keycloak Headless SPA from framework templates",
  )
  .option(
    "-f, --framework <framework>",
    `Framework (${FRAMEWORKS.join(", ")})`,
  )
  .option("-n, --name <name>", "Project directory name")
  .option("--url <url>", "Keycloak server URL")
  .option("--realm <realm>", "Keycloak realm")
  .option("--client-id <clientId>", "Keycloak client ID")
  .option(
    "--keycloak-timeout <ms>",
    "Max wait for Keycloak readiness",
    String(DEFAULT_KEYCLOAK_TIMEOUT_MS),
  )
  .option("--no-install", "Skip dependency install during Keycloak bootstrap")
  .option("--skip-keycloak", "Skip Keycloak bootstrap (for tests/CI)")
  .option("-y, --yes", "Use defaults and skip interactive prompts")
  .action(async (options: CliOptions) => {
    const packageRoot = getPackageRoot(import.meta.url);

    if (
      options.framework &&
      !FRAMEWORKS.includes(options.framework as Framework)
    ) {
      console.error(
        `Invalid framework "${options.framework}". Choose one of: ${FRAMEWORKS.join(", ")}`,
      );
      process.exit(1);
    }

    try {
      const resolved = await resolveOptions(options);
      const targetDir = resolve(process.cwd(), resolved.projectName);

      scaffoldProject({
        framework: resolved.framework,
        projectName: resolved.projectName,
        targetDir,
        keycloakUrl: resolved.keycloakUrl,
        keycloakRealm: resolved.keycloakRealm,
        keycloakClientId: resolved.keycloakClientId,
        keycloakHeadlessVersion: readPackageVersion(packageRoot, "version"),
        keycloakRoleCreatedVersion: readRoleCreatedVersion(packageRoot),
        packageRoot,
      });

      let keycloakBootstrapped = false;
      if (!options.skipKeycloak) {
        const timeoutMs = Number.parseInt(
          options.keycloakTimeout ?? String(DEFAULT_KEYCLOAK_TIMEOUT_MS),
          10,
        );
        const bootstrap = await bootstrapKeycloak({
          projectDir: targetDir,
          keycloakUrl: resolved.keycloakUrl,
          realm: resolved.keycloakRealm,
          clientId: resolved.keycloakClientId,
          timeoutMs: Number.isFinite(timeoutMs)
            ? timeoutMs
            : DEFAULT_KEYCLOAK_TIMEOUT_MS,
          skipInstall: options.noInstall,
        });
        printBootstrapSummary({
          projectName: resolved.projectName,
          keycloakUrl: resolved.keycloakUrl,
          realm: resolved.keycloakRealm,
          clientId: resolved.keycloakClientId,
          result: bootstrap,
        });
        keycloakBootstrapped = bootstrap.ok;
      }

      printNextSteps(resolved.projectName, keycloakBootstrapped);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n✗ Error: ${error.message}`);
      } else {
        console.error("\n✗ Unknown error:", error);
      }
      process.exit(1);
    }
  });
}

if (isCliMain(import.meta.url)) {
  buildCreateCommand().parse();
}
