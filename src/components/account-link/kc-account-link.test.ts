import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fixture } from "@open-wc/testing";
import { html, LitElement } from "lit";
import { provide } from "@lit/context";
import { customElement, state } from "lit/decorators.js";

import { authContext, type AuthState } from "../provider/kc-context.js";

const { mockGetAccountUrl } = vi.hoisted(() => ({
  mockGetAccountUrl: vi.fn(() => "https://kc.example/realms/foo/account"),
}));

vi.mock("oidc-spa/keycloak", () => ({
  createKeycloakUtils: vi.fn(() => ({
    getAccountUrl: mockGetAccountUrl,
  })),
}));

await import("./kc-account-link.js");

@customElement("test-kc-account-host")
class TestKcAccountHost extends LitElement {
  @provide({ context: authContext })
  @state()
  authData: AuthState = {};

  render() {
    return html`<slot></slot>`;
  }
}

const loggedInOidc = {
  isUserLoggedIn: true as const,
  issuerUri: "https://kc.example/realms/foo",
  clientId: "example-spa",
  validRedirectUri: "http://localhost:5173/",
};

describe("KcAccountLink", () => {
  const assignSpy = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    assignSpy.mockClear();
    mockGetAccountUrl.mockClear();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        assign: assignSpy,
        replace: vi.fn(),
        reload: vi.fn(),
      } as Location,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("renders slot when authenticated", async () => {
    const host = await fixture<TestKcAccountHost>(html`
      <test-kc-account-host .authData=${{ oidc: loggedInOidc, authenticated: true }}>
        <kc-account-link>
          <span id="acct">Account</span>
        </kc-account-link>
      </test-kc-account-host>
    `);
    const inner = host.querySelector("kc-account-link")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
    expect(host.querySelector("#acct")).toBeTruthy();
  });

  it("does not render slot when not authenticated", async () => {
    const host = await fixture<TestKcAccountHost>(html`
      <test-kc-account-host
        .authData=${{
          oidc: { ...loggedInOidc, isUserLoggedIn: false as const, login: vi.fn() },
          authenticated: false,
        }}
      >
        <kc-account-link>
          <span id="acct">Account</span>
        </kc-account-link>
      </test-kc-account-host>
    `);
    const inner = host.querySelector("kc-account-link")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("opens the Keycloak account URL on click", async () => {
    const host = await fixture<TestKcAccountHost>(html`
      <test-kc-account-host .authData=${{ oidc: loggedInOidc, authenticated: true }}>
        <kc-account-link>
          <button type="button" id="btn">Open</button>
        </kc-account-link>
      </test-kc-account-host>
    `);
    const inner = host.querySelector("kc-account-link")!;
    await inner.updateComplete;
    host.querySelector("#btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(mockGetAccountUrl).toHaveBeenCalledWith({
      clientId: "example-spa",
      validRedirectUri: "http://localhost:5173/",
    });
    expect(assignSpy).toHaveBeenCalledWith("https://kc.example/realms/foo/account");
  });
});
