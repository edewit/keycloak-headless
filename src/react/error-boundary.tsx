import { Component, type ReactNode, type ErrorInfo } from "react";
import { KeycloakError, wrapError, ErrorCodes } from "../errors/keycloak-errors.js";
import { ErrorDisplay } from "./error-display.js";

export interface ErrorBoundaryProps {
  /**
   * Content to render when no error has occurred
   */
  children: ReactNode;
  /**
   * Optional fallback UI to render instead of the default error display
   */
  fallback?: (error: KeycloakError, reset: () => void) => ReactNode;
  /**
   * Callback function called when an error is caught
   */
  onError?: (error: KeycloakError, errorInfo: ErrorInfo) => void;
  /**
   * Callback function called when the error boundary is reset
   */
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  error: KeycloakError | null;
}

/**
 * React Error Boundary component for catching and displaying Keycloak errors.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary onError={(error) => console.error(error)}>
 *   <YourApp />
 * </ErrorBoundary>
 * ```
 * 
 * @example With custom fallback
 * ```tsx
 * <ErrorBoundary 
 *   fallback={(error, reset) => (
 *     <div>
 *       <h1>Something went wrong</h1>
 *       <p>{error.userMessage}</p>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}
 * >
 *   <YourApp />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Wrap the error in a KeycloakError if it isn't already
    const wrappedError = error instanceof KeycloakError 
      ? error 
      : wrapError(error, ErrorCodes.AUTH_FAILED);
    
    return { error: wrappedError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const wrappedError = error instanceof KeycloakError 
      ? error 
      : wrapError(error, ErrorCodes.AUTH_FAILED);
    
    // Call the onError callback if provided
    this.props.onError?.(wrappedError, errorInfo);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.reset);
      }

      // Default error display
      return (
        <ErrorDisplay 
          error={error} 
          onRetry={error.recoverable ? this.reset : undefined}
        />
      );
    }

    return children;
  }
}


