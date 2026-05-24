export function createHealthHandlers({ healthCheck, getExternalServices = () => ({}) }) {
  const startedAt = Date.now();

  function uptimeSeconds() {
    return Math.floor((Date.now() - startedAt) / 1000);
  }

  function basePayload() {
    return {
      service: "stepup-api",
      timestamp: new Date().toISOString(),
      uptimeSeconds: uptimeSeconds()
    };
  }

  return {
    live(_request, response) {
      response.status(200).json({
        status: "ok",
        ...basePayload(),
        check: "live"
      });
    },

    async ready(_request, response) {
      if (!healthCheck) {
        response.status(200).json({
          status: "ok",
          ...basePayload(),
          check: "ready",
          database: "not_configured"
        });
        return;
      }

      try {
        await healthCheck();
        response.status(200).json({
          status: "ok",
          ...basePayload(),
          check: "ready",
          database: "connected"
        });
      } catch {
        response.status(503).json({
          status: "degraded",
          ...basePayload(),
          check: "ready",
          database: "disconnected"
        });
      }
    },

    async health(_request, response) {
      const external = getExternalServices();
      let database = "not_configured";
      let overallStatus = "ok";
      let httpStatus = 200;

      if (healthCheck) {
        try {
          await healthCheck();
          database = "connected";
        } catch {
          database = "disconnected";
          overallStatus = "degraded";
          httpStatus = 503;
        }
      }

      response.status(httpStatus).json({
        status: overallStatus,
        ...basePayload(),
        check: "health",
        checks: {
          database,
          ...external
        }
      });
    }
  };
}
