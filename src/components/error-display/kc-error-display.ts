import { html, LitElement, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { KeycloakError } from "../../errors/keycloak-errors.js";

/**
 * Displays Keycloak errors with user-friendly messages and recovery options.
 * 
 * @element kc-error-display
 * 
 * @attr {KeycloakError} error - The error to display
 * @attr {boolean} show-details - Whether to show technical details by default
 * @attr {boolean} show-retry - Whether to show the retry button
 * 
 * @fires {CustomEvent} retry - Fired when the user clicks the retry button
 * 
 * @example
 * ```html
 * <kc-error-display .error=${error} show-retry></kc-error-display>
 * ```
 */
@customElement("kc-error-display")
export class KcErrorDisplay extends LitElement {
  /**
   * The error to display
   */
  @property({ attribute: false })
  error?: KeycloakError;

  /**
   * Whether to show technical details by default
   */
  @property({ type: Boolean, attribute: "show-details" })
  showDetailsDefault: boolean = false;

  /**
   * Whether to show the retry button
   */
  @property({ type: Boolean, attribute: "show-retry" })
  showRetry: boolean = true;

  @state()
  private detailsVisible: boolean = false;

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      border-radius: 0.5rem;
      background: #fee;
      border: 1px solid #fcc;
      color: #c33;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .error-title {
      font-weight: bold;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .error-icon {
      font-size: 1.5rem;
    }

    .error-message {
      margin-bottom: 0.75rem;
      line-height: 1.5;
    }

    .error-action {
      margin-bottom: 1rem;
      padding: 0.5rem;
      background: #fdd;
      border-radius: 0.25rem;
      font-size: 0.9rem;
    }

    .error-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    .retry-button {
      background: #c33;
      color: white;
    }

    .retry-button:hover {
      background: #a22;
    }

    .retry-button:active {
      background: #811;
    }

    .details-button {
      background: #eee;
      color: #333;
    }

    .details-button:hover {
      background: #ddd;
    }

    .details-button:active {
      background: #ccc;
    }

    .error-details {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #fdd;
      border-radius: 0.25rem;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      overflow-x: auto;
      line-height: 1.6;
    }

    .error-details div {
      margin-bottom: 0.25rem;
    }

    .error-details div:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      font-weight: bold;
      color: #a22;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.detailsVisible = this.showDetailsDefault;
  }

  private handleRetry = () => {
    this.dispatchEvent(new CustomEvent('retry', {
      bubbles: true,
      composed: true,
    }));
  };

  private toggleDetails = () => {
    this.detailsVisible = !this.detailsVisible;
  };

  render() {
    if (!this.error) return html``;

    return html`
      <div class="error-title">
        <span class="error-icon">⚠️</span>
        <span>${this.error.name}</span>
      </div>
      <div class="error-message">
        ${this.error.userMessage}
      </div>
      ${this.error.suggestedAction ? html`
        <div class="error-action">
          💡 ${this.error.suggestedAction}
        </div>
      ` : ''}
      <div class="error-actions">
        ${this.showRetry && this.error.recoverable ? html`
          <button class="retry-button" @click=${this.handleRetry}>
            🔄 Try Again
          </button>
        ` : ''}
        <button class="details-button" @click=${this.toggleDetails}>
          ${this.detailsVisible ? '▼ Hide' : '▶ Show'} Details
        </button>
      </div>
      ${this.detailsVisible ? html`
        <div class="error-details">
          <div><span class="detail-label">Code:</span> ${this.error.code}</div>
          <div><span class="detail-label">Message:</span> ${this.error.message}</div>
          <div><span class="detail-label">Recoverable:</span> ${this.error.recoverable ? 'Yes' : 'No'}</div>
          ${this.error.cause ? html`
            <div><span class="detail-label">Cause:</span> ${String(this.error.cause)}</div>
          ` : ''}
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kc-error-display": KcErrorDisplay;
  }
}

// Made with Bob
