import { consume } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Oidc } from "oidc-spa/core";

import {
  getClientRoles,
  getRealmRoles,
} from "../../oidc/extract-roles.js";
import { authContext, type AuthState } from "../provider/kc-context.js";

function rolesFromAttribute(value: string | null): string[] {
  if (value == null || value === "") {
    return [];
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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

  private getDecodedIdToken(oidc: Oidc.LoggedIn): Record<string, unknown> {
    return oidc.getDecodedIdToken();
  }

  private hasRole(
    decodedIdToken: Record<string, unknown>,
    role: string,
    kind: "realm" | "client",
  ): boolean {
    if (kind === "client") {
      const clientId =
        this.resource != null && this.resource !== ""
          ? this.resource
          : undefined;
      if (clientId == null) {
        return false;
      }
      return getClientRoles(decodedIdToken, clientId).includes(role);
    }
    return getRealmRoles(decodedIdToken).includes(role);
  }

  private rolesMatch(
    decodedIdToken: Record<string, unknown>,
    names: string[],
    matchMode: "any" | "all",
    kind: "realm" | "client",
  ): boolean {
    if (matchMode === "all") {
      return names.every((r) => this.hasRole(decodedIdToken, r, kind));
    }
    return names.some((r) => this.hasRole(decodedIdToken, r, kind));
  }

  render() {
    const oidc = this.auth.oidc;
    if (oidc == null || oidc.isUserLoggedIn !== true) {
      return html``;
    }
    const names = normalizeRolesInput(this.roles as unknown);
    if (names.length === 0) {
      return html``;
    }
    const matchMode = this.match === "all" ? "all" : "any";
    const kind = this.roleKind === "client" ? "client" : "realm";
    const decodedIdToken = this.getDecodedIdToken(oidc);
    if (!this.rolesMatch(decodedIdToken, names, matchMode, kind)) {
      return html``;
    }
    return html`<slot></slot>`;
  }
}
