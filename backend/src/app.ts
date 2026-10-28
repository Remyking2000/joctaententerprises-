import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, "");
        const isAllowed = env.CORS_ORIGINS.includes(cleanOrigin);
        callback(null, isAllowed);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  app.use("/api", (_req, res, next) => {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  app.use("/api/health", healthRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", catalogRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
