import { existsSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

import {
  DEFAULT_KEYCLOAK_BASE_URL,
  DEFAULT_KEYCLOAK_TIMEOUT_MS,
  isKeycloakServerUp,
  normalizeKeycloakBaseUrl,
  waitForKeycloakServer,
} from "./keycloak-admin.js";

export interface InstallDependenciesResult {
  ok: boolean;
  command: string;
  message?: string;
}

export interface StartKeycloakRunnerResult {
  started: boolean;
  reusedExisting: boolean;
  pid?: number;
  baseUrl: string;
}

export function resolvePackageManager(): "pnpm" | "npm" {
  const pnpm = spawnSync("pnpm", ["--version"], { stdio: "ignore" });
  if (pnpm.status === 0) {
    return "pnpm";
  }
  return "npm";
}

export function installProjectDependencies(
  projectDir: string,
): InstallDependenciesResult {
  const pm = resolvePackageManager();
  const args = pm === "pnpm" ? ["install"] : ["install"];
  const result = spawnSync(pm, args, {
    cwd: projectDir,
    stdio: "inherit",
  });

  if (result.status === 0) {
    return { ok: true, command: `${pm} ${args.join(" ")}` };
  }

  return {
    ok: false,
    command: `${pm} ${args.join(" ")}`,
    message: `${pm} install failed with exit code ${result.status ?? "unknown"}`,
  };
}

function resolveKeycloakRunnerBin(projectDir: string): string {
  const localBin = join(
    projectDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "keycloak-runner.cmd" : "keycloak-runner",
  );
  if (!existsSync(localBin)) {
    throw new Error(
      `keycloak-runner not found at ${localBin}. Run dependency install first.`,
    );
  }
  return localBin;
}

function buildKeycloakRunnerArgs(
  projectDir: string,
  realm: string,
  timeoutMs: number,
): string[] {
  const providerJar = join(
    projectDir,
    "node_modules",
    "keycloak-headless-role-created",
    "target",
    "role-created-event-listener.jar",
  );

  if (!existsSync(providerJar)) {
    throw new Error(
      `Role export provider JAR not found at ${providerJar}.`,
    );
  }

  return [
    "-p",
    providerJar,
    "--realm",
    realm,
    "--keycloak-url",
    DEFAULT_KEYCLOAK_BASE_URL,
    "--ready-timeout",
    String(timeoutMs),
    "--patch",
    JSON.stringify({
      adminEventsEnabled: true,
      eventsListeners: ["headless-role-created"],
    }),
    "--",
    `--spi-events-listener--headless-role-created--export-directory=${projectDir}`,
  ];
}

export async function startKeycloakRunner(options: {
  projectDir: string;
  realm: string;
  baseUrl?: string;
  timeoutMs?: number;
}): Promise<StartKeycloakRunnerResult> {
  const baseUrl = normalizeKeycloakBaseUrl(
    options.baseUrl ?? DEFAULT_KEYCLOAK_BASE_URL,
  );
  const timeoutMs = options.timeoutMs ?? DEFAULT_KEYCLOAK_TIMEOUT_MS;

  if (await isKeycloakServerUp(baseUrl)) {
    console.log(`Using existing Keycloak at ${baseUrl}`);
    return {
      started: false,
      reusedExisting: true,
      baseUrl,
    };
  }

  const runnerBin = resolveKeycloakRunnerBin(options.projectDir);
  const args = buildKeycloakRunnerArgs(
    resolve(options.projectDir),
    options.realm,
    timeoutMs,
  );

  console.log(`Starting Keycloak via keycloak-runner at ${baseUrl}...`);
  const child = spawn(runnerBin, args, {
    cwd: options.projectDir,
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  if (child.pid == null) {
    throw new Error("Failed to start keycloak-runner (no PID returned).");
  }

  writeFileSync(
    join(options.projectDir, ".keycloak-runner.pid"),
    String(child.pid),
    "utf8",
  );

  await waitForKeycloakServer(baseUrl, timeoutMs);

  return {
    started: true,
    reusedExisting: false,
    pid: child.pid,
    baseUrl,
  };
}
