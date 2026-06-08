import {
  DEFAULT_KEYCLOAK_TIMEOUT_MS,
  ensureSpaClient,
  normalizeKeycloakBaseUrl,
  resolveAdminCredentials,
  type SpaClientStatus,
} from "./keycloak-admin.js";
import {
  installProjectDependencies,
  startKeycloakRunner,
  type StartKeycloakRunnerResult,
} from "./start-keycloak-runner.js";

export interface BootstrapKeycloakOptions {
  projectDir: string;
  keycloakUrl: string;
  realm: string;
  clientId: string;
  timeoutMs?: number;
  skipInstall?: boolean;
}

export interface BootstrapKeycloakResult {
  ok: boolean;
  clientStatus?: SpaClientStatus;
  runner?: StartKeycloakRunnerResult;
  warning?: string;
}

export async function bootstrapKeycloak(
  options: BootstrapKeycloakOptions,
): Promise<BootstrapKeycloakResult> {
  const baseUrl = normalizeKeycloakBaseUrl(options.keycloakUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_KEYCLOAK_TIMEOUT_MS;

  try {
    if (!options.skipInstall) {
      console.log("\nInstalling project dependencies...");
      const install = installProjectDependencies(options.projectDir);
      if (!install.ok) {
        return {
          ok: false,
          warning: install.message ?? "Dependency install failed.",
        };
      }
    }

    const runner = await startKeycloakRunner({
      projectDir: options.projectDir,
      realm: options.realm,
      baseUrl,
      timeoutMs,
    });

    console.log(`Ensuring public SPA client "${options.clientId}" exists...`);
    const credentials = resolveAdminCredentials();
    const clientStatus = await ensureSpaClient({
      baseUrl,
      realm: options.realm,
      clientId: options.clientId,
      credentials,
    });

    return {
      ok: true,
      clientStatus,
      runner,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Keycloak bootstrap error.";
    return {
      ok: false,
      warning: message,
    };
  }
}

export function printBootstrapSummary(options: {
  projectName: string;
  keycloakUrl: string;
  realm: string;
  clientId: string;
  result: BootstrapKeycloakResult;
}): void {
  if (!options.result.ok) {
    console.warn(
      `\n⚠ Keycloak bootstrap failed: ${options.result.warning ?? "unknown error"}`,
    );
    console.warn(
      "The project was created. You can start Keycloak manually with:",
    );
    console.warn(`  cd ${options.projectName}`);
    console.warn("  pnpm run-keycloak");
    return;
  }

  const credentials = resolveAdminCredentials();
  const baseUrl = normalizeKeycloakBaseUrl(options.keycloakUrl);

  console.log("\n✓ Keycloak bootstrap complete");
  console.log(`  Server: ${baseUrl}`);
  console.log(`  Realm: ${options.realm}`);
  console.log(`  Client: ${options.clientId} (${options.result.clientStatus})`);
  console.log(`  Admin user: ${credentials.username}`);

  if (options.result.runner?.pid != null) {
    console.log(`  Keycloak PID: ${options.result.runner.pid}`);
    console.log(`  Stop Keycloak: kill ${options.result.runner.pid}`);
  } else if (options.result.runner?.reusedExisting) {
    console.log("  Reused an existing Keycloak instance on port 8080");
  }
}
