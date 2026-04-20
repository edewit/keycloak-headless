import { consume } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type Keycloak from "keycloak-js";

import { authContext, type AuthState } from "../provider/kc-context.js";

function rolesFromAttribute(value: string | null): string[] {
  if (value == null || value === "") {
    return [];
  }
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Handles HTML attribute, array binding, or framework string property. */
function normalizeRolesInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return rolesFromAttribute(value);
  }
  return [];
}

@customElement("kc-render-roles")
export class KcRenderRoles extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  @property({
    converter: {
      fromAttribute: rolesFromAttribute,
      toAttribute(value: unknown) {
        const list = normalizeRolesInput(value);
        return list.length > 0 ? list.join(",") : null;
      },
    },
  })
  roles: string[] = [];

  @property({ type: String })
  match: "any" | "all" = "any";

  @property({ type: String, attribute: "role-kind" })
  roleKind: "realm" | "client" = "realm";

  @property({ type: String })
  resource?: string;

  private hasRole(
    keycloak: Keycloak,
    role: string,
    kind: "realm" | "client",
  ): boolean {
    if (kind === "client") {
      const res =
        this.resource != null && this.resource !== ""
          ? this.resource
          : undefined;
      return keycloak.hasResourceRole(role, res);
    }
    return keycloak.hasRealmRole(role);
  }

  private rolesMatch(
    keycloak: Keycloak,
    names: string[],
    matchMode: "any" | "all",
    kind: "realm" | "client",
  ): boolean {
    if (matchMode === "all") {
      return names.every((r) => this.hasRole(keycloak, r, kind));
    }
    return names.some((r) => this.hasRole(keycloak, r, kind));
  }

  render() {
    const kc = this.auth.keycloak;
    if (kc == null || this.auth.authenticated !== true) {
      return html``;
    }
    const names = normalizeRolesInput(this.roles as unknown);
    if (names.length === 0) {
      return html``;
    }
    const matchMode = this.match === "all" ? "all" : "any";
    const kind = this.roleKind === "client" ? "client" : "realm";
    if (!this.rolesMatch(kc, names, matchMode, kind)) {
      return html``;
    }
    return html`<slot></slot>`;
  }
}
