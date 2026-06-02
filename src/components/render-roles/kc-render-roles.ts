import { consume } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type Keycloak from "keycloak-js";

import { authContext, type AuthState } from "../provider/kc-context.js";

/**
 * Converts comma-separated role string from HTML attribute to array.
 * @private
 */
function rolesFromAttribute(value: string | null): string[] {
  if (value == null || value === "") {
    return [];
  }
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Normalizes role input from various sources (HTML attribute, array, or string).
 * Handles HTML attribute, array binding, or framework string property.
 * @private
 */
function normalizeRolesInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return rolesFromAttribute(value);
  }
  return [];
}

/**
 * Conditionally renders content based on user roles (role-based access control).
 *
 * This component checks if the authenticated user has specific realm or client roles
 * and only renders its children if the role requirements are met. It supports both
 * "any" (OR) and "all" (AND) matching logic for multiple roles.
 *
 * @element kc-render-roles
 *
 * @attr {string} roles - Comma-separated list of role names to check (e.g., "admin,editor")
 * @attr {string} [match="any"] - Match mode: "any" (user has at least one role) or "all" (user has all roles)
 * @attr {string} [role-kind="realm"] - Role type: "realm" (realm-level roles) or "client" (client-specific roles)
 * @attr {string} [resource] - Client ID for client roles (required when role-kind="client")
 *
 * @slot - Content to display when role requirements are met
 *
 * @example Realm role - single role
 * ```html
 * <kc-render-roles roles="admin">
 *   <button>Admin Panel</button>
 * </kc-render-roles>
 * ```
 *
 * @example Realm roles - any match (OR logic)
 * ```html
 * <kc-render-roles roles="admin,moderator" match="any">
 *   <div>Content visible to admins OR moderators</div>
 * </kc-render-roles>
 * ```
 *
 * @example Realm roles - all match (AND logic)
 * ```html
 * <kc-render-roles roles="admin,premium" match="all">
 *   <div>Content visible only to premium admins</div>
 * </kc-render-roles>
 * ```
 *
 * @example Client roles
 * ```html
 * <kc-render-roles
 *   roles="manage-users,view-users"
 *   role-kind="client"
 *   resource="my-client-id"
 *   match="any">
 *   <nav>User Management</nav>
 * </kc-render-roles>
 * ```
 *
 * @example Nested role checks
 * ```html
 * <kc-render-roles roles="admin">
 *   <div class="admin-section">
 *     <h2>Admin Tools</h2>
 *
 *     <kc-render-roles roles="super-admin">
 *       <button>Dangerous Action</button>
 *     </kc-render-roles>
 *   </div>
 * </kc-render-roles>
 * ```
 *
 * @example Role-based navigation
 * ```html
 * <nav>
 *   <a href="/">Home</a>
 *
 *   <kc-render-roles roles="user">
 *     <a href="/dashboard">Dashboard</a>
 *   </kc-render-roles>
 *
 *   <kc-render-roles roles="admin">
 *     <a href="/admin">Admin Panel</a>
 *   </kc-render-roles>
 *
 *   <kc-render-roles roles="editor,author" match="any">
 *     <a href="/content">Content Management</a>
 *   </kc-render-roles>
 * </nav>
 * ```
 *
 * @example With React (array binding)
 * ```tsx
 * <kc-render-roles roles={['admin', 'moderator']} match="any">
 *   <AdminPanel />
 * </kc-render-roles>
 * ```
 *
 * @remarks
 * - The component only renders when the user is authenticated
 * - Roles are checked against the user's JWT token
 * - For client roles, the `resource` attribute must match the client ID
 * - If no roles are specified, the component renders nothing
 * - Role names are case-sensitive and must match exactly
 */
@customElement("kc-render-roles")
export class KcRenderRoles extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  /**
   * List of role names to check. Can be:
   * - Comma-separated string: "admin,editor"
   * - Array (from framework binding): ['admin', 'editor']
   *
   * Role names are case-sensitive and must match exactly as defined in Keycloak.
   */
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

  /**
   * Match mode for multiple roles:
   * - "any" - User must have at least one of the specified roles (OR logic)
   * - "all" - User must have all specified roles (AND logic)
   *
   * @default "any"
   */
  @property({ type: String })
  match: "any" | "all" = "any";

  /**
   * Type of roles to check:
   * - "realm" - Realm-level roles (global across all clients)
   * - "client" - Client-specific roles (scoped to a particular client)
   *
   * @default "realm"
   */
  @property({ type: String, attribute: "role-kind" })
  roleKind: "realm" | "client" = "realm";

  /**
   * Client ID for client role checks. Required when role-kind="client".
   * Must match the client ID in Keycloak where the roles are defined.
   *
   * @example "my-client-id"
   */
  @property({ type: String })
  resource?: string;

  /**
   * Checks if the user has a specific role.
   *
   * @private
   * @param keycloak - Keycloak instance
   * @param role - Role name to check
   * @param kind - Type of role (realm or client)
   * @returns True if user has the role
   */
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

  /**
   * Checks if the user's roles match the requirements based on match mode.
   *
   * @private
   * @param keycloak - Keycloak instance
   * @param names - Array of role names to check
   * @param matchMode - "any" for OR logic, "all" for AND logic
   * @param kind - Type of roles (realm or client)
   * @returns True if role requirements are met
   */
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

  /**
   * Renders the slot content only when user is authenticated and has required roles.
   * Returns empty template when not authenticated, no roles specified, or role check fails.
   */
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
