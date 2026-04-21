import { ContextEvent } from "@lit/context";

import { authContext, type AuthState } from "./components/provider/kc-context.js";

/**
 * Dispatches a Lit context request on `element` so `listener` receives the
 * current auth state and subsequent updates while `kc-provider` is mounted.
 * Use from React/Vue (or any non-Lit host) with a ref to an element inside the provider.
 *
 * @returns Call to stop receiving updates (invokes the provider’s unsubscribe when present).
 */
export function subscribeAuthContext(
  element: Element,
  listener: (value: AuthState) => void,
): () => void {
  let unsubscribe: (() => void) | undefined;
  element.dispatchEvent(
    new ContextEvent(
      authContext,
      element,
      (value, unsub) => {
        if (unsub) {
          unsubscribe = unsub;
        }
        listener({ ...value });
      },
      true,
    ),
  );
  return () => {
    unsubscribe?.();
  };
}
