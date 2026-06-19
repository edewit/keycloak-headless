import { beforeEach, describe, expect, it, vi } from "vitest";

const installProjectDependencies = vi.fn();
const startKeycloakRunner = vi.fn();
const ensureRealm = vi.fn();
const ensureRealmUser = vi.fn();
const ensureSpaClient = vi.fn();

vi.mock("./start-keycloak-runner.js", () => ({
  installProjectDependencies,
  startKeycloakRunner,
}));

vi.mock("./keycloak-admin.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./keycloak-admin.js")>();
  return {
    ...actual,
    ensureRealm,
    ensureRealmUser,
    ensureSpaClient,
    resolveAdminCredentials: () => ({
      username: "admin",
      password: "admin",
    }),
  };
});

describe("bootstrapKeycloak", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("installs deps, starts Keycloak, and ensures the SPA client", async () => {
    installProjectDependencies.mockReturnValue({ ok: true, command: "pnpm install" });
    startKeycloakRunner.mockResolvedValue({
      started: true,
      reusedExisting: false,
      pid: 12345,
      baseUrl: "http://127.0.0.1:8080",
    });
    ensureRealm.mockResolvedValue("created");
    ensureRealmUser.mockResolvedValue("created");
    ensureSpaClient.mockResolvedValue("created");

    const { bootstrapKeycloak } = await import("./bootstrap-keycloak.js");
    const result = await bootstrapKeycloak({
      projectDir: "/tmp/example",
      keycloakUrl: "http://localhost:8080/",
      realm: "master",
      clientId: "example-spa",
    });

    expect(installProjectDependencies).toHaveBeenCalledWith("/tmp/example");
    expect(startKeycloakRunner).toHaveBeenCalled();
    expect(ensureRealm).toHaveBeenCalledWith(
      expect.objectContaining({
        realm: "master",
      }),
    );
    expect(ensureRealmUser).toHaveBeenCalledWith(
      expect.objectContaining({
        realm: "master",
        user: { username: "user", password: "user" },
      }),
    );
    expect(ensureSpaClient).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "example-spa",
        realm: "master",
      }),
    );
    expect(result).toEqual({
      ok: true,
      realmStatus: "created",
      realmUserStatus: "created",
      clientStatus: "created",
      runner: {
        started: true,
        reusedExisting: false,
        pid: 12345,
        baseUrl: "http://127.0.0.1:8080",
      },
    });
  });

  it("returns a warning when dependency install fails", async () => {
    installProjectDependencies.mockReturnValue({
      ok: false,
      command: "pnpm install",
      message: "pnpm install failed",
    });

    const { bootstrapKeycloak } = await import("./bootstrap-keycloak.js");
    const result = await bootstrapKeycloak({
      projectDir: "/tmp/example",
      keycloakUrl: "http://localhost:8080/",
      realm: "master",
      clientId: "example-spa",
    });

    expect(result.ok).toBe(false);
    expect(result.warning).toContain("pnpm install failed");
    expect(startKeycloakRunner).not.toHaveBeenCalled();
  });
});
