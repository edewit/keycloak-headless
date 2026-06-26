import { describe, it, expect, vi, beforeEach } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";

const { mockCreateOidc } = vi.hoisted(() => ({
  mockCreateOidc: vi.fn().mockResolvedValue({
    isUserLoggedIn: false,
    issuerUri: "http://localhost:8080/realms/r",
    clientId: "c",
    validRedirectUri: "http://localhost:5173/",
    initializationError: undefined,
    login: vi.fn(),
  }),
}));

vi.mock("oidc-spa/core", () => ({
  createOidc: mockCreateOidc,
}));

await import("./kc-provider.js");

describe("KcProvider", () => {
  beforeEach(() => {
    mockCreateOidc.mockClear();
  });

  it("passes declarative init options to createOidc", async () => {
    await fixture(html`
      <kc-provider
        url="http://localhost:8080/"
        realm="r"
        client-id="c"
        on-load="login-required"
        scope="profile email"
        enable-logging="true"
        base-url="/app/"
      ></kc-provider>
    `);
    await vi.waitUntil(() => mockCreateOidc.mock.calls.length > 0);
    expect(mockCreateOidc).toHaveBeenCalledWith(
      expect.objectContaining({
        issuerUri: "http://localhost:8080/realms/r",
        clientId: "c",
        autoLogin: true,
        scopes: ["profile", "email"],
        debugLogs: true,
        BASE_URL: "/app/",
      }),
    );
  });

  it("defaults onLoad to check-sso when attributes are omitted", async () => {
    await fixture(html`
      <kc-provider
        url="http://localhost:8080/"
        realm="r"
        client-id="c"
      ></kc-provider>
    `);
    await vi.waitUntil(() => mockCreateOidc.mock.calls.length > 0);
    expect(mockCreateOidc).toHaveBeenCalledWith(
      expect.objectContaining({
        autoLogin: false,
      }),
    );
    expect(mockCreateOidc.mock.calls[0][0]).not.toHaveProperty("debugLogs");
  });
});
