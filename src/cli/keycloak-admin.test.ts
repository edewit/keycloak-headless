import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockSetConfig = vi.fn();
const mockRealmsFindOne = vi.fn();
const mockRealmsCreate = vi.fn();
const mockRolesFindOneByName = vi.fn();
const mockRolesCreate = vi.fn();
const mockUsersFind = vi.fn();
const mockUsersCreate = vi.fn();
const mockUsersResetPassword = vi.fn();
const mockUsersAddRealmRoleMappings = vi.fn();
const mockClientsFind = vi.fn();
const mockClientsCreate = vi.fn();
const mockClientsUpdate = vi.fn();

vi.mock("@keycloak/keycloak-admin-client", () => ({
  default: vi.fn().mockImplementation(() => ({
    auth: mockAuth,
    setConfig: mockSetConfig,
    realms: {
      findOne: mockRealmsFindOne,
      create: mockRealmsCreate,
    },
    roles: {
      findOneByName: mockRolesFindOneByName,
      create: mockRolesCreate,
    },
    users: {
      find: mockUsersFind,
      create: mockUsersCreate,
      resetPassword: mockUsersResetPassword,
      addRealmRoleMappings: mockUsersAddRealmRoleMappings,
    },
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
    mockSetConfig.mockReset();
    mockRealmsFindOne.mockReset();
    mockRealmsCreate.mockReset();
    mockRolesFindOneByName.mockReset();
    mockRolesCreate.mockReset();
    mockUsersFind.mockReset();
    mockUsersCreate.mockReset();
    mockUsersResetPassword.mockReset();
    mockUsersAddRealmRoleMappings.mockReset();
    mockClientsFind.mockReset();
    mockClientsCreate.mockReset();
    mockClientsUpdate.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("waitForKeycloak resolves when the target realm endpoint responds", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const { waitForKeycloak } = await import("./keycloak-admin.js");
    await expect(
      waitForKeycloak("http://localhost:8080/", "master", 5_000),
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/realms/master",
      { method: "GET" },
    );
  });

  it("isKeycloakReady reuses an existing server when only master is available", async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).endsWith("/realms/master")) {
        return { ok: true } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const { isKeycloakReady } = await import("./keycloak-admin.js");
    await expect(
      isKeycloakReady("http://localhost:8080/", "my-realm"),
    ).resolves.toBe(true);
  });

  it("isKeycloakServerUp probes localhost and 127.0.0.1 in parallel", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url) => {
      if (String(url) === "http://127.0.0.1:8080/realms/master") {
        return { ok: true } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const { isKeycloakServerUp } = await import("./keycloak-admin.js");
    await expect(isKeycloakServerUp("http://localhost:8080/")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/realms/master",
      { method: "GET" },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/realms/master",
      { method: "GET" },
    );
  });

  it("ensureRealm creates a missing realm via the admin API", async () => {
    const fetchMock = vi.mocked(fetch);
    let realmCreated = false;
    fetchMock.mockImplementation(async (url) => {
      if (String(url).includes("/realms/my-realm")) {
        return { ok: realmCreated, status: realmCreated ? 200 : 404 } as Response;
      }
      return { ok: true } as Response;
    });
    mockRealmsFindOne.mockResolvedValue(null);
    mockRealmsCreate.mockImplementation(async () => {
      realmCreated = true;
    });

    const { ensureRealm } = await import("./keycloak-admin.js");
    await expect(
      ensureRealm({
        baseUrl: "http://localhost:8080",
        realm: "my-realm",
        credentials: { username: "admin", password: "admin" },
      }),
    ).resolves.toBe("created");

    expect(mockRealmsCreate).toHaveBeenCalledWith({
      realm: "my-realm",
      enabled: true,
    });
  });

  it("ensureRealm returns unchanged when the realm endpoint already responds", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const { ensureRealm } = await import("./keycloak-admin.js");
    await expect(
      ensureRealm({
        baseUrl: "http://localhost:8080",
        realm: "my-realm",
        credentials: { username: "admin", password: "admin" },
      }),
    ).resolves.toBe("unchanged");

    expect(mockRealmsCreate).not.toHaveBeenCalled();
  });

  it("ensureRealmUser creates a demo user with password and admin role", async () => {
    mockUsersFind.mockResolvedValue([]);
    mockUsersCreate.mockResolvedValue({ id: "user-1" });
    mockRolesCreate.mockResolvedValue({ roleName: "admin" });
    mockRolesFindOneByName
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "role-1", name: "admin" });

    const { ensureRealmUser } = await import("./keycloak-admin.js");
    await expect(
      ensureRealmUser({
        baseUrl: "http://localhost:8080",
        realm: "my-realm",
        credentials: { username: "admin", password: "admin" },
        user: { username: "user", password: "user" },
      }),
    ).resolves.toBe("created");

    expect(mockUsersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "user",
        enabled: true,
      }),
    );
    expect(mockUsersResetPassword).toHaveBeenCalledWith({
      id: "user-1",
      credential: {
        type: "password",
        value: "user",
        temporary: false,
      },
    });
    expect(mockUsersAddRealmRoleMappings).toHaveBeenCalledWith({
      id: "user-1",
      roles: [{ id: "role-1", name: "admin" }],
    });
  });

  it("ensureRealmUser returns unchanged when the user already exists", async () => {
    mockUsersFind.mockResolvedValue([{ id: "user-1", username: "user" }]);

    const { ensureRealmUser } = await import("./keycloak-admin.js");
    await expect(
      ensureRealmUser({
        baseUrl: "http://localhost:8080",
        realm: "my-realm",
        credentials: { username: "admin", password: "admin" },
        user: { username: "user", password: "user" },
      }),
    ).resolves.toBe("unchanged");

    expect(mockUsersCreate).not.toHaveBeenCalled();
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

    expect(mockSetConfig).not.toHaveBeenCalled();

    expect(mockClientsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "example-spa",
        publicClient: true,
        redirectUris: ["http://localhost:5173/*"],
        webOrigins: ["http://localhost:5173"],
      }),
    );
  });

  it("ensureSpaClient authenticates against master for custom realms", async () => {
    mockClientsFind.mockResolvedValue([]);

    const { ensureSpaClient } = await import("./keycloak-admin.js");
    await ensureSpaClient({
      baseUrl: "http://localhost:8080",
      realm: "my-realm",
      clientId: "example-spa",
      credentials: { username: "admin", password: "admin" },
    });

    expect(mockSetConfig).toHaveBeenCalledWith({ realmName: "my-realm" });
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
