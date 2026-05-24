import { describe, expect, it, vi } from "vitest";
import { createHealthHandlers } from "./healthHandlers.js";

function createMockResponse() {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return response;
}

describe("healthHandlers", () => {
  it("live returns ok without database check", () => {
    const handlers = createHealthHandlers({});
    const response = createMockResponse();

    handlers.live({}, response);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.check).toBe("live");
    expect(response.body.service).toBe("stepup-api");
  });

  it("ready returns 503 when database check fails", async () => {
    const handlers = createHealthHandlers({
      healthCheck: vi.fn().mockRejectedValue(new Error("db down"))
    });
    const response = createMockResponse();

    await handlers.ready({}, response);

    expect(response.statusCode).toBe(503);
    expect(response.body.status).toBe("degraded");
    expect(response.body.database).toBe("disconnected");
  });

  it("health includes external service checks", async () => {
    const handlers = createHealthHandlers({
      healthCheck: vi.fn().mockResolvedValue(undefined),
      getExternalServices: () => ({ oauth: "configured" })
    });
    const response = createMockResponse();

    await handlers.health({}, response);

    expect(response.statusCode).toBe(200);
    expect(response.body.checks.database).toBe("connected");
    expect(response.body.checks.oauth).toBe("configured");
  });

  it("health returns degraded when database is unavailable", async () => {
    const handlers = createHealthHandlers({
      healthCheck: vi.fn().mockRejectedValue(new Error("timeout"))
    });
    const response = createMockResponse();

    await handlers.health({}, response);

    expect(response.statusCode).toBe(503);
    expect(response.body.status).toBe("degraded");
    expect(response.body.checks.database).toBe("disconnected");
  });
});
