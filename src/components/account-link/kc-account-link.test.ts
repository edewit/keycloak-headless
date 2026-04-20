import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fixture } from "@open-wc/testing";
import { html, LitElement } from "lit";
import { provide } from "@lit/context";
import { customElement, state } from "lit/decorators.js";

import { authContext, type AuthState } from "../provider/kc-context.js";
import "./kc-account-link.js";

@customElement("test-kc-account-host")
class TestKcAccountHost extends LitElement {
  @provide({ context: authContext })
  @state()
  authData: AuthState = {};

  render() {
    return html`<slot></slot>`;
  }
}

describe("KcAccountLink", () => {
  const assignSpy = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    assignSpy.mockClear();
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
    const kc = {
      createAccountUrl: () => "https://kc.example/realms/foo/account",
    };
    const host = await fixture<TestKcAccountHost>(html`
      <test-kc-account-host .authData=${{ keycloak: kc, authenticated: true }}>
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
    const kc = { createAccountUrl: () => "https://kc.example/account" };
    const host = await fixture<TestKcAccountHost>(html`
      <test-kc-account-host .authData=${{ keycloak: kc, authenticated: false }}>
        <kc-account-link>
          <span id="acct">Account</span>
        </kc-account-link>
      </test-kc-account-host>
    `);
    const inner = host.querySelector("kc-account-link")!;
    await inner.updateComplete;
    expect(inner.shadowRoot?.querySelector("slot")).toBeFalsy();
  });

  it("calls createAccountUrl on click (and assigns location)", async () => {
    const createAccountUrl = vi.fn(() => "https://kc.example/account?x=1");
    const kc = { createAccountUrl };
    const host = await fixture<TestKcAccountHost>(html`
      <test-kc-account-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-account-link>
          <button type="button" id="btn">Open</button>
        </kc-account-link>
      </test-kc-account-host>
    `);
    const inner = host.querySelector("kc-account-link")!;
    await inner.updateComplete;
    host.querySelector("#btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(createAccountUrl).toHaveBeenCalledWith(undefined);
    expect(assignSpy).toHaveBeenCalledWith("https://kc.example/account?x=1");
  });

  it("passes redirectUri to createAccountUrl when set", async () => {
    const createAccountUrl = vi.fn(() => "https://kc.example/account");
    const kc = { createAccountUrl };
    const host = await fixture<TestKcAccountHost>(html`
      <test-kc-account-host .authData=${{ keycloak: kc, authenticated: true }}>
        <kc-account-link redirect-uri="https://app.example/return">
          <span id="lnk">Account</span>
        </kc-account-link>
      </test-kc-account-host>
    `);
    const inner = host.querySelector("kc-account-link")!;
    await inner.updateComplete;
    host.querySelector("#lnk")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(createAccountUrl).toHaveBeenCalledWith({
      redirectUri: "https://app.example/return",
    });
    expect(assignSpy).toHaveBeenCalledWith("https://kc.example/account");
  });
});
