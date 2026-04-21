import { describe, it, expect, vi } from "vitest";

import { subscribeAuthContext } from "./subscribe-auth-context.js";

describe("subscribeAuthContext", () => {
  it("returns a disposer that invokes the provider unsubscribe", () => {
    const providerUnsub = vi.fn();
    const el = document.createElement("div");
    el.dispatchEvent = vi.fn((ev: Event) => {
      const req = ev as CustomEvent & {
        callback?: (value: unknown, unsub?: () => void) => void;
      };
      if (typeof req.callback === "function") {
        req.callback({}, providerUnsub);
      }
      return true;
    }) as typeof el.dispatchEvent;

    const listener = vi.fn();
    const dispose = subscribeAuthContext(el, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    dispose();
    expect(providerUnsub).toHaveBeenCalledTimes(1);
  });
});
