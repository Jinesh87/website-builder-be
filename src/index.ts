import http from "node:http";
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./config/prisma.js";
import { connectRedis, redis } from "./config/redis.js";
import { seedDesignLibrary } from "./seeder/seed-design-library.js";
import { seedSuperAdmin } from "./seeder/seed-super-admin.js";
import { ensureAiUsageTable } from "./modules/admin-ai-usage/services/ai-usage.service.js";
import { domainChecker } from "./modules/domains/services/domain-checker.js";
import { generationWorker } from "./modules/websites/services/website-generation.service.js";

async function bootstrap() {
  await prisma.$connect();
  logger.info("Database connected");
  await ensureAiUsageTable();
  await connectRedis();
  await seedSuperAdmin();
  await seedDesignLibrary();

  const server = http.createServer(app);
  server.listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT }, "API listening");
  });
  generationWorker.start();
  domainChecker.start();
  if (env.NODE_ENV === "production" && env.SITE_SERVER_IPS.length === 0 && !env.SITE_CNAME_TARGET) {
    logger.warn("SITE_SERVER_IPS is not set: custom domains are verified by TXT record only and customers get no A record to add");
  }

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutting down");
    generationWorker.stop();
    domainChecker.stop();
    server.close(() => {
      void Promise.allSettled([prisma.$disconnect(), redis.quit()]).finally(() => process.exit(0));
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
});
