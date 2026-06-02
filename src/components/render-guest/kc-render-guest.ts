import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit/context";

import { authContext, type AuthState } from "../provider/kc-context.js";

/**
 * Conditionally renders content only when the user is NOT authenticated (guest).
 *
 * This component acts as a guard that shows its children only when the user is
 * not logged in. It's useful for displaying login prompts, welcome messages,
 * or public content that should be hidden once authenticated.
 *
 * @element kc-render-guest
 *
 * @slot - Content to display when not authenticated
 *
 * @example Basic usage
 * ```html
 * <kc-render-guest>
 *   <p>Please log in to access your account.</p>
 *   <kc-login-button>
 *     <button>Login</button>
 *   </kc-login-button>
 * </kc-render-guest>
 * ```
 *
 * @example Welcome message for guests
 * ```html
 * <kc-render-guest>
 *   <div class="welcome-banner">
 *     <h1>Welcome to Our App</h1>
 *     <p>Sign in to get started</p>
 *     <kc-login-button>
 *       <button class="btn-primary">Get Started</button>
 *     </kc-login-button>
 *   </div>
 * </kc-render-guest>
 * ```
 *
 * @example Public navigation
 * ```html
 * <kc-render-guest>
 *   <nav>
 *     <a href="/">Home</a>
 *     <a href="/about">About</a>
 *     <a href="/pricing">Pricing</a>
 *     <kc-login-button><button>Sign In</button></kc-login-button>
 *   </nav>
 * </kc-render-guest>
 * ```
 *
 * @example Mutually exclusive with authenticated view
 * ```html
 * <header>
 *   <kc-render-guest>
 *     <kc-login-button><button>Login</button></kc-login-button>
 *   </kc-render-guest>
 *
 *   <kc-render-authenticated>
 *     <kc-logout-button><button>Logout</button></kc-logout-button>
 *   </kc-render-authenticated>
 * </header>
 * ```
 *
 * @remarks
 * The component subscribes to the auth context provided by `<kc-provider>`.
 * Content is rendered when Keycloak is initialized AND the user is not authenticated.
 * During initialization (before Keycloak is ready), the component renders nothing
 * to avoid flashing guest content before auth state is determined.
 */
@customElement("kc-render-guest")
export class KcRenderGuest extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  /**
   * Renders the slot content only when Keycloak is initialized and user is not authenticated.
   * Returns empty template when authenticated or Keycloak is not yet initialized.
   */
  render() {
    if (this.auth.keycloak != null && this.auth.authenticated !== true) {
      return html`<slot></slot>`;
    }
    return html``;
  }
}
