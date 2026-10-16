import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { verifyDatabaseConnection } from "../config/db.js";

export const HealthController = {
  getHealth(_req: Request, res: Response) {
    res.json({
      success: true,
      data: {
        status: "ok",
        service: "jocta-enterprises-api",
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  },

  async getDatabaseHealth(_req: Request, res: Response) {
    const dbStatus = await verifyDatabaseConnection();
    const statusCode = dbStatus.connected ? 200 : 503;

    res.status(statusCode).json({
      success: dbStatus.connected,
      data: {
        status: dbStatus.connected ? "ok" : "unavailable",
        database: dbStatus.database ?? null,
        ...(env.NODE_ENV !== "production" && dbStatus.error
          ? { reason: dbStatus.error }
          : {}),
        timestamp: new Date().toISOString(),
      },
    });
  },
};
