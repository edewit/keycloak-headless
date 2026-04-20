import { describe, it, expect } from "vitest";
import { fixture } from "@open-wc/testing";
import { html, LitElement } from "lit";
import { provide } from "@lit/context";
import { customElement, state } from "lit/decorators.js";

import { authContext, type AuthState } from "./kc-context.js";
import "../render-authenticated/kc-render-authenticated.js";
import "../render-guest/kc-render-guest.js";

@customElement("test-kc-auth-host")
class TestKcAuthHost extends LitElement {
  @provide({ context: authContext })
  @state()
  authData: AuthState = {};

  render() {
    return html`<slot></slot>`;
  }
}

describe("KcRenderAuthenticated", () => {
  it("renders slotted children when authenticated is true", async () => {
    const host = await fixture<TestKcAuthHost>(html`
      <test-kc-auth-host .authData=${{ keycloak: {}, authenticated: true }}>
        <kc-render-authenticated>
          <span id="auth-only">Members area</span>
        </kc-render-authenticated>
      </test-kc-auth-host>
    `);
    const inner = host.querySelector("kc-render-authenticated")!;
    await inner.updateComplete;

    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
    expect(host.querySelector("#auth-only")).toBeTruthy();
  });

  it("does not render slot when authenticated is not true", async () => {
    const host = await fixture<TestKcAuthHost>(html`
      <test-kc-auth-host .authData=${{ keycloak: {}, authenticated: false }}>
        <kc-render-authenticated>
          <span id="auth-only">Members area</span>
        </kc-render-authenticated>
      </test-kc-auth-host>
    `);
    const inner = host.querySelector("kc-render-authenticated")!;
    await inner.updateComplete;

    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });
});

describe("KcRenderGuest", () => {
  it("renders slotted children when keycloak exists and user is not authenticated", async () => {
    const host = await fixture<TestKcAuthHost>(html`
      <test-kc-auth-host .authData=${{ keycloak: {}, authenticated: false }}>
        <kc-render-guest>
          <span id="guest-only">Get started</span>
        </kc-render-guest>
      </test-kc-auth-host>
    `);
    const inner = host.querySelector("kc-render-guest")!;
    await inner.updateComplete;

    expect(inner.shadowRoot?.querySelector("slot")).toBeTruthy();
    expect(host.querySelector("#guest-only")).toBeTruthy();
  });

  it("does not render slot when authenticated is true", async () => {
    const host = await fixture<TestKcAuthHost>(html`
      <test-kc-auth-host .authData=${{ keycloak: {}, authenticated: true }}>
        <kc-render-guest>
          <span id="guest-only">Get started</span>
        </kc-render-guest>
      </test-kc-auth-host>
    `);
    const inner = host.querySelector("kc-render-guest")!;
    await inner.updateComplete;

    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("does not render slot when keycloak is missing", async () => {
    const host = await fixture<TestKcAuthHost>(html`
      <test-kc-auth-host .authData=${{ keycloak: undefined, authenticated: false }}>
        <kc-render-guest>
          <span id="guest-only">Get started</span>
        </kc-render-guest>
      </test-kc-auth-host>
    `);
    const inner = host.querySelector("kc-render-guest")!;
    await inner.updateComplete;

    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });
});
