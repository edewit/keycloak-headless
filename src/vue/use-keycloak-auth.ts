import type { Ref } from "vue";
import { shallowRef, watchEffect } from "vue";

import type { AuthState } from "../components/provider/kc-context.js";
import { subscribeAuthContext } from "../subscribe-auth-context.js";

/**
 * Reactive `AuthState` for a DOM node under `<kc-provider>`.
 * Pass a template ref to the element that wraps your app (same pattern as `AuthBridge` in React).
 */
export function useKeycloakAuth(hostRef: Ref<Element | null>) {
  const auth = shallowRef<AuthState>({});
  watchEffect((onCleanup) => {
    const el = hostRef.value;
    if (!el) {
      auth.value = {};
      return;
    }
    const unsub = subscribeAuthContext(el, (next) => {
      auth.value = next;
    });
    onCleanup(() => {
      unsub();
      auth.value = {};
    });
  });
  return auth;
}
