import { describe, it, expect } from "vitest";
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

function mockKeycloak(realm: Record<string, boolean>, resource?: Record<string, boolean>) {
  return {
    hasRealmRole(role: string) {
      return realm[role] === true;
    },
    hasResourceRole(role: string, res?: string) {
      const key = res === undefined ? `_:${role}` : `${res}:${role}`;
      return resource?.[key] === true;
    },
  };
}

describe("KcRenderRoles", () => {
  it("does not render slot when not authenticated", async () => {
    const kc = mockKeycloak({ admin: true });
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: false }}>
        <kc-render-roles .roles=${["admin"]}>
          <span id="role-only">Admin</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("does not render slot when keycloak is missing", async () => {
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: undefined, authenticated: true }}>
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
    const kc = mockKeycloak({ admin: true });
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: true }}>
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
    const kc = mockKeycloak({ a: false, b: true });
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-render-roles .roles=${["a", "b"]} match="any">
          <span id="role-only">Any</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
    expect(host.querySelector("#role-only")).toBeTruthy();
  });

  it("does not render slot for match any when user has none of the roles", async () => {
    const kc = mockKeycloak({ a: false, b: false });
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-render-roles .roles=${["a", "b"]} match="any">
          <span id="role-only">Any</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("renders slot for match all when user has every role", async () => {
    const kc = mockKeycloak({ a: true, b: true });
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-render-roles .roles=${["a", "b"]} match="all">
          <span id="role-only">All</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
    expect(host.querySelector("#role-only")).toBeTruthy();
  });

  it("does not render slot for match all when user is missing a role", async () => {
    const kc = mockKeycloak({ a: true, b: false });
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-render-roles .roles=${["a", "b"]} match="all">
          <span id="role-only">All</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("uses hasResourceRole when role-kind is client", async () => {
    const kc = mockKeycloak(
      {},
      { "_:r1": true, "my-api:r1": false },
    );
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-render-roles
          .roles=${["r1"]}
          role-kind="client"
        >
          <span id="role-only">Client default</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
  });

  it("passes resource to hasResourceRole when set", async () => {
    const kc = mockKeycloak(
      {},
      { "my-api:r2": true, "_:r2": false },
    );
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-render-roles
          .roles=${["r2"]}
          role-kind="client"
          resource="my-api"
        >
          <span id="role-only">Scoped</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
  });

  it("parses roles from comma-separated attribute", async () => {
    const kc = mockKeycloak({ x: true, y: false });
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-render-roles roles="x, y" match="any">
          <span id="attr-roles">Attr</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
    expect(host.querySelector("#attr-roles")).toBeTruthy();
  });

  it("accepts roles as a string property binding (comma-separated)", async () => {
    const kc = mockKeycloak({ admin: true, mod: false });
    const host = await fixture<TestKcRolesHost>(html`
      <test-kc-roles-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-render-roles .roles=${"admin,mod"} match="any">
          <span id="prop-string-roles">OK</span>
        </kc-render-roles>
      </test-kc-roles-host>
    `);
    const inner = host.querySelector("kc-render-roles")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
    expect(host.querySelector("#prop-string-roles")).toBeTruthy();
  });
});
