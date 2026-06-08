import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClientsFind = vi.fn();
const mockClientsCreate = vi.fn();
const mockClientsUpdate = vi.fn();

vi.mock("@keycloak/keycloak-admin-client", () => ({
  default: vi.fn().mockImplementation(() => ({
    auth: mockAuth,
    clients: {
      find: mockClientsFind,
      create: mockClientsCreate,
      update: mockClientsUpdate,
    },
  })),
}));

describe("keycloak-admin", () => {
  beforeEach(() => {
    vi.resetModules();
    mockAuth.mockReset();
    mockClientsFind.mockReset();
    mockClientsCreate.mockReset();
    mockClientsUpdate.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("waitForKeycloak resolves when health endpoint responds", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const { waitForKeycloak } = await import("./keycloak-admin.js");
    await expect(
      waitForKeycloak("http://localhost:8080/", "master", 5_000),
    ).resolves.toBeUndefined();
  });

  it("ensureSpaClient creates a client when missing", async () => {
    mockClientsFind.mockResolvedValue([]);

    const { ensureSpaClient } = await import("./keycloak-admin.js");
    await expect(
      ensureSpaClient({
        baseUrl: "http://localhost:8080",
        realm: "master",
        clientId: "example-spa",
        credentials: { username: "admin", password: "admin" },
      }),
    ).resolves.toBe("created");

    expect(mockClientsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "example-spa",
        publicClient: true,
        redirectUris: ["http://localhost:5173/*"],
        webOrigins: ["http://localhost:5173"],
      }),
    );
  });

  it("ensureSpaClient updates redirect URIs when misconfigured", async () => {
    mockClientsFind.mockResolvedValue([
      {
        id: "client-1",
        clientId: "example-spa",
        enabled: true,
        publicClient: true,
        standardFlowEnabled: true,
        redirectUris: ["http://localhost:3000/*"],
        webOrigins: ["http://localhost:3000"],
      },
    ]);

    const { ensureSpaClient } = await import("./keycloak-admin.js");
    await expect(
      ensureSpaClient({
        baseUrl: "http://localhost:8080",
        realm: "master",
        clientId: "example-spa",
        credentials: { username: "admin", password: "admin" },
      }),
    ).resolves.toBe("updated");

    expect(mockClientsUpdate).toHaveBeenCalled();
  });

  it("ensureSpaClient returns unchanged when already correct", async () => {
    mockClientsFind.mockResolvedValue([
      {
        id: "client-1",
        clientId: "example-spa",
        enabled: true,
        publicClient: true,
        standardFlowEnabled: true,
        redirectUris: ["http://localhost:5173/*"],
        webOrigins: ["http://localhost:5173"],
      },
    ]);

    const { ensureSpaClient } = await import("./keycloak-admin.js");
    await expect(
      ensureSpaClient({
        baseUrl: "http://localhost:8080",
        realm: "master",
        clientId: "example-spa",
        credentials: { username: "admin", password: "admin" },
      }),
    ).resolves.toBe("unchanged");

    expect(mockClientsUpdate).not.toHaveBeenCalled();
    expect(mockClientsCreate).not.toHaveBeenCalled();
  });
});
