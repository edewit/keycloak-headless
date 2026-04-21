import { createEffect, createSignal, onCleanup } from "solid-js";

import type { AuthState } from "../components/provider/kc-context.js";
import { subscribeAuthContext } from "../subscribe-auth-context.js";

/**
 * Reactive `AuthState` accessor for a DOM node under `<kc-provider>`.
 * Pass an accessor that returns the host element (for example a ref).
 */
export function useKeycloakAuth(
  host: () => Element | null | undefined,
): () => AuthState {
  const [auth, setAuth] = createSignal<AuthState>({});
  createEffect(() => {
    const el = host();
    if (!el) {
      setAuth({});
      return;
    }
    const unsub = subscribeAuthContext(el, (v) => setAuth(v));
    onCleanup(() => {
      unsub();
      setAuth({});
    });
  });
  return auth;
}
