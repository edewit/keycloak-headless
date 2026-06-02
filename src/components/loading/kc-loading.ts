import { html, LitElement, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import { authContext, type AuthState } from "../provider/kc-context.js";

/**
 * Displays a loading indicator when authentication is in progress.
 * Automatically shows/hides based on the auth context loading state.
 * 
 * @element kc-loading
 * 
 * @attr {string} message - Default message to display when loading
 * 
 * @example
 * ```html
 * <kc-loading message="Authenticating..."></kc-loading>
 * ```
 */
@customElement("kc-loading")
export class KcLoading extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  /**
   * Default message to display when loading
   */
  @property({ type: String })
  message: string = "Loading...";

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      font-family: system-ui, -apple-system, sans-serif;
    }

    :host([hidden]) {
      display: none;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .message {
      margin-top: 1rem;
      color: #666;
      font-size: 0.9rem;
    }

    .attempt-info {
      margin-top: 0.5rem;
      color: #999;
      font-size: 0.8rem;
    }
  `;

  render() {
    if (!this.auth.loading) return html``;

    return html`
      <div class="spinner"></div>
      <div class="message">
        ${this.auth.loadingMessage || this.message}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kc-loading": KcLoading;
  }
}

// Made with Bob
