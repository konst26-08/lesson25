import crypto from "node:crypto";

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export function createOAuthStateStore({ ttlMs = DEFAULT_TTL_MS } = {}) {
  const pending = new Map();

  function purgeExpired(now = Date.now()) {
    for (const [state, expiresAt] of pending.entries()) {
      if (expiresAt <= now) {
        pending.delete(state);
      }
    }
  }

  return {
    create() {
      purgeExpired();
      const state = crypto.randomBytes(24).toString("hex");
      pending.set(state, Date.now() + ttlMs);
      return state;
    },

    consume(state) {
      purgeExpired();
      if (!state || typeof state !== "string") {
        return false;
      }
      const expiresAt = pending.get(state);
      if (!expiresAt || expiresAt <= Date.now()) {
        pending.delete(state);
        return false;
      }
      pending.delete(state);
      return true;
    }
  };
}
