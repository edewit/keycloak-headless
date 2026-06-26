import { describe, it, expect, vi } from "vitest";
import { fixture } from "@open-wc/testing";
import { html, LitElement } from "lit";
import { provide } from "@lit/context";
import { customElement, state } from "lit/decorators.js";

import { authContext, type AuthState } from "../provider/kc-context.js";
import "./kc-render-roles.js";

@customElement("test-kc-roles-host")
class TestKcRolesHost extends LitElement {
  @provide({ context: authContext })
  @state()
  authData: AuthState = {};

  render() {
    return html`<slot></slot>`;
  }
}

function mockOidc(realmRoles: string[], clientRoles: Record<string, string[]> = {}) {
  return {
    isUserLoggedIn: true as const,
    issuerUri: "http://localhost:8080/realms/master",
    clientId: "example-spa",
    validRedirectUri: "http://localhost:5173/",
    getDecodedIdToken: () => ({
      realm_access: { roles: realmRoles },
      resource_access: Object.fromEntries(
        Object.entries(clientRoles).map(([clientId, roles]) => [
          clientId,
          { roles },
        ]),
      ),
    }),
    logout: vi.fn(),
    getTokens: vi.fn(),
    renewTokens: vi.fn(),
    subscribeToTokensChange: vi.fn(),
    subscribeToAutoLogoutCountdown: vi.fn(),
    isNewBrowserSession: false,
    backFromAuthServer: undefined,
  };
}

describe("KcRenderRoles", () => {
  it("does not render slot when not authenticated", async () => {
    const oidc = { ...mockOidc(["admin"]), isUserLoggedIn: false as const, login: vi.fn() };
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ oidc, authenticated: false }}>
        <kc-render-roles .roles=${["admin"]}>
          <span id="role-only">Admin</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("does not render slot when oidc is missing", async () => {
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ oidc: undefined, authenticated: true }}>
        <kc-render-roles .roles=${["admin"]}>
          <span id="role-only">Admin</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("does not render slot when roles list is empty", async () => {
    const oidc = mockOidc(["admin"]);
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ oidc, authenticated: true }}>
        <kc-render-roles .roles=${[]}>
          <span id="role-only">X</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("renders slot for match any when user has one of the roles", async () => {
    const oidc = mockOidc(["b"]);
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ oidc, authenticated: true }}>
        <kc-render-roles .roles=${["a", "b"]} match="any">
          <span id="role-only">Any</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
  });

  it("does not render slot for match all when user lacks a role", async () => {
    const oidc = mockOidc(["a"]);
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ oidc, authenticated: true }}>
        <kc-render-roles .roles=${["a", "b"]} match="all">
          <span id="role-only">All</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("renders slot for match all when user has every role", async () => {
    const oidc = mockOidc(["a", "b"]);
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ oidc, authenticated: true }}>
        <kc-render-roles .roles=${["a", "b"]} match="all">
          <span id="role-only">All</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
  });

  it("checks client roles when role-kind is client", async () => {
    const oidc = mockOidc([], { "my-client": ["manage-users"] });
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ oidc, authenticated: true }}>
        <kc-render-roles
          .roles=${["manage-users"]}
          role-kind="client"
          resource="my-client"
        >
          <span id="role-only">Client</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
  });
});
