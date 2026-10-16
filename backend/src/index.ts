import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(
    `[jocta-api] Running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`,
  );
  console.log(`[jocta-api] Health endpoint: http://localhost:${env.PORT}/api/health`);
});

function shutdown(signal: string) {
  console.log(`\n[jocta-api] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
