import {
  DEFAULT_KEYCLOAK_TIMEOUT_MS,
  ensureRealm,
  ensureRealmUser,
  ensureSpaClient,
  normalizeKeycloakBaseUrl,
  resolveAdminCredentials,
  resolveRealmUserCredentials,
  type RealmStatus,
  type RealmUserStatus,
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
  realmStatus?: RealmStatus;
  realmUserStatus?: RealmUserStatus;
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

    const credentials = resolveAdminCredentials();

    console.log(`Ensuring realm "${options.realm}" exists...`);
    const realmStatus = await ensureRealm({
      baseUrl,
      realm: options.realm,
      credentials,
    });

    const realmUser = resolveRealmUserCredentials();
    console.log(`Ensuring realm user "${realmUser.username}" exists...`);
    const realmUserStatus = await ensureRealmUser({
      baseUrl,
      realm: options.realm,
      credentials,
      user: realmUser,
    });

    console.log(`Ensuring public SPA client "${options.clientId}" exists...`);
    const clientStatus = await ensureSpaClient({
      baseUrl,
      realm: options.realm,
      clientId: options.clientId,
      credentials,
    });

    return {
      ok: true,
      realmStatus,
      realmUserStatus,
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
  console.log(
    `  Realm: ${options.realm} (${options.result.realmStatus ?? "unchanged"})`,
  );
  console.log(`  Client: ${options.clientId} (${options.result.clientStatus})`);
  console.log(`  Admin console: ${credentials.username} / ${credentials.password}`);
  const realmUser = resolveRealmUserCredentials();
  console.log(
    `  App login: ${realmUser.username} / ${realmUser.password} (${options.result.realmUserStatus ?? "unchanged"})`,
  );

  if (options.result.runner?.pid != null) {
    console.log(`  Keycloak PID: ${options.result.runner.pid}`);
    console.log(`  Stop Keycloak: kill ${options.result.runner.pid}`);
  } else if (options.result.runner?.reusedExisting) {
    console.log("  Reused an existing Keycloak instance on port 8080");
  }
}
