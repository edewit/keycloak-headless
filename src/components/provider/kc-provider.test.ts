import { describe, it, expect, vi, beforeEach } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";

const { mockInit } = vi.hoisted(() => ({
  mockInit: vi.fn().mockResolvedValue(false),
}));

vi.mock("keycloak-js", () => ({
  default: class MockKeycloak {
    authenticated = false;
    init = mockInit;
    onAuthSuccess?: () => void;
    onAuthRefreshSuccess?: () => void;
    onAuthLogout?: () => void;
    onAuthError?: (e?: unknown) => void;
    onAuthRefreshError?: () => void;
    onTokenExpired?: () => void;
    onActionUpdate?: () => void;
  },
}));

await import("./kc-provider.js");

describe("KcProvider", () => {
  beforeEach(() => {
    mockInit.mockClear();
  });

  it("passes declarative init options to keycloak.init", async () => {
    await fixture(html`
      <kc-provider
        url="/"
        realm="r"
        clientId="c"
        on-load="login-required"
        scope="openid profile"
        redirect-uri="https://app.example/cb"
        enable-logging="true"
        pkce-method="false"
        flow="standard"
        response-mode="fragment"
        adapter="default"
        logout-method="POST"
        locale="nl"
        message-receive-timeout="15000"
        silent-check-sso-redirect-uri="https://app.example/silent"
        silent-check-sso-fallback="false"
        check-login-iframe="false"
        check-login-iframe-interval="10"
        use-nonce="false"
      ></kc-provider>
    `);
    await vi.waitUntil(() => mockInit.mock.calls.length > 0);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        onLoad: "login-required",
        scope: "openid profile",
        redirectUri: "https://app.example/cb",
        enableLogging: true,
        pkceMethod: false,
        flow: "standard",
        responseMode: "fragment",
        adapter: "default",
        logoutMethod: "POST",
        locale: "nl",
        messageReceiveTimeout: 15000,
        silentCheckSsoRedirectUri: "https://app.example/silent",
        silentCheckSsoFallback: false,
        checkLoginIframe: false,
        checkLoginIframeInterval: 10,
        useNonce: false,
      }),
    );
  });

  it("defaults onLoad to check-sso when attributes are omitted", async () => {
    await fixture(html`
      <kc-provider
        url="/"
        realm="r"
        clientId="c"
      ></kc-provider>
    `);
    await vi.waitUntil(() => mockInit.mock.calls.length > 0);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        onLoad: "check-sso",
      }),
    );
    expect(mockInit.mock.calls[0][0]).not.toHaveProperty("enableLogging");
  });
});
