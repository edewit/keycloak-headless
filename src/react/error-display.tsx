import { useState } from "react";
import { KeycloakError } from "../errors/keycloak-errors.js";

export interface ErrorDisplayProps {
  /**
   * The error to display
   */
  error: KeycloakError;
  /**
   * Callback function called when the user clicks retry
   */
  onRetry?: () => void;
  /**
   * Whether to show technical details by default
   */
  showDetails?: boolean;
  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * React component for displaying Keycloak errors with user-friendly messages.
 * 
 * @example
 * ```tsx
 * <ErrorDisplay 
 *   error={error} 
 *   onRetry={() => provider.retry()} 
 * />
 * ```
 */
export function ErrorDisplay({ 
  error, 
  onRetry, 
  showDetails = false,
  className = "",
}: ErrorDisplayProps) {
  const [detailsVisible, setDetailsVisible] = useState(showDetails);

  return (
    <div 
      className={`kc-error-display ${className}`}
      style={{
        padding: '1rem',
        borderRadius: '0.5rem',
        background: '#fee',
        border: '1px solid #fcc',
        color: '#c33',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{
        fontWeight: 'bold',
        fontSize: '1.1rem',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        <span>{error.name}</span>
      </div>
      
      <div style={{
        marginBottom: '0.75rem',
        lineHeight: '1.5',
      }}>
        {error.userMessage}
      </div>
      
      {error.suggestedAction && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.5rem',
          background: '#fdd',
          borderRadius: '0.25rem',
          fontSize: '0.9rem',
        }}>
          💡 {error.suggestedAction}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}>
        {error.recoverable && onRetry && (
          <button 
            onClick={onRetry}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              background: '#c33',
              color: 'white',
            }}
          >
            🔄 Try Again
          </button>
        )}
        <button 
          onClick={() => setDetailsVisible(!detailsVisible)}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            background: '#eee',
            color: '#333',
          }}
        >
          {detailsVisible ? '▼ Hide' : '▶ Show'} Details
        </button>
      </div>
      
      {detailsVisible && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#fdd',
          borderRadius: '0.25rem',
          fontFamily: "'Courier New', monospace",
          fontSize: '0.75rem',
          overflowX: 'auto',
          lineHeight: '1.6',
        }}>
          <div><strong style={{ color: '#a22' }}>Code:</strong> {error.code}</div>
          <div><strong style={{ color: '#a22' }}>Message:</strong> {error.message}</div>
          <div><strong style={{ color: '#a22' }}>Recoverable:</strong> {error.recoverable ? 'Yes' : 'No'}</div>
          {error.cause && (
            <div><strong style={{ color: '#a22' }}>Cause:</strong> {error.cause instanceof Error ? error.cause.message : String(error.cause)}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Made with Bob
